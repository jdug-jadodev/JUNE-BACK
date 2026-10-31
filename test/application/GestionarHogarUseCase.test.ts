import { describe, expect, it, vi } from 'vitest';
import { GestionarHogarUseCase } from '../../src/application/usecases/GestionarHogarUseCase';
import type { Miembro } from '../../src/domain/entities/Miembro';
import type { HogarRepositorioPort } from '../../src/domain/ports/out/HogarRepositorioPort';
import type { MiembroRepositorioPort } from '../../src/domain/ports/out/MiembroRepositorioPort';
import type { PasswordHashPort } from '../../src/domain/ports/out/PasswordHashPort';

function crearCaso(rol: 'ADMIN' | 'MIEMBRO') {
  const actualizarPasswordHash = vi.fn(async () => {});

  const hogares = {
    actualizarPasswordHash,
  } as unknown as HogarRepositorioPort;

  const miembros = {
    buscar: async (): Promise<Miembro> => ({
      id: 'm1',
      hogarId: 'h1',
      usuarioId: 'u1',
      rol,
      joinedAt: '2026-10-30T00:00:00.000Z',
    }),
  } as unknown as MiembroRepositorioPort;

  const passwordHash = {
    hash: async () => 'hash',
  } as unknown as PasswordHashPort;

  return {
    useCase: new GestionarHogarUseCase(hogares, miembros, passwordHash),
    actualizarPasswordHash,
  };
}

describe('GestionarHogarUseCase.configurarPassword', () => {
  it('rechaza a un miembro del hogar', async () => {
    const { useCase, actualizarPasswordHash } = crearCaso('MIEMBRO');

    await expect(
      useCase.configurarPassword({ hogarId: 'h1', usuarioId: 'u1', password: 'clave12345' }),
    ).rejects.toThrow('Solo el administrador con contraseña puede realizar esta acción');

    expect(actualizarPasswordHash).not.toHaveBeenCalled();
  });

  it('permite al administrador cambiar la contraseña', async () => {
    const { useCase, actualizarPasswordHash } = crearCaso('ADMIN');

    await useCase.configurarPassword({ hogarId: 'h1', usuarioId: 'u1', password: 'clave12345' });

    expect(actualizarPasswordHash).toHaveBeenCalledWith('h1', 'hash');
  });
});
