import type { Gasto } from '../../../domain/entities/Gasto';
import type { ResumenMes } from '../../../domain/entities/ResumenMes';
import type {
  FiltroGastos,
  GastoRepositorioPort,
  GastoResumenFecha,
} from '../../../domain/ports/out/GastoRepositorioPort';
import { GastoMapper, type GastoRow } from '../mappers/mappers';

const SELECT_BASE = `
  SELECT e.*, u.nombre AS created_by_nombre
  FROM expenses e
  JOIN users u ON u.id = e.created_by
`;

interface ResumenMesRow {
  mes: string;
  cantidad: number;
  total_cents: number;
}

export class GastoD1Adapter implements GastoRepositorioPort {
  constructor(private readonly db: D1Database) {}

  async listar(hogarId: string, filtro?: FiltroGastos): Promise<Gasto[]> {
    const condiciones = ['e.household_id = ?'];
    const valores: string[] = [hogarId];

    if (filtro?.updatedAfter) {
      condiciones.push('e.updated_at > ?');
      valores.push(filtro.updatedAfter);
    }
    if (filtro?.desde) {
      condiciones.push('e.fecha >= ?');
      valores.push(filtro.desde);
    }
    if (filtro?.hasta) {
      condiciones.push('e.fecha <= ?');
      valores.push(filtro.hasta);
    }

    const sql = `${SELECT_BASE} WHERE ${condiciones.join(' AND ')}
      ORDER BY e.fecha DESC, e.created_at DESC`;

    const { results } = await this.db
      .prepare(sql)
      .bind(...valores)
      .all<GastoRow>();
    return results.map(GastoMapper.toDomain);
  }

  async listarFechasMontos(hogarId: string): Promise<GastoResumenFecha[]> {
    const { results } = await this.db
      .prepare(`SELECT fecha, monto_cents FROM expenses WHERE household_id = ?`)
      .bind(hogarId)
      .all<{ fecha: string; monto_cents: number }>();

    return results.map((fila) => ({
      fecha: fila.fecha,
      montoCents: fila.monto_cents,
    }));
  }

  async listarMeses(hogarId: string): Promise<ResumenMes[]> {
    const { results } = await this.db
      .prepare(
        `SELECT substr(e.fecha, 1, 7) AS mes,
                COUNT(*) AS cantidad,
                SUM(e.monto_cents) AS total_cents
         FROM expenses e
         WHERE e.household_id = ?
         GROUP BY mes
         ORDER BY mes DESC`,
      )
      .bind(hogarId)
      .all<ResumenMesRow>();

    return results.map((fila) => ({
      mes: fila.mes,
      cantidad: fila.cantidad,
      totalCents: fila.total_cents,
    }));
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
