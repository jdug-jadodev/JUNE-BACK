export interface EliminarGastoPort {
  ejecutar(input: {
    hogarId: string;
    gastoId: string;
    usuarioId: string;
    adminPassword: string;
  }): Promise<void>;
}
