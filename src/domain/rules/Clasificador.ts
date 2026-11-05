import type { Concepto } from '../entities/Concepto';
import { ALIASES, CONCEPTOS_BY_ID } from './CatalogoConceptos';

/**
 * Normaliza un término: minúsculas, sin tildes, signos a espacios y
 * espacios repetidos a uno solo. "Coca-Cola" -> "coca cola".
 */
export function normalizarTermino(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function tokenizar(valor: string): string[] {
  return valor.split(' ').filter(Boolean);
}

function contieneSecuencia(tokens: string[], aliasTokens: string[]): boolean {
  if (aliasTokens.length === 0 || aliasTokens.length > tokens.length) return false;
  outer: for (let i = 0; i <= tokens.length - aliasTokens.length; i += 1) {
    for (let j = 0; j < aliasTokens.length; j += 1) {
      if (tokens[i + j] !== aliasTokens[j]) continue outer;
    }
    return true;
  }
  return false;
}

export interface ResultadoClasificacion {
  concepto: Concepto;
  alias: string;
}

/**
 * Clasifica un producto libre a un concepto del catálogo.
 * - Prioriza los alias más largos (más específicos): "papas y cilantro" gana sobre "papas".
 * - `aliasPorHogar` permite correcciones del usuario (mismo término -> otro concepto).
 * Devuelve `null` si no hay coincidencia (queda "Sin clasificar").
 */
export function clasificar(
  producto: string,
  aliasPorHogar: Record<string, string> = {},
): ResultadoClasificacion | null {
  const termino = normalizarTermino(producto);
  if (!termino) return null;

  const tokens = tokenizar(termino);
  const combinados = new Map<string, string>(Object.entries(ALIASES));
  for (const [alias, conceptoId] of Object.entries(aliasPorHogar)) {
    combinados.set(alias, conceptoId);
  }

  let mejor: { alias: string; conceptoId: string } | null = null;

  for (const [alias, conceptoId] of combinados.entries()) {
    const aliasTokens = tokenizar(alias);
    if (!contieneSecuencia(tokens, aliasTokens)) continue;
    if (mejor === null || alias.length > mejor.alias.length) {
      mejor = { alias, conceptoId };
    }
  }

  if (!mejor) return null;
  const concepto = CONCEPTOS_BY_ID[mejor.conceptoId];
  return concepto ? { concepto, alias: mejor.alias } : null;
}
