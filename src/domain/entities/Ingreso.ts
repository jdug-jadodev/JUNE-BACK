/** Frecuencia con la que entra el ingreso. */
export type Periodicidad = 'MENSUAL' | 'QUINCENAL';

export interface Ingreso {
  id: string;
  hogarId: string;
  /** Etiqueta opcional, ej. "Sueldo", "Ventas de la tienda". */
  nombre: string | null;
  montoCents: number;
  periodicidad: Periodicidad;
  createdAt: string;
  updatedAt: string;
}
