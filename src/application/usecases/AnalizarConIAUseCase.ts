import type { Analisis } from '../../domain/entities/Analisis';
import type { AnalisisIA, ProgresoCicloIA, SugerenciaIA } from '../../domain/entities/AnalisisIA';
import type { Ingreso } from '../../domain/entities/Ingreso';
import type { AnalizarConIAPort } from '../../domain/ports/in/AnalizarConIAPort';
import type { ConsultarAnalisisPort } from '../../domain/ports/in/ConsultarAnalisisPort';
import type { AIClasificacionRepositorioPort } from '../../domain/ports/out/AIClasificacionRepositorioPort';
import type { AnalisisIARepositorioPort } from '../../domain/ports/out/AnalisisIARepositorioPort';
import type { IngresoRepositorioPort } from '../../domain/ports/out/IngresoRepositorioPort';
import type { MiembroRepositorioPort } from '../../domain/ports/out/MiembroRepositorioPort';
import type { DeepSeekAdapter, ResultadoAnalisisIA } from '../../infrastructure/ai/DeepSeekAdapter';
import { hayPresupuesto, mesActual } from '../../domain/rules/PresupuestoIA';
import {
  coincidirReferencia,
  inferirPerfilHogar,
  notaPorDefecto,
  type PerfilHogar,
} from '../../domain/rules/PresupuestoHogar';
import { DomainError } from '../../exception/errors';
import { formatearPesos } from './helpers/formatearPesos';

interface ResultadoGuardado {
  estado: string;
  sugerencias: SugerenciaIA[];
  recomendacion: string;
}

export class AnalizarConIAUseCase implements AnalizarConIAPort {
  constructor(
    private readonly consultarAnalisis: ConsultarAnalisisPort,
    private readonly ingresos: IngresoRepositorioPort,
    private readonly miembros: MiembroRepositorioPort,
    private readonly analisisIA: AnalisisIARepositorioPort,
    private readonly uso: AIClasificacionRepositorioPort,
    private readonly ia: DeepSeekAdapter | null,
    private readonly presupuestoUSD: number = 5,
  ) {}

  async analizar(input: {
    hogarId: string;
    usuarioId: string;
    ciclos?: string[];
    personas?: number;
  }): Promise<AnalisisIA> {
    const analisis = await this.consultarAnalisis.ejecutar({
      hogarId: input.hogarId,
      usuarioId: input.usuarioId,
      ciclos: input.ciclos,
    });

    const listaIngresos = await this.ingresos.listar(input.hogarId);
    const numeroMiembros = (await this.miembros.listar(input.hogarId)).length;
    const ingresoMensualCents = this.ingresoMensual(listaIngresos);
    const progreso = this.progreso(analisis, ingresoMensualCents);
    const perfil = inferirPerfilHogar(
      analisis,
      ingresoMensualCents,
      numeroMiembros,
      input.personas,
    );

    const huella = this.fingerprint(analisis.ciclos, analisis, listaIngresos, perfil);
    const cache = await this.analisisIA.buscar(input.hogarId, huella);
    if (cache !== null) {
      const resultado = this.parsearCache(cache);
      return {
        ciclos: analisis.ciclos,
        progreso,
        personasEstimadas: perfil.personasEstimadas,
        estado: resultado.estado,
        sugerencias: resultado.sugerencias,
        recomendacion: resultado.recomendacion,
        cacheado: true,
      };
    }

    if (!this.ia) {
      throw new DomainError('IA_NO_DISPONIBLE', 'El análisis con IA no está disponible', 503);
    }

    const usoMes = await this.uso.usoDelMes(mesActual());
    if (!hayPresupuesto(usoMes, this.presupuestoUSD)) {
      throw new DomainError(
        'IA_SIN_PRESUPUESTO',
        'Se agotó el presupuesto de IA de este mes. Vuelve a intentarlo el próximo mes.',
        429,
      );
    }

    const resumen = this.resumenParaPrompt(analisis, listaIngresos, ingresoMensualCents, progreso, perfil);
    const resp = await this.ia.analizar(resumen);
    const resultado = this.completarResultado(resp.resultado, perfil);

    await this.analisisIA.guardar(input.hogarId, huella, JSON.stringify(resultado));
    await this.uso.registrarUso(mesActual(), resp.tokensIn, resp.tokensOut);

    return {
      ciclos: analisis.ciclos,
      progreso,
      personasEstimadas: perfil.personasEstimadas,
      estado: resultado.estado,
      sugerencias: resultado.sugerencias,
      recomendacion: resultado.recomendacion,
      cacheado: false,
    };
  }

  private fingerprint(
    ciclos: string[],
    analisis: Analisis,
    ingresos: Ingreso[],
    perfil: PerfilHogar,
  ): string {
    return JSON.stringify({
      version: 5,
      ciclos: [...ciclos].sort(),
      totalCents: analisis.resumen.totalCents,
      cantidad: analisis.resumen.cantidad,
      categorias: analisis.categorias.map((c) => [c.categoria, c.totalCents]),
      gustos: analisis.gustos[0]?.totalCents ?? 0,
      ingresos: ingresos.map((i) => [i.id, i.montoCents, i.periodicidad]),
      perfil: {
        personas: perfil.personasEstimadas,
        ninos: perfil.hayNinos,
        adolescentes: perfil.hayAdolescentes,
        bebe: perfil.hayBebe,
        mascotas: perfil.hayMascotas,
        cargaFijaPct: perfil.cargaFijaPct,
        referencias: perfil.referencias.map((r) => [r.categoria, r.montoCents, r.periodicidad]),
      },
    });
  }

  private ingresoMensual(ingresos: Ingreso[]): number {
    return ingresos.reduce((total, i) => {
      return total + (i.periodicidad === 'QUINCENAL' ? i.montoCents * 2 : i.montoCents);
    }, 0);
  }

  private progreso(analisis: Analisis, ingresoMensualCents: number): ProgresoCicloIA {
    const p = analisis.proyeccion;
    const diasRestantes = Math.max(0, p.diasTotales - p.diasTranscurridos);
    const porcentajeIngreso =
      ingresoMensualCents > 0
        ? Math.round((analisis.resumen.totalCents / ingresoMensualCents) * 100)
        : 0;

    return {
      diasTranscurridos: p.diasTranscurridos,
      diasTotales: p.diasTotales,
      diasRestantes,
      totalCents: analisis.resumen.totalCents,
      ingresoMensualCents,
      porcentajeIngreso,
    };
  }

  private parsearCache(cache: string): ResultadoGuardado {
    try {
      const json = JSON.parse(cache) as Partial<ResultadoGuardado>;
      return {
        estado: json.estado ?? '',
        sugerencias: Array.isArray(json.sugerencias)
          ? json.sugerencias.filter(
              (s): s is SugerenciaIA =>
                typeof s?.categoria === 'string' && typeof s?.montoCents === 'number',
            )
          : [],
        recomendacion: json.recomendacion ?? '',
      };
    } catch {
      return { estado: '', sugerencias: [], recomendacion: '' };
    }
  }

  /**
   * Los montos los define el backend a partir del perfil del hogar. La IA solo
   * aporta las notas; así nunca sugiere cantidades irreales para la familia.
   */
  private completarResultado(
    resultado: ResultadoAnalisisIA,
    perfil: PerfilHogar,
  ): ResultadoGuardado {
    const notas = new Map<string, string>();

    for (const sugerencia of resultado.sugerencias) {
      const referencia = coincidirReferencia(sugerencia.categoria, perfil.referencias);
      if (referencia !== null && !notas.has(referencia.categoria) && sugerencia.nota.trim() !== '') {
        notas.set(referencia.categoria, sugerencia.nota.trim());
      }
    }

    return {
      estado: resultado.estado,
      sugerencias: perfil.referencias.map((referencia) => ({
        ...referencia,
        nota: notas.get(referencia.categoria) ?? notaPorDefecto(referencia.categoria, referencia.periodicidad),
      })),
      recomendacion: resultado.recomendacion,
    };
  }

  private resumenParaPrompt(
    analisis: Analisis,
    ingresos: Ingreso[],
    ingresoMensualCents: number,
    progreso: ProgresoCicloIA,
    perfil: PerfilHogar,
  ): string {
    const lineas: string[] = [];

    lineas.push('Perfil estimado del hogar (deducido de los datos, no preguntado):');
    lineas.push(
      perfil.personasAjustadas
        ? `- Personas en casa (ajustado por la persona): ${perfil.personasEstimadas}.`
        : `- Personas estimadas: ${perfil.personasEstimadas} (${perfil.miembrosRegistrados} con cuenta en la app).`,
    );
    if (perfil.hayNinos) lineas.push('- Hay niños en el hogar (colegio, útiles o gastos infantiles).');
    if (perfil.hayAdolescentes) lineas.push('- Hay adolescentes o jóvenes (universidad, mesada).');
    if (perfil.hayBebe) lineas.push('- Hay un bebé (pañales, fórmula o jardín).');
    if (perfil.hayMascotas) lineas.push('- Hay mascotas.');
    lineas.push(
      `- Carga fija: ${perfil.cargaFijaPct}% del ingreso (costo de vida ${perfil.nivelCostoVida.toLowerCase()}).`,
    );
    if (perfil.mercadoMensualCents > 0) {
      lineas.push(
        `- Mercado estimado al mes: ${formatearPesos(perfil.mercadoMensualCents)} ` +
          `(${formatearPesos(perfil.mercadoPorPersonaCents)} por persona).`,
      );
    }
    lineas.push(
      `- Dinero razonable para gustos, ocio, restaurantes y ropa: ${formatearPesos(perfil.discrecionalMensualCents)} al mes.`,
    );

    lineas.push('');
    lineas.push('Montos sugeridos (ya calculados para todo el hogar; NO los cambies):');
    for (const r of perfil.referencias) {
      const periodo = r.periodicidad === 'MENSUAL' ? 'al mes' : 'a la semana';
      lineas.push(`- ${r.categoria}: ${formatearPesos(r.montoCents)} ${periodo}`);
    }

    lineas.push('');
    lineas.push(`Ingreso mensual del hogar: ${formatearPesos(ingresoMensualCents)}`);
    lineas.push(`Total gastado en el ciclo: ${formatearPesos(analisis.resumen.totalCents)}`);
    lineas.push(
      `Día ${progreso.diasTranscurridos} de ${progreso.diasTotales}; faltan ${progreso.diasRestantes} días.`,
    );

    lineas.push('');
    lineas.push('Gasto actual por categoría:');
    for (const c of analisis.categorias) {
      lineas.push(`- ${c.nombre}: ${formatearPesos(c.totalCents)}`);
    }

    if (ingresos.length === 0) {
      lineas.push('');
      lineas.push('No hay ingresos registrados todavía.');
    }

    return lineas.join('\n');
  }
}
