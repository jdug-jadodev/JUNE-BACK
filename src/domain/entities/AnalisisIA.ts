/** Resultado del análisis narrativo con IA. */
export interface AnalisisIA {
  texto: string;
  ciclos: string[];
  generadoEl: string;
  /** true si se devolvió desde la caché (no gastó tokens). */
  cacheado: boolean;
}
