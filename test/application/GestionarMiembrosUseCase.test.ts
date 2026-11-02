import { describe, expect, it, vi } from 'vitest';
import { GestionarMiembrosUseCase } from '../../src/application/usecases/GestionarMiembrosUseCase';
import type { Hogar } from '../../src/domain/entities/Hogar';
import type { Miembro } from '../../src/domain/entities/Miembro';
import type { HogarRepositorioPort } from '../../src/domain/ports/out/HogarRepositorioPort';
import type { MiembroRepositorioPort } from '../../src/domain/ports/out/MiembroRepositorioPort';
import type { PasswordHashPort } from '../../src/domain/ports/out/PasswordHashPort';
import type { RefreshTokenRepositorioPort } from '../../src/domain/ports/out/RefreshTokenRepositorioPort';
import type { UsuarioRepositorioPort } from '../../src/domain/ports/out/UsuarioRepositorioPort';

const admin: Miembro = {
  id: 'm1',
  hogarId: 'h1',
  usuarioId: 'u1',
  nombre: 'Admin',
  email: 'admin@test.com',
  rol: 'ADMIN',
  acceso: 'ESCRITURA',
  joinedAt: '2026-10-01T00:00:00.000Z',
};

const miembro: Miembro = {
  id: 'm2',
  hogarId: 'h1',
  usuarioId: 'u2',
  nombre: 'Miembro',
  email: 'miembro@test.com',
  rol: 'MIEMBRO',
  acceso: 'ESCRITURA',
  joinedAt: '2026-10-02T00:00:00.000Z',
};

function crearCaso(solicitante: Miembro) {
  const actualizarAcceso = vi.fn(async () => {});
  const actualizarRol = vi.fn(async () => {});
  const actualizarPasswordHash = vi.fn(async () => {});
  const actualizarIntentoReset = vi.fn(async () => {});
  const eliminarPorUsuario = vi.fn(async () => {});

  const miembros = {
    buscar: async () => solicitante,
    listar: async () => [admin, miembro],
    actualizarAcceso,
    actualizarRol,
  } as unknown as MiembroRepositorioPort;

  const hogar: Hogar = {
    id: 'h1',
    nombre: 'Casa',
    ownerId: 'u1',
    inviteCode: 'ANDRO-TEST',
    adminPasswordHash: 'hash',
    cutoffDay: 1,
    createdAt: '2026-10-01T00:00:00.000Z',
  };
  const hogares = {
    obtener: async () => hogar,
  } as unknown as HogarRepositorioPort;

  const usuarios = {
    actualizarPasswordHash,
    actualizarIntentoReset,
  } as unknown as UsuarioRepositorioPort;

  const passwordHash = {
    hash: async () => 'hash-temporal',
  } as unknown as PasswordHashPort;

  const refreshTokens = {
    eliminarPorUsuario,
  } as unknown as RefreshTokenRepositorioPort;

  return {
    useCase: new GestionarMiembrosUseCase(
      miembros,
      hogares,
      usuarios,
      passwordHash,
      refreshTokens,
    ),
    actualizarAcceso,
    actualizarRol,
    actualizarPasswordHash,
    actualizarIntentoReset,
    eliminarPorUsuario,
  };
}

describe('GestionarMiembrosUseCase.cambiarAcceso', () => {
  it('permite al administrador poner a un miembro en solo lectura', async () => {
    const { useCase, actualizarAcceso } = crearCaso(admin);

    await useCase.cambiarAcceso({
      hogarId: 'h1',
      miembroId: 'm2',
      usuarioId: 'u1',
      acceso: 'LECTURA',
    });

    expect(actualizarAcceso).toHaveBeenCalledWith('m2', 'LECTURA');
  });

  it('rechaza a un miembro que intente cambiar permisos', async () => {
    const { useCase, actualizarAcceso } = crearCaso(miembro);

    await expect(
      useCase.cambiarAcceso({
        hogarId: 'h1',
        miembroId: 'm2',
        usuarioId: 'u2',
        acceso: 'LECTURA',
      }),
    ).rejects.toThrow('Solo el administrador con contraseña puede realizar esta acción');

    expect(actualizarAcceso).not.toHaveBeenCalled();
  });

  it('no permite cambiar el acceso del administrador', async () => {
    const { useCase, actualizarAcceso } = crearCaso(admin);

    await expect(
      useCase.cambiarAcceso({
        hogarId: 'h1',
        miembroId: 'm1',
        usuarioId: 'u1',
        acceso: 'LECTURA',
      }),
    ).rejects.toThrow('El administrador siempre puede escribir');

    expect(actualizarAcceso).not.toHaveBeenCalled();
  });
});

describe('GestionarMiembrosUseCase.restablecerPassword', () => {
  it('genera una temporal y cierra las sesiones del miembro', async () => {
    const { useCase, actualizarPasswordHash, actualizarIntentoReset, eliminarPorUsuario } =
      crearCaso(admin);

    const temporal = await useCase.restablecerPassword({
      hogarId: 'h1',
      miembroId: 'm2',
      usuarioId: 'u1',
    });

    expect(temporal).toMatch(/^Cauce-/);
    expect(actualizarPasswordHash).toHaveBeenCalledWith('u2', 'hash-temporal');
    expect(actualizarIntentoReset).toHaveBeenCalledWith('u2', 0, null);
    expect(eliminarPorUsuario).toHaveBeenCalledWith('u2');
  });
});

describe('GestionarMiembrosUseCase.cambiarRol', () => {
  it('permite al administrador promover a un miembro', async () => {
    const { useCase, actualizarRol, actualizarAcceso } = crearCaso(admin);

    await useCase.cambiarRol({
      hogarId: 'h1',
      miembroId: 'm2',
      usuarioId: 'u1',
      rol: 'ADMIN',
    });

    expect(actualizarRol).toHaveBeenCalledWith('m2', 'ADMIN');
    expect(actualizarAcceso).toHaveBeenCalledWith('m2', 'ESCRITURA');
  });

  it('no permite que un miembro cambie roles', async () => {
    const { useCase, actualizarRol } = crearCaso(miembro);

    await expect(
      useCase.cambiarRol({
        hogarId: 'h1',
        miembroId: 'm2',
        usuarioId: 'u2',
        rol: 'ADMIN',
      }),
    ).rejects.toThrow('Solo el administrador con contraseña puede realizar esta acción');

    expect(actualizarRol).not.toHaveBeenCalled();
  });
});
