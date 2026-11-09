import { describe, expect, it, vi } from 'vitest';
import { GestionarIngresosUseCase } from '../../src/application/usecases/GestionarIngresosUseCase';
import type { Ingreso } from '../../src/domain/entities/Ingreso';
import type { Miembro } from '../../src/domain/entities/Miembro';
import type { IngresoRepositorioPort } from '../../src/domain/ports/out/IngresoRepositorioPort';
import type { MiembroRepositorioPort } from '../../src/domain/ports/out/MiembroRepositorioPort';

const admin: Miembro = {
  id: 'm1',
  hogarId: 'h1',
  usuarioId: 'u1',
  nombre: 'Admin',
  email: 'admin@test.com',
  rol: 'ADMIN',
  acceso: 'ESCRITURA',
  joinedAt: '2026-01-01T00:00:00.000Z',
};

function crearCaso(rol: 'ADMIN' | 'MIEMBRO' = 'ADMIN', existentes: Ingreso[] = []) {
  const miembros = {
    buscar: vi.fn(async () => ({ ...admin, rol })),
  } as unknown as MiembroRepositorioPort;

  const crear = vi.fn(async () => undefined);
  const actualizar = vi.fn(async () => undefined);
  const eliminar = vi.fn(async () => undefined);
  const ingresos = {
    listar: vi.fn(async () => existentes),
    obtener: vi.fn(async (id: string) => existentes.find((i) => i.id === id) ?? null),
    crear,
    actualizar,
    eliminar,
  } as unknown as IngresoRepositorioPort;

  return {
    useCase: new GestionarIngresosUseCase(miembros, ingresos),
    crear,
    actualizar,
    eliminar,
  };
}

describe('GestionarIngresosUseCase', () => {
  it('solo el administrador puede crear', async () => {
    const { useCase, crear } = crearCaso('MIEMBRO');

    await expect(
      useCase.crear({ hogarId: 'h1', usuarioId: 'u1', montoCents: 1_000_000, periodicidad: 'MENSUAL' }),
    ).rejects.toThrow('Solo el administrador con contraseña puede realizar esta acción');

    expect(crear).not.toHaveBeenCalled();
  });

  it('crea un ingreso mensual con etiqueta', async () => {
    const { useCase, crear } = crearCaso();

    const ingreso = await useCase.crear({
      hogarId: 'h1',
      usuarioId: 'u1',
      nombre: '  Sueldo  ',
      montoCents: 2_000_000,
      periodicidad: 'MENSUAL',
    });

    expect(ingreso).toMatchObject({
      hogarId: 'h1',
      nombre: 'Sueldo',
      montoCents: 2_000_000,
      periodicidad: 'MENSUAL',
    });
    expect(crear).toHaveBeenCalledWith(expect.objectContaining({ hogarId: 'h1' }));
  });

  it('rechaza montos inválidos y periodicidad inválida', async () => {
    const { useCase } = crearCaso();

    await expect(
      useCase.crear({ hogarId: 'h1', usuarioId: 'u1', montoCents: 0, periodicidad: 'MENSUAL' }),
    ).rejects.toMatchObject({ code: 'INGRESO_INVALIDO' });

    await expect(
      useCase.crear({ hogarId: 'h1', usuarioId: 'u1', montoCents: 1000, periodicidad: 'SEMANAL' as never }),
    ).rejects.toMatchObject({ code: 'INGRESO_INVALIDO' });
  });

  it('lista los ingresos del hogar', async () => {
    const existentes: Ingreso[] = [
      {
        id: 'i1',
        hogarId: 'h1',
        nombre: 'Sueldo',
        montoCents: 1_000_000,
        periodicidad: 'QUINCENAL',
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
      },
    ];
    const { useCase } = crearCaso('ADMIN', existentes);

    await expect(useCase.listar({ hogarId: 'h1', usuarioId: 'u1' })).resolves.toEqual(existentes);
  });

  it('actualiza un ingreso existente', async () => {
    const existentes: Ingreso[] = [
      {
        id: 'i1',
        hogarId: 'h1',
        nombre: 'Sueldo',
        montoCents: 1_000_000,
        periodicidad: 'MENSUAL',
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
      },
    ];
    const { useCase, actualizar } = crearCaso('ADMIN', existentes);

    const actualizado = await useCase.actualizar({
      hogarId: 'h1',
      usuarioId: 'u1',
      ingresoId: 'i1',
      montoCents: 1_500_000,
      periodicidad: 'QUINCENAL',
    });

    expect(actualizado.montoCents).toBe(1_500_000);
    expect(actualizado.periodicidad).toBe('QUINCENAL');
    expect(actualizar).toHaveBeenCalled();
  });

  it('elimina un ingreso del hogar', async () => {
    const existentes: Ingreso[] = [
      {
        id: 'i1',
        hogarId: 'h1',
        nombre: null,
        montoCents: 1_000_000,
        periodicidad: 'MENSUAL',
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
      },
    ];
    const { useCase, eliminar } = crearCaso('ADMIN', existentes);

    await useCase.eliminar({ hogarId: 'h1', usuarioId: 'u1', ingresoId: 'i1' });
    expect(eliminar).toHaveBeenCalledWith('i1');
  });

  it('no puede eliminar un ingreso de otro hogar', async () => {
    const existentes: Ingreso[] = [
      {
        id: 'i1',
        hogarId: 'h2',
        nombre: null,
        montoCents: 1_000_000,
        periodicidad: 'MENSUAL',
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
      },
    ];
    const { useCase, eliminar } = crearCaso('ADMIN', existentes);

    await expect(
      useCase.eliminar({ hogarId: 'h1', usuarioId: 'u1', ingresoId: 'i1' }),
    ).rejects.toMatchObject({ code: 'NO_ENCONTRADO' });
    expect(eliminar).not.toHaveBeenCalled();
  });
});
