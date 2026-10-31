import type { Gasto } from '../../entities/Gasto';

export interface GastoRepositorioPort {
  listar(hogarId: string, updatedAfter?: string): Promise<Gasto[]>;
  obtener(id: string): Promise<Gasto | null>;
  crear(gasto: Gasto): Promise<Gasto>;
  actualizar(gasto: Gasto): Promise<Gasto>;
  eliminar(id: string): Promise<void>;
}
