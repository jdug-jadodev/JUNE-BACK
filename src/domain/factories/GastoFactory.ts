import type { Gasto } from '../entities/Gasto';
import { GastoReglas } from '../rules/GastoReglas';

export const GastoFactory = {
  nuevo(input: {
    hogarId: string;
    producto: string;
    montoCents: number;
    fecha: string;
    usuarioId: string;
    usuarioNombre: string;
  }): Gasto {
    GastoReglas.validar(input.producto, input.montoCents, input.fecha);

    const ahora = new Date().toISOString();

    return {
      id: crypto.randomUUID(),
      hogarId: input.hogarId,
      producto: input.producto.trim(),
      montoCents: input.montoCents,
      fecha: input.fecha,
      creadoPor: input.usuarioId,
      creadoPorNombre: input.usuarioNombre,
      createdAt: ahora,
      updatedAt: ahora,
    };
  },
};
