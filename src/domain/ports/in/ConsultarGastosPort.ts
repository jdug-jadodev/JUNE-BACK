import type { Gasto } from '../../entities/Gasto';

export interface ConsultarGastosPort {
  ejecutar(input: {
    hogarId: string;
    usuarioId: string;
    updatedAfter?: string;
  }): Promise<Gasto[]>;
}
