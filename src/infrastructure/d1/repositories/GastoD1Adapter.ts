import type { Gasto } from '../../../domain/entities/Gasto';
import type { GastoRepositorioPort } from '../../../domain/ports/out/GastoRepositorioPort';
import { GastoMapper, type GastoRow } from '../mappers/mappers';

const SELECT_BASE = `
  SELECT e.*, u.nombre AS created_by_nombre
  FROM expenses e
  JOIN users u ON u.id = e.created_by
`;

export class GastoD1Adapter implements GastoRepositorioPort {
  constructor(private readonly db: D1Database) {}

  async listar(hogarId: string, updatedAfter?: string): Promise<Gasto[]> {
    const sql = updatedAfter
      ? `${SELECT_BASE} WHERE e.household_id = ? AND e.updated_at > ?
         ORDER BY e.fecha DESC, e.created_at DESC`
      : `${SELECT_BASE} WHERE e.household_id = ?
         ORDER BY e.fecha DESC, e.created_at DESC`;

    const statement = updatedAfter
      ? this.db.prepare(sql).bind(hogarId, updatedAfter)
      : this.db.prepare(sql).bind(hogarId);

    const { results } = await statement.all<GastoRow>();
    return results.map(GastoMapper.toDomain);
  }

  async obtener(id: string): Promise<Gasto | null> {
    const row = await this.db
      .prepare(`${SELECT_BASE} WHERE e.id = ?`)
      .bind(id)
      .first<GastoRow>();

    return row ? GastoMapper.toDomain(row) : null;
  }

  async crear(gasto: Gasto): Promise<Gasto> {
    await this.db
      .prepare(
        `INSERT INTO expenses
           (id, household_id, producto, monto_cents, fecha, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        gasto.id,
        gasto.hogarId,
        gasto.producto,
        gasto.montoCents,
        gasto.fecha,
        gasto.creadoPor,
        gasto.createdAt,
        gasto.updatedAt,
      )
      .run();

    return gasto;
  }

  async actualizar(gasto: Gasto): Promise<Gasto> {
    await this.db
      .prepare(
        `UPDATE expenses
         SET producto = ?, monto_cents = ?, fecha = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        gasto.producto,
        gasto.montoCents,
        gasto.fecha,
        gasto.updatedAt,
        gasto.id,
      )
      .run();

    return gasto;
  }

  async eliminar(id: string): Promise<void> {
    await this.db.prepare(`DELETE FROM expenses WHERE id = ?`).bind(id).run();
  }
}
