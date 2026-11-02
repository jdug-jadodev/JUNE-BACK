import type { ResumenCiclo } from '../entities/ResumenCiclo';
import { CorteInvalidoError } from '../../exception/errors';

export interface RangoCiclo {
  inicio: string;
  fin: string;
}

function ultimoDia(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function corteEfectivo(year: number, month: number, corte: number): number {
  return Math.min(corte, ultimoDia(year, month));
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function mesAnterior(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

function mesSiguiente(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

export const CicloReglas = {
  validarCorte(dia: number): void {
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
      throw new CorteInvalidoError();
    }
  },

  corteEfectivo,

  /**
   * Devuelve el ciclo mensual que contiene una fecha.
   * Ejemplo con corte 29: 2026-10-31 y 2026-11-02 pertenecen a 2026-10-29..2026-11-28.
   */
  cicloDe(fecha: string, corte: number): RangoCiclo {
    const [year, month, day] = fecha.split('-').map(Number);
    const corteEsteMes = corteEfectivo(year, month, corte);

    let inicioYear: number;
    let inicioMonth: number;
    let inicioDay: number;

    if (day >= corteEsteMes) {
      inicioYear = year;
      inicioMonth = month;
      inicioDay = corteEsteMes;
    } else {
      const anterior = mesAnterior(year, month);
      inicioYear = anterior.year;
      inicioMonth = anterior.month;
      inicioDay = corteEfectivo(anterior.year, anterior.month, corte);
    }

    const siguiente = mesSiguiente(inicioYear, inicioMonth);
    const fin = new Date(
      Date.UTC(siguiente.year, siguiente.month - 1, corteEfectivo(siguiente.year, siguiente.month, corte)),
    );
    fin.setUTCDate(fin.getUTCDate() - 1);

    return {
      inicio: iso(inicioYear, inicioMonth, inicioDay),
      fin: iso(fin.getUTCFullYear(), fin.getUTCMonth() + 1, fin.getUTCDate()),
    };
  },

  agrupar(
    gastos: Array<{ fecha: string; montoCents: number }>,
    corte: number,
  ): ResumenCiclo[] {
    const acumulado = new Map<string, ResumenCiclo>();

    for (const gasto of gastos) {
      const rango = this.cicloDe(gasto.fecha, corte);
      const actual = acumulado.get(rango.inicio) ?? {
        inicio: rango.inicio,
        fin: rango.fin,
        cantidad: 0,
        totalCents: 0,
      };
      actual.cantidad += 1;
      actual.totalCents += gasto.montoCents;
      acumulado.set(rango.inicio, actual);
    }

    return [...acumulado.values()].sort((a, b) => b.inicio.localeCompare(a.inicio));
  },
};
