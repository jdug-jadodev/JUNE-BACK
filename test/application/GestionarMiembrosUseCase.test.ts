import { describe, expect, it, vi } from 'vitest';
import { GestionarMiembrosUseCase } from '../../src/application/usecases/GestionarMiembrosUseCase';
import type { Miembro } from '../../src/domain/entities/Miembro';
import type { HogarRepositorioPort } from '../../src/domain/ports/out/HogarRepositorioPort';
import type { MiembroRepositorioPort } from '../../src/domain/ports/out/MiembroRepositorioPort';

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

  const miembros = {
    buscar: async () => solicitante,
    listar: async () => [admin, miembro],
    actualizarAcceso,
  } as unknown as MiembroRepositorioPort;

  const hogares = {} as unknown as HogarRepositorioPort;

  return {
    useCase: new GestionarMiembrosUseCase(miembros, hogares),
    actualizarAcceso,
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
