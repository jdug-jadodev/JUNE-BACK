import type { ClasificarTerminoPort } from '../../domain/ports/in/ClasificarTerminoPort';
import type { ClasificacionRepositorioPort } from '../../domain/ports/out/ClasificacionRepositorioPort';
import type { MiembroRepositorioPort } from '../../domain/ports/out/MiembroRepositorioPort';
import { CONCEPTOS_BY_ID } from '../../domain/rules/CatalogoConceptos';
import { normalizarTermino } from '../../domain/rules/Clasificador';
import { DomainError, NoEsMiembroError, SoloLecturaError } from '../../exception/errors';

const MAX_NOTA = 240;

export class ClasificarTerminoUseCase implements ClasificarTerminoPort {
  constructor(
    private readonly miembros: MiembroRepositorioPort,
    private readonly clasificaciones: ClasificacionRepositorioPort,
  ) {}

  async ejecutar(input: {
    hogarId: string;
    usuarioId: string;
    termino: string;
    conceptoId: string;
    nota?: string | null;
  }): Promise<{
    termino: string;
    conceptoId: string;
    nombre: string;
    nota: string | null;
  }> {
    const miembro = await this.miembros.buscar(input.hogarId, input.usuarioId);
    if (!miembro) throw new NoEsMiembroError();
    if (miembro.acceso !== 'ESCRITURA') throw new SoloLecturaError();

    const termino = normalizarTermino(input.termino);
    if (!termino) {
      throw new DomainError('TERMINO_INVALIDO', 'El gasto no tiene un nombre válido', 400);
    }

    const concepto = CONCEPTOS_BY_ID[input.conceptoId];
    if (!concepto) {
      throw new DomainError('CONCEPTO_INVALIDO', 'Elige una categoría de la lista', 400);
    }

    const nota = input.nota?.trim().slice(0, MAX_NOTA) || null;

    await this.clasificaciones.guardar({
      hogarId: input.hogarId,
      termino,
      conceptoId: concepto.id,
      nota,
    });

    return { termino, conceptoId: concepto.id, nombre: concepto.nombre, nota };
  }
}
