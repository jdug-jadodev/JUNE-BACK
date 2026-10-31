import { describe, expect, it, vi } from 'vitest';
import { ConsultarGastosUseCase } from '../../src/application/usecases/ConsultarGastosUseCase';
import type { Miembro } from '../../src/domain/entities/Miembro';
import type { ResumenMes } from '../../src/domain/entities/ResumenMes';
import type { GastoRepositorioPort } from '../../src/domain/ports/out/GastoRepositorioPort';
import type { MiembroRepositorioPort } from '../../src/domain/ports/out/MiembroRepositorioPort';

const miembro: Miembro = {
  id: 'm1',
  hogarId: 'h1',
  usuarioId: 'u1',
  rol: 'ADMIN',
  joinedAt: '2026-10-01T00:00:00.000Z',
};

function dependencias(esMiembro: boolean) {
  const listar = vi.fn().mockResolvedValue([]);
  const listarMeses = vi.fn().mockResolvedValue([] as ResumenMes[]);

  const gastos = { listar, listarMeses } as unknown as GastoRepositorioPort;
  const miembros = {
    buscar: async () => (esMiembro ? miembro : null),
  } as unknown as MiembroRepositorioPort;

  return { gastos, miembros, listar, listarMeses };
}

describe('ConsultarGastosUseCase', () => {
  it('pasa el rango de fechas y updatedAfter al repositorio', async () => {
    const { gastos, miembros, listar } = dependencias(true);
    const useCase = new ConsultarGastosUseCase(gastos, miembros);

    await useCase.ejecutar({
      hogarId: 'h1',
      usuarioId: 'u1',
      desde: '2026-10-01',
      hasta: '2026-10-31',
      updatedAfter: '2026-10-30T00:00:00.000Z',
    });

    expect(listar).toHaveBeenCalledWith('h1', {
      desde: '2026-10-01',
      hasta: '2026-10-31',
      updatedAfter: '2026-10-30T00:00:00.000Z',
    });
  });

  it('rechaza a quien no pertenece al hogar', async () => {
    const { gastos, miembros, listar } = dependencias(false);
    const useCase = new ConsultarGastosUseCase(gastos, miembros);

    await expect(
      useCase.ejecutar({ hogarId: 'h1', usuarioId: 'intruso' }),
    ).rejects.toThrow('No perteneces a este hogar');
    expect(listar).not.toHaveBeenCalled();
  });

  it('devuelve el resumen de meses del hogar', async () => {
    const { gastos, miembros, listarMeses } = dependencias(true);
    const resumen: ResumenMes[] = [
      { mes: '2026-10', cantidad: 2, totalCents: 4000 },
    ];
    listarMeses.mockResolvedValue(resumen);
    const useCase = new ConsultarGastosUseCase(gastos, miembros);

    await expect(
      useCase.meses({ hogarId: 'h1', usuarioId: 'u1' }),
    ).resolves.toEqual(resumen);
  });
});
