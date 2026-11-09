import type { ConceptoCatalogo } from '../../entities/AIClasificacion';

export interface ClasificarConIAPort {
  /**
   * Devuelve un mapa término -> conceptoId para los términos pedidos.
   * Usa la caché del hogar y, si faltan términos y hay presupuesto,
   * los clasifica con la IA en un solo lote.
   */
  clasificar(
    hogarId: string,
    terminos: string[],
    catalogo: ConceptoCatalogo[],
  ): Promise<Map<string, string>>;
}
