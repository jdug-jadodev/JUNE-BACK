import type { Tipo } from './Concepto';

/**
 * Categoría creada por un hogar. Su id lleva el prefijo `cat:` para
 * distinguirla del catálogo base al clasificar un gasto.
 */
export interface CategoriaPersonalizada {
  id: string;
  hogarId: string;
  nombre: string;
  tipo: Tipo;
  esGusto: boolean;
  createdAt: string;
}
