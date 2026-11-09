import type { AnalisisIARepositorioPort } from '../../../domain/ports/out/AnalisisIARepositorioPort';

interface AnalisisIARow {
  texto: string | null;
}

export class AnalisisIAD1Adapter implements AnalisisIARepositorioPort {
  constructor(private readonly db: D1Database) {}

  async buscar(hogarId: string, fingerprint: string): Promise<string | null> {
    const row = await this.db
      .prepare(
        `SELECT texto FROM ai_analyses WHERE household_id = ? AND fingerprint = ?`,
      )
      .bind(hogarId, fingerprint)
      .first<AnalisisIARow>();

    return row?.texto ?? null;
  }

  async guardar(hogarId: string, fingerprint: string, texto: string): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO ai_analyses (id, household_id, fingerprint, texto, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(crypto.randomUUID(), hogarId, fingerprint, texto, new Date().toISOString())
      .run();
  }
}
