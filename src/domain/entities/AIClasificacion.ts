/** Clasificación hecha por la IA para un término de un hogar. */
export interface AIClasificacion {
  termino: string;
  conceptoId: string;
  confianza: number | null;
  explicacion: string | null;
}

/** Concepto del catálogo que la IA puede usar como destino. */
export interface ConceptoCatalogo {
  id: string;
  nombre: string;
  categoria: string;
}
