import type { Ingreso, Periodicidad } from '../../../domain/entities/Ingreso';
import type { IngresoRepositorioPort } from '../../../domain/ports/out/IngresoRepositorioPort';

interface IngresoRow {
  id: string;
  household_id: string;
  nombre: string | null;
  monto_cents: number;
  periodicidad: string;
  created_at: string;
  updated_at: string;
}

function aDominio(row: IngresoRow): Ingreso {
  return {
    id: row.id,
    hogarId: row.household_id,
    nombre: row.nombre,
    montoCents: row.monto_cents,
    periodicidad: row.periodicidad as Periodicidad,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class IngresoD1Adapter implements IngresoRepositorioPort {
  constructor(private readonly db: D1Database) {}

  async listar(hogarId: string): Promise<Ingreso[]> {
    const { results } = await this.db
      .prepare(
        `SELECT id, household_id, nombre, monto_cents, periodicidad, created_at, updated_at
         FROM incomes
         WHERE household_id = ?
         ORDER BY created_at ASC`,
      )
      .bind(hogarId)
      .all<IngresoRow>();

    return results.map(aDominio);
  }

  async obtener(id: string): Promise<Ingreso | null> {
    const row = await this.db
      .prepare(
        `SELECT id, household_id, nombre, monto_cents, periodicidad, created_at, updated_at
         FROM incomes
         WHERE id = ?`,
      )
      .bind(id)
      .first<IngresoRow>();

    return row ? aDominio(row) : null;
  }

  async crear(ingreso: Ingreso): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO incomes (id, household_id, nombre, monto_cents, periodicidad, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        ingreso.id,
        ingreso.hogarId,
        ingreso.nombre,
        ingreso.montoCents,
        ingreso.periodicidad,
        ingreso.createdAt,
        ingreso.updatedAt,
      )
      .run();
  }

  async actualizar(ingreso: Ingreso): Promise<void> {
    await this.db
      .prepare(
        `UPDATE incomes
         SET nombre = ?, monto_cents = ?, periodicidad = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        ingreso.nombre,
        ingreso.montoCents,
        ingreso.periodicidad,
        ingreso.updatedAt,
        ingreso.id,
      )
      .run();
  }

  async eliminar(id: string): Promise<void> {
    await this.db.prepare(`DELETE FROM incomes WHERE id = ?`).bind(id).run();
  }
}
