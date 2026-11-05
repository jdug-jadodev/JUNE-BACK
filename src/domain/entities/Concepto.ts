export type Categoria =
  | 'vivienda'
  | 'servicios'
  | 'mercado'
  | 'comida'
  | 'transporte'
  | 'salud'
  | 'educacion'
  | 'mascotas'
  | 'deudas'
  | 'hogar'
  | 'gustos'
  | 'cuidado'
  | 'otros';

export type Tipo = 'FIJO' | 'VARIABLE';

export type Necesidad = 'ESENCIAL' | 'NECESARIO' | 'DISCRECIONAL';

export interface Concepto {
  id: string;
  nombre: string;
  categoria: Categoria;
  tipo: Tipo;
  necesidad: Necesidad;
  /** Marca los "gustos pequeños" (mecato, gaseosa, cerveza, cigarrillos…). */
  esGusto: boolean;
}
