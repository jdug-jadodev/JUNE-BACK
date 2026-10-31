import { GastoInvalidoError } from '../../exception/errors';

export const GastoReglas = {
  validar(producto: string, montoCents: number, fecha: string): void {
    if (!producto.trim()) {
      throw new GastoInvalidoError('El producto es obligatorio');
    }
    if (!Number.isInteger(montoCents) || montoCents <= 0) {
      throw new GastoInvalidoError('El monto debe ser mayor que cero');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new GastoInvalidoError('La fecha debe tener formato YYYY-MM-DD');
    }
  },

  esMesActual(fecha: string, referencia: Date = new Date()): boolean {
    const [year, month] = fecha.split('-').map(Number);
    return referencia.getUTCFullYear() === year && referencia.getUTCMonth() + 1 === month;
  },
};
