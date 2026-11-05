import type { CategoriaPersonalizada } from '../../../domain/entities/CategoriaPersonalizada';
import type { CategoriaPersonalizadaRepositorioPort } from '../../../domain/ports/out/CategoriaPersonalizadaRepositorioPort';
import { normalizarTermino } from '../../../domain/rules/Clasificador';

interface CategoriaRow {
  id: string;
  household_id: string;
  nombre: string;
  tipo: string;
  es_gusto: number;
  created_at: string;
}

function aDominio(row: CategoriaRow): CategoriaPersonalizada {
  return {
    id: row.id,
    hogarId: row.household_id,
    nombre: row.nombre,
    tipo: row.tipo === 'FIJO' ? 'FIJO' : 'VARIABLE',
    esGusto: row.es_gusto === 1,
    createdAt: row.created_at,
  };
}

export class CategoriaPersonalizadaD1Adapter implements CategoriaPersonalizadaRepositorioPort {
  constructor(private readonly db: D1Database) {}

  async listar(hogarId: string): Promise<CategoriaPersonalizada[]> {
    const { results } = await this.db
      .prepare(
        `SELECT id, household_id, nombre, tipo, es_gusto, created_at
         FROM custom_categories
         WHERE household_id = ?
         ORDER BY nombre ASC`,
      )
      .bind(hogarId)
      .all<CategoriaRow>();

    return results.map(aDominio);
  }

  async obtener(hogarId: string, id: string): Promise<CategoriaPersonalizada | null> {
    const row = await this.db
      .prepare(
        `SELECT id, household_id, nombre, tipo, es_gusto, created_at
         FROM custom_categories
         WHERE household_id = ? AND id = ?`,
      )
      .bind(hogarId, id)
      .first<CategoriaRow>();

    return row ? aDominio(row) : null;
  }

  async crear(categoria: CategoriaPersonalizada): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO custom_categories
           (id, household_id, nombre, nombre_normalizado, tipo, es_gusto, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        categoria.id,
        categoria.hogarId,
        categoria.nombre,
        normalizarTermino(categoria.nombre),
        categoria.tipo,
        categoria.esGusto ? 1 : 0,
        categoria.createdAt,
      )
      .run();
  }
}
 