import type { Ingreso, Periodicidad } from '../../entities/Ingreso';

export interface GestionarIngresosPort {
  listar(input: { hogarId: string; usuarioId: string }): Promise<Ingreso[]>;
  crear(input: {
    hogarId: string;
    usuarioId: string;
    nombre?: string | null;
    montoCents: number;
    periodicidad: Periodicidad;
  }): Promise<Ingreso>;
  actualizar(input: {
    hogarId: string;
    usuarioId: string;
    ingresoId: string;
    nombre?: string | null;
    montoCents: number;
    periodicidad: Periodicidad;
  }): Promise<Ingreso>;
  eliminar(input: { hogarId: string; usuarioId: string; ingresoId: string }): Promise<void>;
}
