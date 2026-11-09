export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  /** Clave de DeepSeek. Si no está, el motor cae al clasificador determinista. */
  DEEPSEEK_API_KEY?: string;
  /** Modelo de DeepSeek a usar. */
  DEEPSEEK_MODEL?: string;
  /** Presupuesto mensual en USD (default 5). */
  IA_PRESUPUESTO_MES_USD?: string;
}
