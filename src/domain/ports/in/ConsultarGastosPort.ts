import type { Gasto } from '../../entities/Gasto';
import type { ResumenMes } from '../../entities/ResumenMes';

export interface ConsultarGastosPort {
  ejecutar(input: {
    hogarId: string;
    usuarioId: string;
    updatedAfter?: string;
    desde?: string;
    hasta?: string;
  }): Promise<Gasto[]>;
  meses(input: { hogarId: string; usuarioId: string }): Promise<ResumenMes[]>;
}
