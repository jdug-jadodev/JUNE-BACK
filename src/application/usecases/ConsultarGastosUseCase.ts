import type { Gasto } from '../../domain/entities/Gasto';
import type { ResumenMes } from '../../domain/entities/ResumenMes';
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
    desde?: string;
    hasta?: string;
  }): Promise<Gasto[]> {
    await this.validarMiembro(input.hogarId, input.usuarioId);

    return this.gastos.listar(input.hogarId, {
      updatedAfter: input.updatedAfter,
      desde: input.desde,
      hasta: input.hasta,
    });
  }

  async meses(input: { hogarId: string; usuarioId: string }): Promise<ResumenMes[]> {
    await this.validarMiembro(input.hogarId, input.usuarioId);
    return this.gastos.listarMeses(input.hogarId);
  }

  private async validarMiembro(hogarId: string, usuarioId: string): Promise<void> {
    const miembro = await this.miembros.buscar(hogarId, usuarioId);
    if (!miembro) throw new NoEsMiembroError();
  }
}
