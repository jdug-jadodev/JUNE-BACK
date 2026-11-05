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

export interface AliasResuelto {
  conceptoId: string;
  alias: string;
}

function mejorCoincidencia(
  tokens: string[],
  alias: Array<[string, string]>,
): AliasResuelto | null {
  let mejor: AliasResuelto | null = null;

  for (const [texto, conceptoId] of alias) {
    const aliasTokens = tokenizar(texto);
    if (!contieneSecuencia(tokens, aliasTokens)) continue;
    if (mejor === null || texto.length > mejor.alias.length) {
      mejor = { conceptoId, alias: texto };
    }
  }

  return mejor;
}

/**
 * Resuelve el concepto de un producto libre, sin exigir que sea del catálogo.
 * Sirve para categorías personalizadas (`cat:<id>`).
 * - Un término corregido por el hogar tiene prioridad sobre el catálogo.
 * - Entre alias, gana el más largo: "papas y cilantro" sobre "papas".
 */
export function resolverAlias(
  producto: string,
  aliasPorHogar: Record<string, string> = {},
): AliasResuelto | null {
  const termino = normalizarTermino(producto);
  if (!termino) return null;

  const tokens = tokenizar(termino);
  const delHogar = Object.entries(aliasPorHogar);

  // Coincidencia exacta del hogar: es la corrección más intencional.
  const exacto = aliasPorHogar[termino];
  if (exacto !== undefined) return { conceptoId: exacto, alias: termino };

  const hogar = mejorCoincidencia(tokens, delHogar);
  if (hogar) return hogar;

  return mejorCoincidencia(tokens, Object.entries(ALIASES));
}

/**
 * Clasifica un producto libre a un concepto del catálogo base.
 * Devuelve `null` si no hay coincidencia (queda "Sin clasificar").
 */
export function clasificar(
  producto: string,
  aliasPorHogar: Record<string, string> = {},
): ResultadoClasificacion | null {
  const resuelto = resolverAlias(producto, aliasPorHogar);
  if (!resuelto) return null;

  const concepto = CONCEPTOS_BY_ID[resuelto.conceptoId];
  return concepto ? { concepto, alias: resuelto.alias } : null;
}
