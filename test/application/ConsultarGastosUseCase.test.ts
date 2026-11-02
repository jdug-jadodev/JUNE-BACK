import { describe, expect, it, vi } from 'vitest';
import { ConsultarGastosUseCase } from '../../src/application/usecases/ConsultarGastosUseCase';
import type { Hogar } from '../../src/domain/entities/Hogar';
import type { Miembro } from '../../src/domain/entities/Miembro';
import type { ResumenMes } from '../../src/domain/entities/ResumenMes';
import type { GastoRepositorioPort } from '../../src/domain/ports/out/GastoRepositorioPort';
import type { HogarRepositorioPort } from '../../src/domain/ports/out/HogarRepositorioPort';
import type { MiembroRepositorioPort } from '../../src/domain/ports/out/MiembroRepositorioPort';

const miembro: Miembro = {
  id: 'm1',
  hogarId: 'h1',
  usuarioId: 'u1',
  rol: 'ADMIN',
  joinedAt: '2026-10-01T00:00:00.000Z',
};

const hogar: Hogar = {
  id: 'h1',
  nombre: 'Casa',
  ownerId: 'u1',
  inviteCode: 'ANDRO-TEST',
  adminPasswordHash: 'hash',
  cutoffDay: 29,
  createdAt: '2026-10-01T00:00:00.000Z',
};

function dependencias(esMiembro: boolean) {
  const listar = vi.fn().mockResolvedValue([]);
  const listarMeses = vi.fn().mockResolvedValue([] as ResumenMes[]);
  const listarFechasMontos = vi.fn().mockResolvedValue([]);

  const gastos = {
    listar,
    listarMeses,
    listarFechasMontos,
  } as unknown as GastoRepositorioPort;
  const miembros = {
    buscar: async () => (esMiembro ? miembro : null),
  } as unknown as MiembroRepositorioPort;
  const hogares = {
    obtener: async () => hogar,
  } as unknown as HogarRepositorioPort;

  return { gastos, miembros, hogares, listar, listarMeses, listarFechasMontos };
}

describe('ConsultarGastosUseCase', () => {
  it('pasa el rango de fechas y updatedAfter al repositorio', async () => {
    const { gastos, miembros, hogares, listar } = dependencias(true);
    const useCase = new ConsultarGastosUseCase(gastos, miembros, hogares);

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
    const { gastos, miembros, hogares, listar } = dependencias(false);
    const useCase = new ConsultarGastosUseCase(gastos, miembros, hogares);

    await expect(
      useCase.ejecutar({ hogarId: 'h1', usuarioId: 'intruso' }),
    ).rejects.toThrow('No perteneces a este hogar');
    expect(listar).not.toHaveBeenCalled();
  });

  it('devuelve el resumen por mes calendario (legado)', async () => {
    const { gastos, miembros, hogares, listarMeses } = dependencias(true);
    const resumen: ResumenMes[] = [
      { mes: '2026-10', cantidad: 2, totalCents: 4000 },
    ];
    listarMeses.mockResolvedValue(resumen);
    const useCase = new ConsultarGastosUseCase(gastos, miembros, hogares);

    await expect(
      useCase.meses({ hogarId: 'h1', usuarioId: 'u1' }),
    ).resolves.toEqual(resumen);
  });

  it('agrupa los gastos por ciclo usando el corte del hogar', async () => {
    const { gastos, miembros, hogares, listarFechasMontos } = dependencias(true);
    listarFechasMontos.mockResolvedValue([
      { fecha: '2026-10-31', montoCents: 1000 },
      { fecha: '2026-11-02', montoCents: 2000 },
      { fecha: '2026-10-28', montoCents: 500 },
    ]);
    const useCase = new ConsultarGastosUseCase(gastos, miembros, hogares);

    const ciclos = await useCase.ciclos({ hogarId: 'h1', usuarioId: 'u1' });

    expect(ciclos).toEqual([
      {
        inicio: '2026-10-29',
        fin: '2026-11-28',
        cantidad: 2,
        totalCents: 3000,
      },
      {
        inicio: '2026-09-29',
        fin: '2026-10-28',
        cantidad: 1,
        totalCents: 500,
      },
    ]);
  });
});
