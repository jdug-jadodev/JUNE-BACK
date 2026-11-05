/**
 * Corrección de clasificación hecha por el hogar para un término libre.
 * Ejemplo: "mama de angel" -> "ayuda_familiar" con la nota
 * "pago mensual a mi suegra".
 */
export interface ClasificacionHogar {
  termino: string;
  conceptoId: string;
  nota: string | null;
}
