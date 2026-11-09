import { describe, expect, it, vi } from 'vitest';
import { GestionarHogarUseCase } from '../../src/application/usecases/GestionarHogarUseCase';
import type { Hogar } from '../../src/domain/entities/Hogar';
import type { Miembro } from '../../src/domain/entities/Miembro';
import type { HogarRepositorioPort } from '../../src/domain/ports/out/HogarRepositorioPort';
import type { MiembroRepositorioPort } from '../../src/domain/ports/out/MiembroRepositorioPort';
import type { PasswordHashPort } from '../../src/domain/ports/out/PasswordHashPort';

const hogar: Hogar = {
  id: 'h1',
  nombre: 'Casa',
  ownerId: 'u1',
  inviteCode: 'ANDRO-TEST',
  adminPasswordHash: 'hash',
  cutoffDay: 1,
  createdAt: '2026-10-01T00:00:00.000Z',
  plan: 'FREE',
};

function crearCaso(rol: 'ADMIN' | 'MIEMBRO') {
  const actualizarPasswordHash = vi.fn(async () => {});
  const actualizarCorte = vi.fn(async () => {});
  const actualizarPlan = vi.fn(async () => {});

  const hogares = {
    actualizarPasswordHash,
    actualizarCorte,
    actualizarPlan,
    obtener: async () => hogar,
  } as unknown as HogarRepositorioPort;

  const miembros = {
    buscar: async (): Promise<Miembro> => ({
      id: 'm1',
      hogarId: 'h1',
      usuarioId: 'u1',
      rol,
      acceso: 'ESCRITURA',
      joinedAt: '2026-10-30T00:00:00.000Z',
    }),
  } as unknown as MiembroRepositorioPort;

  const passwordHash = {
    hash: async () => 'hash',
  } as unknown as PasswordHashPort;

  return {
    useCase: new GestionarHogarUseCase(hogares, miembros, passwordHash),
    actualizarPasswordHash,
    actualizarCorte,
    actualizarPlan,
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

describe('GestionarHogarUseCase.configurarCorte', () => {
  it('rechaza a un miembro del hogar', async () => {
    const { useCase, actualizarCorte } = crearCaso('MIEMBRO');

    await expect(
      useCase.configurarCorte({ hogarId: 'h1', usuarioId: 'u1', cutoffDay: 29 }),
    ).rejects.toThrow('Solo el administrador con contraseña puede realizar esta acción');

    expect(actualizarCorte).not.toHaveBeenCalled();
  });

  it('permite al administrador configurar el día de corte', async () => {
    const { useCase, actualizarCorte } = crearCaso('ADMIN');

    const actualizado = await useCase.configurarCorte({
      hogarId: 'h1',
      usuarioId: 'u1',
      cutoffDay: 29,
    });

    expect(actualizarCorte).toHaveBeenCalledWith('h1', 29);
    expect(actualizado.cutoffDay).toBe(29);
  });

  it('rechaza un día inválido', async () => {
    const { useCase } = crearCaso('ADMIN');

    await expect(
      useCase.configurarCorte({ hogarId: 'h1', usuarioId: 'u1', cutoffDay: 32 }),
    ).rejects.toThrow('El día de corte debe estar entre 1 y 31');
  });
});

describe('GestionarHogarUseCase.configurarPlan', () => {
  it('solo lo puede hacer un administrador', async () => {
    const { useCase, actualizarPlan } = crearCaso('MIEMBRO');

    await expect(
      useCase.configurarPlan({ hogarId: 'h1', usuarioId: 'u1', plan: 'PREMIUM' }),
    ).rejects.toThrow('Solo el administrador con contraseña puede realizar esta acción');

    expect(actualizarPlan).not.toHaveBeenCalled();
  });

  it('marca el hogar como premium', async () => {
    const { useCase, actualizarPlan } = crearCaso('ADMIN');

    const actualizado = await useCase.configurarPlan({
      hogarId: 'h1',
      usuarioId: 'u1',
      plan: 'PREMIUM',
    });

    expect(actualizarPlan).toHaveBeenCalledWith('h1', 'PREMIUM');
    expect(actualizado.plan).toBe('PREMIUM');
  });

  it('puede volver a gratis', async () => {
    const { useCase, actualizarPlan } = crearCaso('ADMIN');

    const actualizado = await useCase.configurarPlan({
      hogarId: 'h1',
      usuarioId: 'u1',
      plan: 'FREE',
    });

    expect(actualizarPlan).toHaveBeenCalledWith('h1', 'FREE');
    expect(actualizado.plan).toBe('FREE');
  });
});
