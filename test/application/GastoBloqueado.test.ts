import { describe, expect, it } from 'vitest';
import { ActualizarGastoUseCase } from '../../src/application/usecases/ActualizarGastoUseCase';
import { EliminarGastoUseCase } from '../../src/application/usecases/EliminarGastoUseCase';
import type { Gasto } from '../../src/domain/entities/Gasto';
import type { Hogar } from '../../src/domain/entities/Hogar';
import type { Miembro } from '../../src/domain/entities/Miembro';
import type { GastoRepositorioPort } from '../../src/domain/ports/out/GastoRepositorioPort';
import type { HogarRepositorioPort } from '../../src/domain/ports/out/HogarRepositorioPort';
import type { MiembroRepositorioPort } from '../../src/domain/ports/out/MiembroRepositorioPort';
import type { PasswordHashPort } from '../../src/domain/ports/out/PasswordHashPort';
import { GastoBloqueadoError } from '../../src/exception/errors';

const gastoAgosto: Gasto = {
  id: 'g1',
  hogarId: 'h1',
  producto: 'Pan',
  montoCents: 700_000,
  fecha: '2026-08-27',
  creadoPor: 'u1',
  creadoPorNombre: 'Andres',
  createdAt: '2026-08-27T12:00:00.000Z',
  updatedAt: '2026-08-27T12:00:00.000Z',
};

function crearDependencias() {
  const gastos = {
    obtener: async () => gastoAgosto,
    actualizar: async () => gastoAgosto,
    eliminar: async () => {},
  } as unknown as GastoRepositorioPort;

  const miembros = {
    buscar: async (): Promise<Miembro> => ({
      id: 'm1',
      hogarId: 'h1',
      usuarioId: 'u1',
      rol: 'ADMIN',
      acceso: 'ESCRITURA',
      joinedAt: '2026-08-01T00:00:00.000Z',
    }),
  } as unknown as MiembroRepositorioPort;

  const hogares = {
    obtener: async (): Promise<Hogar> => ({
      id: 'h1',
      nombre: 'Casa',
      ownerId: 'u1',
      inviteCode: 'ANDRO-TEST',
      adminPasswordHash: 'hash',
      cutoffDay: 1,
      createdAt: '2026-08-01T00:00:00.000Z',
    }),
  } as unknown as HogarRepositorioPort;

  const passwordHash = {
    verificar: async () => true,
  } as unknown as PasswordHashPort;

  return { gastos, miembros, hogares, passwordHash };
}

describe('bloqueo de meses anteriores', () => {
  it('no elimina un gasto de agosto', async () => {
    const { gastos, miembros, hogares, passwordHash } = crearDependencias();
    const useCase = new EliminarGastoUseCase(gastos, miembros, hogares, passwordHash);

    await expect(
      useCase.ejecutar({
        hogarId: 'h1',
        gastoId: 'g1',
        usuarioId: 'u1',
        adminPassword: 'x',
      }),
    ).rejects.toBeInstanceOf(GastoBloqueadoError);
  });

  it('no actualiza un gasto de agosto', async () => {
    const { gastos, miembros, hogares, passwordHash } = crearDependencias();
    const useCase = new ActualizarGastoUseCase(gastos, miembros, hogares, passwordHash);

    await expect(
      useCase.ejecutar({
        hogarId: 'h1',
        gastoId: 'g1',
        usuarioId: 'u1',
        adminPassword: 'x',
        producto: 'X',
        montoCents: 1000,
        fecha: '2026-08-27',
      }),
    ).rejects.toBeInstanceOf(GastoBloqueadoError);
  });
});
