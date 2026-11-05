import { describe, expect, it, vi } from 'vitest';
import { GestionarCategoriasUseCase } from '../../src/application/usecases/GestionarCategoriasUseCase';
import type { CategoriaPersonalizada } from '../../src/domain/entities/CategoriaPersonalizada';
import type { Miembro } from '../../src/domain/entities/Miembro';
import type { CategoriaPersonalizadaRepositorioPort } from '../../src/domain/ports/out/CategoriaPersonalizadaRepositorioPort';
import type { MiembroRepositorioPort } from '../../src/domain/ports/out/MiembroRepositorioPort';

const miembro: Miembro = {
  id: 'm1',
  hogarId: 'h1',
  usuarioId: 'u1',
  nombre: 'Admin',
  email: 'admin@test.com',
  rol: 'ADMIN',
  acceso: 'ESCRITURA',
  joinedAt: '2026-01-01T00:00:00.000Z',
};

function crearCaso(
  acceso: Miembro['acceso'] = 'ESCRITURA',
  existentes: CategoriaPersonalizada[] = [],
) {
  const miembros = {
    buscar: vi.fn(async () => ({ ...miembro, acceso })),
  } as unknown as MiembroRepositorioPort;

  const crear = vi.fn(async () => undefined);
  const categorias = {
    listar: vi.fn(async () => existentes),
    obtener: vi.fn(async () => null),
    crear,
  } as unknown as CategoriaPersonalizadaRepositorioPort;

  return {
    useCase: new GestionarCategoriasUseCase(miembros, categorias),
    crear,
  };
}

describe('GestionarCategoriasUseCase', () => {
  it('crea una categoría con prefijo cat:', async () => {
    const { useCase, crear } = crearCaso();
    const categoria = await useCase.crear({
      hogarId: 'h1',
      usuarioId: 'u1',
      nombre: '  Clases de los niños  ',
    });

    expect(categoria).toMatchObject({
      nombre: 'Clases de los niños',
      categoria: expect.stringMatching(/^cat:/),
      categoriaNombre: 'Personalizada',
      esGusto: false,
    });
    expect(crear).toHaveBeenCalledWith(
      expect.objectContaining({ hogarId: 'h1', nombre: 'Clases de los niños', tipo: 'VARIABLE' }),
    );
  });

  it('rechaza nombres repetidos sin importar tildes o mayúsculas', async () => {
    const { useCase, crear } = crearCaso('ESCRITURA', [
      {
        id: 'cat:abc',
        hogarId: 'h1',
        nombre: 'Educación',
        tipo: 'VARIABLE',
        esGusto: false,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    await expect(
      useCase.crear({ hogarId: 'h1', usuarioId: 'u1', nombre: 'educacion' }),
    ).rejects.toMatchObject({ code: 'CONFLICTO' });
    expect(crear).not.toHaveBeenCalled();
  });

  it('rechaza miembros de solo lectura', async () => {
    const { useCase } = crearCaso('LECTURA');
    await expect(
      useCase.crear({ hogarId: 'h1', usuarioId: 'u1', nombre: 'Viajes' }),
    ).rejects.toMatchObject({ code: 'SOLO_LECTURA' });
  });

  it('lista las categorías del hogar', async () => {
    const { useCase } = crearCaso('LECTURA', [
      {
        id: 'cat:abc',
        hogarId: 'h1',
        nombre: 'Viajes',
        tipo: 'VARIABLE',
        esGusto: false,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    await expect(useCase.listar({ hogarId: 'h1', usuarioId: 'u1' })).resolves.toEqual([
      {
        id: 'cat:abc',
        nombre: 'Viajes',
        categoria: 'cat:abc',
        categoriaNombre: 'Personalizada',
        esGusto: false,
      },
    ]);
  });
});
