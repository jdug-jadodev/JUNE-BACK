import type { ConceptoCatalogo } from '../../domain/entities/AIClasificacion';
import type { ClasificarConIAPort } from '../../domain/ports/in/ClasificarConIAPort';
import type { AIClasificacionRepositorioPort } from '../../domain/ports/out/AIClasificacionRepositorioPort';
import type { DeepSeekAdapter } from '../../infrastructure/ai/DeepSeekAdapter';
import { hayPresupuesto, mesActual } from '../../domain/rules/PresupuestoIA';

export class ClasificarConIAUseCase implements ClasificarConIAPort {
  constructor(
    private readonly repo: AIClasificacionRepositorioPort,
    private readonly ia: DeepSeekAdapter | null,
    private readonly presupuestoUSD: number = 5,
  ) {}

  async clasificar(
    hogarId: string,
    terminos: string[],
    catalogo: ConceptoCatalogo[],
  ): Promise<Map<string, string>> {
    const cache = await this.repo.listar(hogarId);
    const mapa = new Map(cache.map((c) => [c.termino, c.conceptoId]));

    const validos = new Set(catalogo.map((c) => c.id));
    const pendientes = [...new Set(terminos)].filter((t) => !mapa.has(t));

    if (pendientes.length > 0 && this.ia) {
      const uso = await this.repo.usoDelMes(mesActual());
      if (hayPresupuesto(uso, this.presupuestoUSD)) {
        try {
          const resp = await this.ia.clasificar(pendientes, catalogo);
          const nuevas = resp.resultados
            .filter((r) => validos.has(r.conceptoId))
            .map((r) => ({
              termino: r.termino,
              conceptoId: r.conceptoId,
              confianza: r.confianza,
              explicacion: r.explicacion,
            }));

          if (nuevas.length > 0) {
            await this.repo.guardar(hogarId, nuevas);
            await this.repo.registrarUso(mesActual(), resp.tokensIn, resp.tokensOut);
            for (const n of nuevas) mapa.set(n.termino, n.conceptoId);
          }
        } catch {
          // Si la IA falla, seguimos con el clasificador determinista.
        }
      }
    }

    return mapa;
  }
}
