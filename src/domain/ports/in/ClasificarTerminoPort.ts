export interface ClasificarTerminoPort {
  ejecutar(input: {
    hogarId: string;
    usuarioId: string;
    termino: string;
    conceptoId: string;
    nota?: string | null;
  }): Promise<{
    termino: string;
    conceptoId: string;
    nombre: string;
    nota: string | null;
  }>;
}
