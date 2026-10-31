import type { Gasto } from '../../entities/Gasto';

export interface ExportarGastosPort {
  ejecutar(input: { hogarId: string; usuarioId: string; meses?: string[] }): Promise<string>;
}
