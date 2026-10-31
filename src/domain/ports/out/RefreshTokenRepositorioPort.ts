export interface RefreshTokenGuardado {
  usuarioId: string;
  expiresAt: string;
}

export interface RefreshTokenRepositorioPort {
  guardar(input: { usuarioId: string; tokenHash: string; expiresAt: string }): Promise<void>;
  buscar(tokenHash: string): Promise<RefreshTokenGuardado | null>;
  eliminar(tokenHash: string): Promise<void>;
  eliminarExpirados(ahora: string): Promise<void>;
}
