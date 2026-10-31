import type { Gasto } from '../../domain/entities/Gasto';
import type { ActualizarGastoPort } from '../../domain/ports/in/ActualizarGastoPort';
import type { GastoRepositorioPort } from '../../domain/ports/out/GastoRepositorioPort';
import type { HogarRepositorioPort } from '../../domain/ports/out/HogarRepositorioPort';
import type { MiembroRepositorioPort } from '../../domain/ports/out/MiembroRepositorioPort';
import type { PasswordHashPort } from '../../domain/ports/out/PasswordHashPort';
import { GastoReglas } from '../../domain/rules/GastoReglas';
import { GastoBloqueadoError, NoEncontradoError } from '../../exception/errors';
import { validarAdmin } from './helpers/validarAdmin';

export class ActualizarGastoUseCase implements ActualizarGastoPort {
  constructor(
    private readonly gastos: GastoRepositorioPort,
    private readonly miembros: MiembroRepositorioPort,
    private readonly hogares: HogarRepositorioPort,
    private readonly passwordHash: PasswordHashPort,
  ) {}

  async ejecutar(input: {
    hogarId: string;
    gastoId: string;
    usuarioId: string;
    adminPassword: string;
    producto: string;
    montoCents: number;
    fecha: string;
  }): Promise<Gasto> {
    await validarAdmin({
      hogarId: input.hogarId,
      usuarioId: input.usuarioId,
      adminPassword: input.adminPassword,
      miembroRepo: this.miembros,
      hogarRepo: this.hogares,
      passwordHash: this.passwordHash,
    });

    const existente = await this.gastos.obtener(input.gastoId);
    if (!existente || existente.hogarId !== input.hogarId) {
      throw new NoEncontradoError('Gasto no encontrado');
    }

    if (!GastoReglas.esMesActual(existente.fecha)) {
      throw new GastoBloqueadoError();
    }

    GastoReglas.validar(input.producto, input.montoCents, input.fecha);

    const actualizado: Gasto = {
      ...existente,
      producto: input.producto.trim(),
      montoCents: input.montoCents,
      fecha: input.fecha,
      updatedAt: new Date().toISOString(),
    };

    return this.gastos.actualizar(actualizado);
  }
}
