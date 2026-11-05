import { describe, expect, it, vi } from 'vitest';
import { ClasificarTerminoUseCase } from '../../src/application/usecases/ClasificarTerminoUseCase';
import type { Miembro } from '../../src/domain/entities/Miembro';
import type { CategoriaPersonalizadaRepositorioPort } from '../../src/domain/ports/out/CategoriaPersonalizadaRepositorioPort';
import type { ClasificacionRepositorioPort } from '../../src/domain/ports/out/ClasificacionRepositorioPort';
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

function crearCaso(acceso: Miembro['acceso'] = 'ESCRITURA') {
  const miembros = {
    buscar: vi.fn(async () => ({ ...miembro, acceso })),
  } as unknown as MiembroRepositorioPort;

  const guardar = vi.fn(async () => undefined);
  const clasificaciones = {
    listar: vi.fn(async () => []),
    guardar,
  } as unknown as ClasificacionRepositorioPort;

  const categorias = {
    listar: vi.fn(async () => []),
    obtener: vi.fn(async (_hogarId: string, id: string) =>
      id === 'cat:abc'
        ? {
            id: 'cat:abc',
            hogarId: 'h1',
            nombre: 'Clases de los niños',
            tipo: 'VARIABLE',
            esGusto: false,
            createdAt: '2026-01-01T00:00:00.000Z',
          }
        : null,
    ),
    crear: vi.fn(async () => undefined),
  } as unknown as CategoriaPersonalizadaRepositorioPort;

  return {
    useCase: new ClasificarTerminoUseCase(miembros, clasificaciones, categorias),
    guardar,
  };
}

describe('ClasificarTerminoUseCase', () => {
  it('normaliza el término y guarda la corrección con su nota', async () => {
    const { useCase, guardar } = crearCaso();
    const resultado = await useCase.ejecutar({
      hogarId: 'h1',
      usuarioId: 'u1',
      termino: 'Mamá de Ángel',
      conceptoId: 'ayuda_familiar',
      nota: '  pago mensual a mi suegra  ',
    });

    expect(resultado).toEqual({
      termino: 'mama de angel',
      conceptoId: 'ayuda_familiar',
      nombre: 'Ayuda a familiares',
      nota: 'pago mensual a mi suegra',
    });
    expect(guardar).toHaveBeenCalledWith({
      hogarId: 'h1',
      termino: 'mama de angel',
      conceptoId: 'ayuda_familiar',
      nota: 'pago mensual a mi suegra',
    });
  });

  it('acepta correcciones sin descripción', async () => {
    const { useCase, guardar } = crearCaso();
    await useCase.ejecutar({
      hogarId: 'h1',
      usuarioId: 'u1',
      termino: 'ias',
      conceptoId: 'streaming',
    });

    expect(guardar).toHaveBeenCalledWith(
      expect.objectContaining({ termino: 'ias', conceptoId: 'streaming', nota: null }),
    );
  });

  it('acepta categorías personalizadas del hogar', async () => {
    const { useCase, guardar } = crearCaso();
    const resultado = await useCase.ejecutar({
      hogarId: 'h1',
      usuarioId: 'u1',
      termino: 'clases de piano',
      conceptoId: 'cat:abc',
    });

    expect(resultado).toMatchObject({
      conceptoId: 'cat:abc',
      nombre: 'Clases de los niños',
    });
    expect(guardar).toHaveBeenCalledWith(
      expect.objectContaining({ conceptoId: 'cat:abc', termino: 'clases de piano' }),
    );
  });

  it('rechaza categorías personalizadas de otro hogar', async () => {
    const { useCase, guardar } = crearCaso();
    await expect(
      useCase.ejecutar({
        hogarId: 'h1',
        usuarioId: 'u1',
        termino: 'clases de piano',
        conceptoId: 'cat:otro',
      }),
    ).rejects.toMatchObject({ code: 'CONCEPTO_INVALIDO' });
    expect(guardar).not.toHaveBeenCalled();
  });

  it('rechaza miembros de solo lectura', async () => {
    const { useCase } = crearCaso('LECTURA');
    await expect(
      useCase.ejecutar({
        hogarId: 'h1',
        usuarioId: 'u1',
        termino: 'ias',
        conceptoId: 'streaming',
      }),
    ).rejects.toMatchObject({ code: 'SOLO_LECTURA' });
  });

  it('rechaza conceptos que no existen', async () => {
    const { useCase, guardar } = crearCaso();
    await expect(
      useCase.ejecutar({
        hogarId: 'h1',
        usuarioId: 'u1',
        termino: 'ias',
        conceptoId: 'inventado',
      }),
    ).rejects.toMatchObject({ code: 'CONCEPTO_INVALIDO' });
    expect(guardar).not.toHaveBeenCalled();
  });
});
