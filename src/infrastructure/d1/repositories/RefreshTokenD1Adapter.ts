import type {
  RefreshTokenGuardado,
  RefreshTokenRepositorioPort,
} from '../../../domain/ports/out/RefreshTokenRepositorioPort';

export class RefreshTokenD1Adapter implements RefreshTokenRepositorioPort {
  constructor(private readonly db: D1Database) {}

  async guardar(input: {
    usuarioId: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        input.usuarioId,
        input.tokenHash,
        input.expiresAt,
        new Date().toISOString(),
      )
      .run();
  }

  async buscar(tokenHash: string): Promise<RefreshTokenGuardado | null> {
    const row = await this.db
      .prepare(`SELECT user_id, expires_at FROM refresh_tokens WHERE token_hash = ?`)
      .bind(tokenHash)
      .first<{ user_id: string; expires_at: string }>();

    return row ? { usuarioId: row.user_id, expiresAt: row.expires_at } : null;
  }

  async eliminar(tokenHash: string): Promise<void> {
    await this.db
      .prepare(`DELETE FROM refresh_tokens WHERE token_hash = ?`)
      .bind(tokenHash)
      .run();
  }

  async eliminarPorUsuario(usuarioId: string): Promise<void> {
    await this.db
      .prepare(`DELETE FROM refresh_tokens WHERE user_id = ?`)
      .bind(usuarioId)
      .run();
  }

  async eliminarExpirados(ahora: string): Promise<void> {
    await this.db
      .prepare(`DELETE FROM refresh_tokens WHERE expires_at <= ?`)
      .bind(ahora)
      .run();
  }
}
