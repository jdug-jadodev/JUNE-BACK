import type { Ingreso } from '../../entities/Ingreso';

export interface IngresoRepositorioPort {
  listar(hogarId: string): Promise<Ingreso[]>;
  obtener(id: string): Promise<Ingreso | null>;
  crear(ingreso: Ingreso): Promise<void>;
  actualizar(ingreso: Ingreso): Promise<void>;
  eliminar(id: string): Promise<void>;
}
