import type { UsoIA } from '../ports/out/AIClasificacionRepositorioPort';

/** Precios DeepSeek en USD por token. */
const PRECIO_INPUT_USD = 0.15 / 1_000_000;
const PRECIO_OUTPUT_USD = 0.6 / 1_000_000;

/** Fracción del presupuesto que habilita el corte automático. */
const FRACCION_CORTE = 0.8;

export function costoUSD(tokensIn: number, tokensOut: number): number {
  return tokensIn * PRECIO_INPUT_USD + tokensOut * PRECIO_OUTPUT_USD;
}

/** Indica si todavía hay margen bajo el tope del mes. */
export function hayPresupuesto(uso: UsoIA, presupuestoUSD: number): boolean {
  const corte = presupuestoUSD * FRACCION_CORTE;
  return costoUSD(uso.tokensIn, uso.tokensOut) < corte;
}

export function mesActual(): string {
  return new Date().toISOString().slice(0, 7);
}
