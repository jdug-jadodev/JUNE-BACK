import { describe, expect, it } from 'vitest';
import { CicloReglas } from '../../src/domain/rules/CicloReglas';

describe('CicloReglas', () => {
  it('con corte 1 equivale al mes calendario', () => {
    expect(CicloReglas.cicloDe('2026-10-01', 1)).toEqual({
      inicio: '2026-10-01',
      fin: '2026-10-31',
    });
    expect(CicloReglas.cicloDe('2026-10-31', 1)).toEqual({
      inicio: '2026-10-01',
      fin: '2026-10-31',
    });
  });

  it('agrupa el 31 de octubre y el 2 de noviembre en el ciclo del 29', () => {
    expect(CicloReglas.cicloDe('2026-10-31', 29)).toEqual({
      inicio: '2026-10-29',
      fin: '2026-11-28',
    });
    expect(CicloReglas.cicloDe('2026-11-02', 29)).toEqual({
      inicio: '2026-10-29',
      fin: '2026-11-28',
    });
  });

  it('el día anterior al corte pertenece al ciclo anterior', () => {
    expect(CicloReglas.cicloDe('2026-10-28', 29)).toEqual({
      inicio: '2026-09-29',
      fin: '2026-10-28',
    });
  });

  it('ajusta el corte al último día cuando el mes es más corto', () => {
    expect(CicloReglas.cicloDe('2026-02-28', 31)).toEqual({
      inicio: '2026-02-28',
      fin: '2026-03-30',
    });
    expect(CicloReglas.cicloDe('2026-03-01', 31)).toEqual({
      inicio: '2026-02-28',
      fin: '2026-03-30',
    });
  });

  it('agrupa y ordena los ciclos de más reciente a más antiguo', () => {
    const resumen = CicloReglas.agrupar(
      [
        { fecha: '2026-10-31', montoCents: 1000 },
        { fecha: '2026-11-02', montoCents: 2000 },
        { fecha: '2026-10-28', montoCents: 500 },
      ],
      29,
    );

    expect(resumen).toHaveLength(2);
    expect(resumen[0]).toEqual({
      inicio: '2026-10-29',
      fin: '2026-11-28',
      cantidad: 2,
      totalCents: 3000,
    });
    expect(resumen[1]).toMatchObject({
      inicio: '2026-09-29',
      fin: '2026-10-28',
      cantidad: 1,
    });
  });

  it('rechaza cortes fuera de 1..31', () => {
    expect(() => CicloReglas.validarCorte(0)).toThrow('El día de corte debe estar entre 1 y 31');
    expect(() => CicloReglas.validarCorte(32)).toThrow('El día de corte debe estar entre 1 y 31');
  });
});
