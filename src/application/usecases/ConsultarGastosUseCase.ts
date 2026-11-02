import type { Gasto } from '../../domain/entities/Gasto';
import type { ResumenCiclo } from '../../domain/entities/ResumenCiclo';
import type { ResumenMes } from '../../domain/entities/ResumenMes';
import type { ConsultarGastosPort } from '../../domain/ports/in/ConsultarGastosPort';
import type { GastoRepositorioPort } from '../../domain/ports/out/GastoRepositorioPort';
import type { HogarRepositorioPort } from '../../domain/ports/out/HogarRepositorioPort';
import type { MiembroRepositorioPort } from '../../domain/ports/out/MiembroRepositorioPort';
import { CicloReglas } from '../../domain/rules/CicloReglas';
import { NoEncontradoError, NoEsMiembroError } from '../../exception/errors';

export class ConsultarGastosUseCase implements ConsultarGastosPort {
  constructor(
    private readonly gastos: GastoRepositorioPort,
    private readonly miembros: MiembroRepositorioPort,
    private readonly hogares: HogarRepositorioPort,
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

  /** Resumen por mes calendario (compatibilidad con versiones anteriores). */
  async meses(input: { hogarId: string; usuarioId: string }): Promise<ResumenMes[]> {
    await this.validarMiembro(input.hogarId, input.usuarioId);
    return this.gastos.listarMeses(input.hogarId);
  }

  /** Resumen por ciclo configurable del hogar. */
  async ciclos(input: { hogarId: string; usuarioId: string }): Promise<ResumenCiclo[]> {
    await this.validarMiembro(input.hogarId, input.usuarioId);

    const hogar = await this.hogares.obtener(input.hogarId);
    if (!hogar) throw new NoEncontradoError('Hogar no encontrado');

    const fechas = await this.gastos.listarFechasMontos(input.hogarId);
    return CicloReglas.agrupar(fechas, hogar.cutoffDay);
  }

  private async validarMiembro(hogarId: string, usuarioId: string): Promise<void> {
    const miembro = await this.miembros.buscar(hogarId, usuarioId);
    if (!miembro) throw new NoEsMiembroError();
  }
}
