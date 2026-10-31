import type { Gasto } from '../../entities/Gasto';
import type { ResumenMes } from '../../entities/ResumenMes';

export interface FiltroGastos {
  updatedAfter?: string;
  desde?: string;
  hasta?: string;
}

export interface GastoRepositorioPort {
  listar(hogarId: string, filtro?: FiltroGastos): Promise<Gasto[]>;
  listarMeses(hogarId: string): Promise<ResumenMes[]>;
  obtener(id: string): Promise<Gasto | null>;
  crear(gasto: Gasto): Promise<Gasto>;
  actualizar(gasto: Gasto): Promise<Gasto>;
  eliminar(id: string): Promise<void>;
}
