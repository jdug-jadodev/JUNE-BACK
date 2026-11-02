import type { Usuario } from '../../../domain/entities/Usuario';
import type { UsuarioSeguridad } from '../../../domain/entities/UsuarioSeguridad';
import type {
  UsuarioConPassword,
  UsuarioRepositorioPort,
} from '../../../domain/ports/out/UsuarioRepositorioPort';
import { UsuarioMapper, type UsuarioRow } from '../mappers/mappers';

function aSeguridad(row: UsuarioRow): UsuarioSeguridad {
  return {
    id: row.id,
    email: row.email,
    securityQuestion: row.security_question,
    securityAnswerHash: row.security_answer_hash,
    recoveryCodeHash: row.recovery_code_hash,
    resetAttempts: row.reset_attempts ?? 0,
    resetLockedUntil: row.reset_locked_until,
  };
}

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

  async buscarConPasswordPorId(id: string): Promise<UsuarioConPassword | null> {
    const row = await this.db
      .prepare(`SELECT * FROM users WHERE id = ?`)
      .bind(id)
      .first<UsuarioRow>();

    if (!row) return null;
    return { usuario: UsuarioMapper.toDomain(row), passwordHash: row.password_hash };
  }

  async buscarSeguridadPorEmail(email: string): Promise<UsuarioSeguridad | null> {
    const row = await this.db
      .prepare(`SELECT * FROM users WHERE email = ?`)
      .bind(email)
      .first<UsuarioRow>();

    return row ? aSeguridad(row) : null;
  }

  async buscarSeguridadPorId(id: string): Promise<UsuarioSeguridad | null> {
    const row = await this.db
      .prepare(`SELECT * FROM users WHERE id = ?`)
      .bind(id)
      .first<UsuarioRow>();

    return row ? aSeguridad(row) : null;
  }

  async actualizarPregunta(
    id: string,
    pregunta: string,
    respuestaHash: string,
  ): Promise<void> {
    await this.db
      .prepare(`UPDATE users SET security_question = ?, security_answer_hash = ? WHERE id = ?`)
      .bind(pregunta, respuestaHash, id)
      .run();
  }

  async actualizarCodigoRecuperacion(id: string, codigoHash: string | null): Promise<void> {
    await this.db
      .prepare(`UPDATE users SET recovery_code_hash = ? WHERE id = ?`)
      .bind(codigoHash, id)
      .run();
  }

  async actualizarPasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.db
      .prepare(`UPDATE users SET password_hash = ? WHERE id = ?`)
      .bind(passwordHash, id)
      .run();
  }

  async actualizarIntentoReset(
    id: string,
    intentos: number,
    bloqueadoHasta: string | null,
  ): Promise<void> {
    await this.db
      .prepare(`UPDATE users SET reset_attempts = ?, reset_locked_until = ? WHERE id = ?`)
      .bind(intentos, bloqueadoHasta, id)
      .run();
  }
}
