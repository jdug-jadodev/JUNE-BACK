export type PeriodicidadIA = 'SEMANAL' | 'MENSUAL';

export interface SugerenciaIA {
  categoria: string;
  montoCents: number;
  periodicidad: PeriodicidadIA;
  nota: string;
}

export interface ProgresoCicloIA {
  diasTranscurridos: number;
  diasTotales: number;
  diasRestantes: number;
  totalCents: number;
  ingresoMensualCents: number;
  /** Porcentaje del ingreso mensual ya gastado (0-100). */
  porcentajeIngreso: number;
}

/** Resultado del análisis con IA, corto y estructurado. */
export interface AnalisisIA {
  ciclos: string[];
  progreso: ProgresoCicloIA;
  /** Personas en casa usadas para calcular los montos (deducidas o ajustadas). */
  personasEstimadas: number;
  estado: string;
  sugerencias: SugerenciaIA[];
  recomendacion: string;
  /** true si se devolvió desde la caché (no gastó tokens). */
  cacheado: boolean;
}
