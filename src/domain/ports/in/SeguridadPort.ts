export interface SeguridadPort {
  configurar(input: { usuarioId: string; pregunta: string; respuesta: string }): Promise<void>;
  estado(input: { usuarioId: string }): Promise<{
    pregunta: string | null;
    tieneCodigo: boolean;
  }>;
  generarCodigo(input: { usuarioId: string }): Promise<string>;
  preguntaPorEmail(input: { email: string }): Promise<string | null>;
  recuperarConPregunta(input: {
    email: string;
    respuesta: string;
    passwordNueva: string;
  }): Promise<void>;
  recuperarConCodigo(input: {
    email: string;
    codigo: string;
    passwordNueva: string;
  }): Promise<void>;
  cambiarPassword(input: {
    usuarioId: string;
    passwordActual: string;
    passwordNueva: string;
  }): Promise<void>;
}
