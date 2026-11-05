import type { ClasificacionHogar } from '../../../domain/entities/ClasificacionHogar';
import type { ClasificacionRepositorioPort } from '../../../domain/ports/out/ClasificacionRepositorioPort';

interface ClasificacionRow {
  termino: string;
  concepto_id: string;
  nota: string | null;
}

export class ClasificacionD1Adapter implements ClasificacionRepositorioPort {
  constructor(private readonly db: D1Database) {}

  async listar(hogarId: string): Promise<ClasificacionHogar[]> {
    const { results } = await this.db
      .prepare(
        `SELECT termino, concepto_id, nota
         FROM concept_overrides
         WHERE household_id = ?
         ORDER BY termino ASC`,
      )
      .bind(hogarId)
      .all<ClasificacionRow>();

    return results.map((row) => ({
      termino: row.termino,
      conceptoId: row.concepto_id,
      nota: row.nota,
    }));
  }

  async guardar(input: {
    hogarId: string;
    termino: string;
    conceptoId: string;
    nota: string | null;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO concept_overrides (id, household_id, termino, concepto_id, nota, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (household_id, termino)
         DO UPDATE SET concepto_id = excluded.concepto_id, nota = excluded.nota`,
      )
      .bind(
        crypto.randomUUID(),
        input.hogarId,
        input.termino,
        input.conceptoId,
        input.nota,
        new Date().toISOString(),
      )
      .run();
  }
}
