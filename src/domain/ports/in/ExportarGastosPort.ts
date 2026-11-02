export interface ExportarGastosPort {
  ejecutar(input: {
    hogarId: string;
    usuarioId: string;
    meses?: string[];
    ciclos?: string[];
  }): Promise<string>;
}
