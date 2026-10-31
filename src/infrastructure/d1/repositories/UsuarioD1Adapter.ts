import type { Usuario } from '../../../domain/entities/Usuario';
import type {
  UsuarioConPassword,
  UsuarioRepositorioPort,
} from '../../../domain/ports/out/UsuarioRepositorioPort';
import { UsuarioMapper, type UsuarioRow } from '../mappers/mappers';

export class UsuarioD1Adapter implements UsuarioRepositorioPort {
  constructor(private readonly db: D1Database) {}

  async crear(usuario: Usuario, passwordHash: string): Promise<Usuario> {
    await this.db
      .prepare(
        `INSERT INTO users (id, email, password_hash, nombre, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(usuario.id, usuario.email, passwordHash, usuario.nombre, usuario.createdAt)
      .run();

    return usuario;
  }

  async buscarPorEmail(email: string): Promise<UsuarioConPassword | null> {
    const row = await this.db
      .prepare(`SELECT * FROM users WHERE email = ?`)
      .bind(email)
      .first<UsuarioRow>();

    if (!row) return null;
    return { usuario: UsuarioMapper.toDomain(row), passwordHash: row.password_hash };
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const row = await this.db
      .prepare(`SELECT * FROM users WHERE id = ?`)
      .bind(id)
      .first<UsuarioRow>();

    return row ? UsuarioMapper.toDomain(row) : null;
  }
}
