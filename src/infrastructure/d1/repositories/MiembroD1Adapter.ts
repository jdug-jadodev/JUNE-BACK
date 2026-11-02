import type { Miembro } from '../../../domain/entities/Miembro';
import type { MiembroRepositorioPort } from '../../../domain/ports/out/MiembroRepositorioPort';
import { MiembroMapper, type MiembroRow } from '../mappers/mappers';

export class MiembroD1Adapter implements MiembroRepositorioPort {
  constructor(private readonly db: D1Database) {}

  async crear(miembro: Miembro): Promise<Miembro> {
    await this.db
      .prepare(
        `INSERT INTO members (id, household_id, user_id, role, access_level, joined_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        miembro.id,
        miembro.hogarId,
        miembro.usuarioId,
        miembro.rol,
        miembro.acceso,
        miembro.joinedAt,
      )
      .run();

    return miembro;
  }

  async buscar(hogarId: string, usuarioId: string): Promise<Miembro | null> {
    const row = await this.db
      .prepare(`SELECT * FROM members WHERE household_id = ? AND user_id = ?`)
      .bind(hogarId, usuarioId)
      .first<MiembroRow>();

    return row ? MiembroMapper.toDomain(row) : null;
  }

  async listar(hogarId: string): Promise<Miembro[]> {
    const { results } = await this.db
      .prepare(
        `SELECT m.*, u.nombre AS nombre, u.email AS email
         FROM members m
         JOIN users u ON u.id = m.user_id
         WHERE m.household_id = ?
         ORDER BY m.joined_at ASC`,
      )
      .bind(hogarId)
      .all<MiembroRow>();

    return results.map(MiembroMapper.toDomain);
  }

  async eliminar(id: string): Promise<void> {
    await this.db.prepare(`DELETE FROM members WHERE id = ?`).bind(id).run();
  }

  async actualizarAcceso(id: string, acceso: string): Promise<void> {
    await this.db
      .prepare(`UPDATE members SET access_level = ? WHERE id = ?`)
      .bind(acceso, id)
      .run();
  }

  async contarAdmins(hogarId: string): Promise<number> {
    const row = await this.db
      .prepare(
        `SELECT COUNT(*) AS total FROM members WHERE household_id = ? AND role = 'ADMIN'`,
      )
      .bind(hogarId)
      .first<{ total: number }>();

    return row?.total ?? 0;
  }
}
