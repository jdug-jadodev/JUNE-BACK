import { describe, expect, it } from 'vitest';
import { GastoReglas } from '../../src/domain/rules/GastoReglas';
import { GastoInvalidoError } from '../../src/exception/errors';

describe('GastoReglas', () => {
  it('acepta un gasto válido', () => {
    expect(() => GastoReglas.validar('Arroz', 1000, '2026-10-30')).not.toThrow();
  });

  it('rechaza producto vacío', () => {
    expect(() => GastoReglas.validar('   ', 1000, '2026-10-30')).toThrow(GastoInvalidoError);
  });

  it('rechaza monto cero o negativo', () => {
    expect(() => GastoReglas.validar('Arroz', 0, '2026-10-30')).toThrow(GastoInvalidoError);
    expect(() => GastoReglas.validar('Arroz', -5, '2026-10-30')).toThrow(GastoInvalidoError);
  });

  it('rechaza fecha con formato inválido', () => {
    expect(() => GastoReglas.validar('Arroz', 1000, '30/10/2026')).toThrow(GastoInvalidoError);
  });

  it('identifica los gastos del mes actual', () => {
    const referencia = new Date('2026-10-30T12:00:00Z');
    expect(GastoReglas.esMesActual('2026-10-01', referencia)).toBe(true);
    expect(GastoReglas.esMesActual('2026-09-30', referencia)).toBe(false);
    expect(GastoReglas.esMesActual('2026-11-01', referencia)).toBe(false);
  });
});
