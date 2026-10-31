import { describe, expect, it } from 'vitest';
import { ExportarGastosUseCase } from '../../src/application/usecases/ExportarGastosUseCase';
import type { Gasto } from '../../src/domain/entities/Gasto';
import type { Miembro } from '../../src/domain/entities/Miembro';
import type { GastoRepositorioPort } from '../../src/domain/ports/out/GastoRepositorioPort';
import type { MiembroRepositorioPort } from '../../src/domain/ports/out/MiembroRepositorioPort';

const gasto: Gasto = {
  id: 'g1',
  hogarId: 'h1',
  producto: 'Arroz y pollo',
  montoCents: 3_500_000,
  fecha: '2026-10-30',
  creadoPor: 'u1',
  creadoPorNombre: 'Andrés',
  createdAt: '2026-10-30T00:00:00.000Z',
  updatedAt: '2026-10-30T00:00:00.000Z',
};

const miembro: Miembro = {
  id: 'm1',
  hogarId: 'h1',
  usuarioId: 'u1',
  rol: 'ADMIN',
  joinedAt: '2026-10-30T00:00:00.000Z',
};

function repositorios(miembroEncontrado: Miembro | null) {
  const gastos = {
    listar: async () => [gasto],
  } as unknown as GastoRepositorioPort;

  const miembros = {
    buscar: async () => miembroEncontrado,
  } as unknown as MiembroRepositorioPort;

  return { gastos, miembros };
}

describe('ExportarGastosUseCase', () => {
  it('genera un CSV con encabezado y datos', async () => {
    const { gastos, miembros } = repositorios(miembro);
    const useCase = new ExportarGastosUseCase(gastos, miembros);

    const csv = await useCase.ejecutar({ hogarId: 'h1', usuarioId: 'u1' });

    expect(csv).toContain('fecha;producto;monto_cop;registrado_por');
    expect(csv).toContain('Arroz y pollo');
    expect(csv).toContain('35000.00');
    expect(csv).toContain('Andrés');
  });

  it('rechaza a quien no pertenece al hogar', async () => {
    const { gastos, miembros } = repositorios(null);
    const useCase = new ExportarGastosUseCase(gastos, miembros);

    await expect(
      useCase.ejecutar({ hogarId: 'h1', usuarioId: 'intruso' }),
    ).rejects.toThrow('No perteneces a este hogar');
  });

  it('filtra por los meses seleccionados', async () => {
    const { gastos, miembros } = repositorios(miembro);
    const useCase = new ExportarGastosUseCase(gastos, miembros);

    const csv = await useCase.ejecutar({
      hogarId: 'h1',
      usuarioId: 'u1',
      meses: ['2026-08'],
    });

    expect(csv).toContain('fecha;producto;monto_cop;registrado_por');
    expect(csv).not.toContain('Arroz y pollo');
  });
});
