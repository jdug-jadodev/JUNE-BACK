import type { Gasto } from '../../domain/entities/Gasto';
import { GastoFactory } from '../../domain/factories/GastoFactory';
import type { RegistrarGastoPort } from '../../domain/ports/in/RegistrarGastoPort';
import type { GastoRepositorioPort } from '../../domain/ports/out/GastoRepositorioPort';
import type { MiembroRepositorioPort } from '../../domain/ports/out/MiembroRepositorioPort';
import type { UsuarioRepositorioPort } from '../../domain/ports/out/UsuarioRepositorioPort';
import { NoEsMiembroError } from '../../exception/errors';

export class RegistrarGastoUseCase implements RegistrarGastoPort {
  constructor(
    private readonly gastos: GastoRepositorioPort,
    private readonly miembros: MiembroRepositorioPort,
    private readonly usuarios: UsuarioRepositorioPort,
  ) {}

  async ejecutar(input: {
    hogarId: string;
    usuarioId: string;
    producto: string;
    montoCents: number;
    fecha: string;
  }): Promise<Gasto> {
    const miembro = await this.miembros.buscar(input.hogarId, input.usuarioId);
    if (!miembro) throw new NoEsMiembroError();

    const usuario = await this.usuarios.buscarPorId(input.usuarioId);

    const gasto = GastoFactory.nuevo({
      hogarId: input.hogarId,
      producto: input.producto,
      montoCents: input.montoCents,
      fecha: input.fecha,
      usuarioId: input.usuarioId,
      usuarioNombre: usuario?.nombre ?? 'Miembro',
    });

    return this.gastos.crear(gasto);
  }
}
