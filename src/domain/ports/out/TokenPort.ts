export interface TokenPort {
  firmarAccess(usuarioId: string): Promise<string>;
  verificarAccess(token: string): Promise<string>;
  generarRefresh(): string;
  hashRefresh(refresh: string): Promise<string>;
}
