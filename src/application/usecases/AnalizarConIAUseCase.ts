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
import { DomainError } from '../../exception/errors';
import { formatearPesos } from './helpers/formatearPesos';

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
    const contexto = this.contextoHogar(analisis, numeroMiembros);

    const huella = this.fingerprint(analisis.ciclos, analisis, listaIngresos, numeroMiembros);
    const cache = await this.analisisIA.buscar(input.hogarId, huella);
    if (cache !== null) {
      const resultado = this.parsearCache(cache);
      return {
        ciclos: analisis.ciclos,
        progreso,
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

    const resumen = this.resumenParaPrompt(analisis, listaIngresos, ingresoMensualCents, progreso, contexto);
    const resp = await this.ia.analizar(resumen);
    const resultado = this.limpiarResultado(resp.resultado, listaIngresos, ingresoMensualCents);

    await this.analisisIA.guardar(input.hogarId, huella, JSON.stringify(resultado));
    await this.uso.registrarUso(mesActual(), resp.tokensIn, resp.tokensOut);

    return {
      ciclos: analisis.ciclos,
      progreso,
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
    numeroMiembros: number,
  ): string {
    return JSON.stringify({
      version: 3,
      ciclos: [...ciclos].sort(),
      totalCents: analisis.resumen.totalCents,
      cantidad: analisis.resumen.cantidad,
      categorias: analisis.categorias.map((c) => [c.categoria, c.totalCents]),
      gustos: analisis.gustos[0]?.totalCents ?? 0,
      ingresos: ingresos.map((i) => [i.id, i.montoCents, i.periodicidad]),
      numeroMiembros,
    });
  }

  private contextoHogar(
    analisis: Analisis,
    numeroMiembros: number,
  ): { numeroMiembros: number; hayEducacion: boolean; mercadoCents: number } {
    const educacion = analisis.categorias.find((c) => c.categoria === 'educacion');
    const mercado = analisis.categorias.find((c) => c.categoria === 'mercado');
    return {
      numeroMiembros,
      hayEducacion: (educacion?.totalCents ?? 0) > 0,
      mercadoCents: mercado?.totalCents ?? 0,
    };
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

  private parsearCache(cache: string): ResultadoAnalisisIA {
    try {
      const json = JSON.parse(cache) as ResultadoAnalisisIA;
      return {
        estado: json.estado ?? '',
        sugerencias: json.sugerencias ?? [],
        recomendacion: json.recomendacion ?? '',
      };
    } catch {
      return { estado: '', sugerencias: [], recomendacion: '' };
    }
  }

  /** Descarta sugerencias disparatadas (mayores al ingreso o negativas). */
  private limpiarResultado(
    resultado: ResultadoAnalisisIA,
    _ingresos: Ingreso[],
    ingresoMensualCents: number,
  ): ResultadoAnalisisIA {
    const tope = ingresoMensualCents > 0 ? ingresoMensualCents : Number.POSITIVE_INFINITY;
    const sugerencias: SugerenciaIA[] = resultado.sugerencias
      .filter((s) => s.montoCents > 0 && s.montoCents <= tope)
      .slice(0, 5);

    return {
      estado: resultado.estado,
      sugerencias,
      recomendacion: resultado.recomendacion,
    };
  }

  private resumenParaPrompt(
    analisis: Analisis,
    ingresos: Ingreso[],
    ingresoMensualCents: number,
    progreso: ProgresoCicloIA,
    contexto: { numeroMiembros: number; hayEducacion: boolean; mercadoCents: number },
  ): string {
    const lineas: string[] = [];

    lineas.push(`El hogar tiene ${contexto.numeroMiembros} integrantes.`);
    if (contexto.hayEducacion) {
      lineas.push('Hay gastos de educación (colegio/universidad), lo que sugiere niños o jóvenes en el hogar.');
    }
    if (contexto.mercadoCents > 0) {
      lineas.push(`Gastaron ${formatearPesos(contexto.mercadoCents)} en mercado (alimentos).`);
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
