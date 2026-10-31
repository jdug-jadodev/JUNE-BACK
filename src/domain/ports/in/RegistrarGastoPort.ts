import type { Gasto } from '../../entities/Gasto';

export interface RegistrarGastoPort {
  ejecutar(input: {
    hogarId: string;
    usuarioId: string;
    producto: string;
    montoCents: number;
    fecha: string;
  }): Promise<Gasto>;
}
