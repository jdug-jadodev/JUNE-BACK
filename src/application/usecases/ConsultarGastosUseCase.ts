import type { Gasto } from '../../domain/entities/Gasto';
import type { ConsultarGastosPort } from '../../domain/ports/in/ConsultarGastosPort';
import type { GastoRepositorioPort } from '../../domain/ports/out/GastoRepositorioPort';
import type { MiembroRepositorioPort } from '../../domain/ports/out/MiembroRepositorioPort';
import { NoEsMiembroError } from '../../exception/errors';

export class ConsultarGastosUseCase implements ConsultarGastosPort {
  constructor(
    private readonly gastos: GastoRepositorioPort,
    private readonly miembros: MiembroRepositorioPort,
  ) {}

  async ejecutar(input: {
    hogarId: string;
    usuarioId: string;
    updatedAfter?: string;
  }): Promise<Gasto[]> {
    const miembro = await this.miembros.buscar(input.hogarId, input.usuarioId);
    if (!miembro) throw new NoEsMiembroError();

    return this.gastos.listar(input.hogarId, input.updatedAfter);
  }
}
