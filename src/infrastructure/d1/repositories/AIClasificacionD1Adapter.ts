import type { AIClasificacion } from '../../../domain/entities/AIClasificacion';
import type { AIClasificacionRepositorioPort } from '../../../domain/ports/out/AIClasificacionRepositorioPort';

interface AIClasificacionRow {
  termino: string;
  concepto_id: string;
  confianza: number | null;
  explicacion: string | null;
}

interface UsoRow {
  tokens_in: number;
  tokens_out: number;
  requests: number;
}

export class AIClasificacionD1Adapter implements AIClasificacionRepositorioPort {
  constructor(private readonly db: D1Database) {}

  async listar(hogarId: string): Promise<AIClasificacion[]> {
    const { results } = await this.db
      .prepare(
        `SELECT termino, concepto_id, confianza, explicacion
         FROM ai_classifications
         WHERE household_id = ?`,
      )
      .bind(hogarId)
      .all<AIClasificacionRow>();

    return results.map((row) => ({
      termino: row.termino,
      conceptoId: row.concepto_id,
      confianza: row.confianza,
      explicacion: row.explicacion,
    }));
  }

  async guardar(hogarId: string, clasificaciones: AIClasificacion[]): Promise<void> {
    const ahora = new Date().toISOString();
    const stmt = this.db.prepare(
      `INSERT INTO ai_classifications (household_id, termino, concepto_id, confianza, explicacion, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (household_id, termino)
       DO UPDATE SET concepto_id = excluded.concepto_id,
                     confianza = excluded.confianza,
                     explicacion = excluded.explicacion`,
    );

    await this.db.batch(
      clasificaciones.map((c) =>
        stmt.bind(hogarId, c.termino, c.conceptoId, c.confianza, c.explicacion, ahora),
      ),
    );
  }

  async usoDelMes(mes: string): Promise<{ tokensIn: number; tokensOut: number; requests: number }> {
    const row = await this.db
      .prepare(`SELECT tokens_in, tokens_out, requests FROM ai_usage WHERE month = ?`)
      .bind(mes)
      .first<UsoRow>();

    return {
      tokensIn: row?.tokens_in ?? 0,
      tokensOut: row?.tokens_out ?? 0,
      requests: row?.requests ?? 0,
    };
  }

  async registrarUso(mes: string, tokensIn: number, tokensOut: number): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO ai_usage (month, tokens_in, tokens_out, requests, updated_at)
         VALUES (?, ?, ?, 1, ?)
         ON CONFLICT (month)
         DO UPDATE SET tokens_in = tokens_in + excluded.tokens_in,
                       tokens_out = tokens_out + excluded.tokens_out,
                       requests = requests + 1,
                       updated_at = excluded.updated_at`,
      )
      .bind(mes, tokensIn, tokensOut, new Date().toISOString())
      .run();
  }
}
