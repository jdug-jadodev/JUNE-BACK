import { describe, expect, it, vi } from 'vitest';
import { RegistrarGastoUseCase } from '../../src/application/usecases/RegistrarGastoUseCase';
import type { GastoRepositorioPort } from '../../src/domain/ports/out/GastoRepositorioPort';
import type { MiembroRepositorioPort } from '../../src/domain/ports/out/MiembroRepositorioPort';
import type { UsuarioRepositorioPort } from '../../src/domain/ports/out/UsuarioRepositorioPort';
import type { Miembro } from '../../src/domain/entities/Miembro';

function crearCaso(acceso: 'LECTURA' | 'ESCRITURA') {
  const crear = vi.fn(async (gasto) => gasto);

  const gastos = { crear } as unknown as GastoRepositorioPort;

  const miembro: Miembro = {
    id: 'm2',
    hogarId: 'h1',
    usuarioId: 'u2',
    rol: 'MIEMBRO',
    acceso,
    joinedAt: '2026-10-02T00:00:00.000Z',
  };

  const miembros = {
    buscar: async () => miembro,
  } as unknown as MiembroRepositorioPort;

  const usuarios = {
    buscarPorId: async () => ({ id: 'u2', nombre: 'Miembro', email: 'm@test.com' }),
  } as unknown as UsuarioRepositorioPort;

  return {
    useCase: new RegistrarGastoUseCase(gastos, miembros, usuarios),
    crear,
  };
}

describe('RegistrarGastoUseCase permisos', () => {
  it('bloquea a un miembro en solo lectura', async () => {
    const { useCase, crear } = crearCaso('LECTURA');

    await expect(
      useCase.ejecutar({
        hogarId: 'h1',
        usuarioId: 'u2',
        producto: 'Arroz',
        montoCents: 1000,
        fecha: '2026-11-02',
      }),
    ).rejects.toThrow('Tu acceso es de solo lectura');

    expect(crear).not.toHaveBeenCalled();
  });

  it('permite registrar a un miembro con escritura', async () => {
    const { useCase, crear } = crearCaso('ESCRITURA');

    await useCase.ejecutar({
      hogarId: 'h1',
      usuarioId: 'u2',
      producto: 'Arroz',
      montoCents: 1000,
      fecha: '2026-11-02',
    });

    expect(crear).toHaveBeenCalled();
  });
});
