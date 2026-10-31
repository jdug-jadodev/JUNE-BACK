import type { Gasto } from '../../entities/Gasto';

export interface ActualizarGastoPort {
  ejecutar(input: {
    hogarId: string;
    gastoId: string;
    usuarioId: string;
    adminPassword: string;
    producto: string;
    montoCents: number;
    fecha: string;
  }): Promise<Gasto>;
}
