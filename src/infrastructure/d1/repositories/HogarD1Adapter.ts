import type { Hogar } from '../../../domain/entities/Hogar';
import type { HogarRepositorioPort } from '../../../domain/ports/out/HogarRepositorioPort';
import { HogarMapper, type HogarRow } from '../mappers/mappers';

export class HogarD1Adapter implements HogarRepositorioPort {
  constructor(private readonly db: D1Database) {}

  async crear(hogar: Hogar): Promise<Hogar> {
    await this.db
      .prepare(
        `INSERT INTO households (id, nombre, owner_id, invite_code, admin_password_hash, cutoff_day, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        hogar.id,
        hogar.nombre,
        hogar.ownerId,
        hogar.inviteCode,
        hogar.adminPasswordHash,
        hogar.cutoffDay,
        hogar.createdAt,
      )
      .run();

    return hogar;
  }

  async listarPorUsuario(usuarioId: string): Promise<Hogar[]> {
    const { results } = await this.db
      .prepare(
        `SELECT h.*
         FROM households h
         JOIN members m ON m.household_id = h.id
         WHERE m.user_id = ?
         ORDER BY h.created_at ASC`,
      )
      .bind(usuarioId)
      .all<HogarRow>();

    return results.map(HogarMapper.toDomain);
  }

  async obtener(id: string): Promise<Hogar | null> {
    const row = await this.db
      .prepare(`SELECT * FROM households WHERE id = ?`)
      .bind(id)
      .first<HogarRow>();

    return row ? HogarMapper.toDomain(row) : null;
  }

  async buscarPorInviteCode(codigo: string): Promise<Hogar | null> {
    const row = await this.db
      .prepare(`SELECT * FROM households WHERE invite_code = ?`)
      .bind(codigo)
      .first<HogarRow>();

    return row ? HogarMapper.toDomain(row) : null;
  }

  async actualizarPasswordHash(id: string, hash: string): Promise<void> {
    await this.db
      .prepare(`UPDATE households SET admin_password_hash = ? WHERE id = ?`)
      .bind(hash, id)
      .run();
  }

  async actualizarCorte(id: string, cutoffDay: number): Promise<void> {
    await this.db
      .prepare(`UPDATE households SET cutoff_day = ? WHERE id = ?`)
      .bind(cutoffDay, id)
      .run();
  }
}
