import type { Analisis } from '../../domain/entities/Analisis';
import type { AnalisisIA } from '../../domain/entities/AnalisisIA';
import type { Ingreso } from '../../domain/entities/Ingreso';
import type { AnalizarConIAPort } from '../../domain/ports/in/AnalizarConIAPort';
import type { ConsultarAnalisisPort } from '../../domain/ports/in/ConsultarAnalisisPort';
import type { AIClasificacionRepositorioPort } from '../../domain/ports/out/AIClasificacionRepositorioPort';
import type { AnalisisIARepositorioPort } from '../../domain/ports/out/AnalisisIARepositorioPort';
import type { IngresoRepositorioPort } from '../../domain/ports/out/IngresoRepositorioPort';
import type { DeepSeekAdapter } from '../../infrastructure/ai/DeepSeekAdapter';
import { hayPresupuesto, mesActual } from '../../domain/rules/PresupuestoIA';
import { DomainError } from '../../exception/errors';
import { formatearPesos } from './helpers/formatearPesos';

export class AnalizarConIAUseCase implements AnalizarConIAPort {
  constructor(
    private readonly consultarAnalisis: ConsultarAnalisisPort,
    private readonly ingresos: IngresoRepositorioPort,
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

    const huella = this.fingerprint(analisis.ciclos, analisis, listaIngresos);
    const cache = await this.analisisIA.buscar(input.hogarId, huella);
    if (cache !== null) {
      return {
        texto: cache,
        ciclos: analisis.ciclos,
        generadoEl: new Date().toISOString(),
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

    const resumen = this.resumenParaPrompt(analisis, listaIngresos);
    const resp = await this.ia.analizar(resumen);

    await this.analisisIA.guardar(input.hogarId, huella, resp.texto);
    await this.uso.registrarUso(mesActual(), resp.tokensIn, resp.tokensOut);

    return {
      texto: resp.texto,
      ciclos: analisis.ciclos,
      generadoEl: new Date().toISOString(),
      cacheado: false,
    };
  }

  private fingerprint(ciclos: string[], analisis: Analisis, ingresos: Ingreso[]): string {
    return JSON.stringify({
      ciclos: [...ciclos].sort(),
      totalCents: analisis.resumen.totalCents,
      cantidad: analisis.resumen.cantidad,
      categorias: analisis.categorias.map((c) => [c.categoria, c.totalCents]),
      gustos: analisis.gustos[0]?.totalCents ?? 0,
      ingresos: ingresos.map((i) => [i.id, i.montoCents, i.periodicidad]),
    });
  }

  private resumenParaPrompt(analisis: Analisis, ingresos: Ingreso[]): string {
    const lineas: string[] = [];

    lineas.push(`Ciclos analizados: ${analisis.ciclos.join(', ')}`);
    lineas.push(`Total gastado: ${formatearPesos(analisis.resumen.totalCents)}`);
    lineas.push(
      `${analisis.resumen.cantidad} gastos en ${analisis.resumen.diasConRegistro} días`,
    );

    lineas.push('');
    lineas.push('Categorías:');
    for (const c of analisis.categorias) {
      lineas.push(`- ${c.nombre}: ${formatearPesos(c.totalCents)} (${c.cantidad} gastos)`);
    }

    const gusto = analisis.gustos[0];
    if (gusto) {
      lineas.push('');
      lineas.push(
        `Gusticos (pizza, mecato, postres, gaseosa, etc.): ${formatearPesos(gusto.totalCents)} en ${gusto.cantidad} gastos`,
      );
    }

    if (analisis.sinClasificar.length > 0) {
      lineas.push(`Sin clasificar: ${analisis.sinClasificar.length} tipos de gasto`);
    }

    lineas.push('');
    if (ingresos.length === 0) {
      lineas.push('Ingresos: no se registraron ingresos todavía.');
    } else {
      lineas.push('Ingresos:');
      for (const i of ingresos) {
        const etiqueta = i.nombre ?? 'Ingreso';
        const frecuencia = i.periodicidad === 'QUINCENAL' ? 'quincenal' : 'mensual';
        lineas.push(`- ${etiqueta}: ${formatearPesos(i.montoCents)} ${frecuencia}`);
      }
    }

    return lineas.join('\n');
  }
}
