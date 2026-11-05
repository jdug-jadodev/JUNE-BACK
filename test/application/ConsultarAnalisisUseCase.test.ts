import { describe, expect, it, vi } from 'vitest';
import { ConsultarAnalisisUseCase } from '../../src/application/usecases/ConsultarAnalisisUseCase';
import type { Gasto } from '../../src/domain/entities/Gasto';
import type { Hogar } from '../../src/domain/entities/Hogar';
import type { Miembro } from '../../src/domain/entities/Miembro';
import type { ClasificacionHogar } from '../../src/domain/entities/ClasificacionHogar';
import type { ClasificacionRepositorioPort } from '../../src/domain/ports/out/ClasificacionRepositorioPort';
import type { GastoRepositorioPort } from '../../src/domain/ports/out/GastoRepositorioPort';
import type { HogarRepositorioPort } from '../../src/domain/ports/out/HogarRepositorioPort';
import type { MiembroRepositorioPort } from '../../src/domain/ports/out/MiembroRepositorioPort';

const hogar: Hogar = {
  id: 'h1',
  nombre: 'Casa',
  ownerId: 'u1',
  inviteCode: 'ANDRO-TEST',
  adminPasswordHash: null,
  cutoffDay: 29,
  createdAt: '2026-01-01T00:00:00.000Z',
};

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

function gasto(id: string, producto: string, montoCents: number, fecha: string): Gasto {
  return {
    id,
    hogarId: 'h1',
    producto,
    montoCents,
    fecha,
    creadoPor: 'u1',
    creadoPorNombre: 'Admin',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function crearCaso(gastosData: Gasto[], overrides: ClasificacionHogar[] = []) {
  const gastos = {
    listar: vi.fn(async (_hogarId: string, _filtro?: unknown) => gastosData),
  } as unknown as GastoRepositorioPort;

  const miembros = {
    buscar: vi.fn(async () => miembro),
  } as unknown as MiembroRepositorioPort;

  const hogares = {
    obtener: vi.fn(async () => hogar),
  } as unknown as HogarRepositorioPort;

  const clasificaciones = {
    listar: vi.fn(async () => overrides),
    guardar: vi.fn(async () => undefined),
  } as unknown as ClasificacionRepositorioPort;

  return new ConsultarAnalisisUseCase(gastos, miembros, hogares, clasificaciones);
}

describe('ConsultarAnalisisUseCase', () => {
  const data = [
    gasto('g1', 'arriendo', 3_000_000, '2026-10-29'),
    gasto('g2', 'coca-cola', 15_000, '2026-11-01'),
    gasto('g3', 'coca-cola', 15_000, '2026-11-02'),
    gasto('g4', 'papas y cilantro', 4_000, '2026-11-01'),
    // Ciclo anterior
    gasto('g5', 'arriendo', 3_000_000, '2026-09-29'),
    gasto('g6', 'luz', 100_000, '2026-10-01'),
  ];

  it('agrupa categorías y marca gustos para el ciclo actual', async () => {
    const useCase = crearCaso(data);
    const analisis = await useCase.ejecutar({ hogarId: 'h1', usuarioId: 'u1', hoy: '2026-11-05' });

    expect(analisis.ciclos).toEqual(['2026-10-29']);
    expect(analisis.resumen.cantidad).toBe(4);
    expect(analisis.resumen.totalCents).toBe(3_034_000);
    expect(analisis.resumen.fijosCents).toBe(3_000_000);
    expect(analisis.resumen.variablesCents).toBe(34_000);

    const vivienda = analisis.categorias.find((c) => c.categoria === 'vivienda');
    expect(vivienda?.totalCents).toBe(3_000_000);
    expect(vivienda?.ejemplos).toEqual(['arriendo']);

    const gustos = analisis.gustos.find((g) => g.conceptoId === 'gaseosa');
    expect(gustos).toMatchObject({ cantidad: 2, totalCents: 30_000, ejemplos: ['coca-cola'] });
    expect(analisis.sinClasificar).toEqual([]);
  });

  it('separa lo que no reconoce con su término y ejemplos', async () => {
    const useCase = crearCaso([
      gasto('x1', 'mamá de Ángel', 150_000, '2026-11-01'),
      gasto('x2', 'Mamá de angel', 150_000, '2026-11-01'),
      gasto('x3', 'ias', 20_000, '2026-11-02'),
      gasto('x4', 'arriendo', 3_000_000, '2026-10-29'),
    ]);
    const analisis = await useCase.ejecutar({ hogarId: 'h1', usuarioId: 'u1', hoy: '2026-11-05' });

    expect(analisis.sinClasificar).toHaveLength(2);
    expect(analisis.sinClasificar[0]).toMatchObject({
      termino: 'mama de angel',
      cantidad: 2,
      totalCents: 300_000,
      ejemplos: ['mamá de Ángel'],
    });
    // Lo no clasificado no aparece en "En qué se fue".
    expect(analisis.categorias.map((c) => c.categoria)).toEqual(['vivienda']);
  });

  it('usa las correcciones del hogar y su descripción', async () => {
    const useCase = crearCaso(
      [gasto('x1', 'mamá de Ángel', 150_000, '2026-11-01')],
      [{ termino: 'mama de angel', conceptoId: 'ayuda_familiar', nota: 'pago a mi suegra' }],
    );
    const analisis = await useCase.ejecutar({ hogarId: 'h1', usuarioId: 'u1', hoy: '2026-11-05' });

    expect(analisis.sinClasificar).toEqual([]);
    const hogarCategoria = analisis.categorias.find((c) => c.categoria === 'hogar');
    expect(hogarCategoria).toMatchObject({
      totalCents: 150_000,
      ejemplos: ['mamá de Ángel'],
    });
  });

  it('construye la carrera del ciclo actual y anterior', async () => {
    const useCase = crearCaso(data);
    const analisis = await useCase.ejecutar({ hogarId: 'h1', usuarioId: 'u1', hoy: '2026-11-05' });

    expect(analisis.carrera).toHaveLength(2);
    const actual = analisis.carrera.find((c) => c.etiqueta === 'actual')!;
    const anterior = analisis.carrera.find((c) => c.etiqueta === 'anterior')!;

    // Del 29 oct al 5 nov son 8 días. El anterior se alinea a los mismos 8 días.
    expect(actual.dias).toHaveLength(8);
    expect(actual.dias[0].acumuladoCents).toBe(3_000_000);
    expect(actual.dias[actual.dias.length - 1].acumuladoCents).toBe(3_034_000);

    expect(anterior.dias).toHaveLength(8);
    expect(anterior.dias[0].acumuladoCents).toBe(3_000_000);
  });

  it('calcula la proyección solo con gasto variable', async () => {
    const useCase = crearCaso(data);
    const analisis = await useCase.ejecutar({ hogarId: 'h1', usuarioId: 'u1', hoy: '2026-11-05' });

    expect(analisis.proyeccion.diasTotales).toBe(31);
    expect(analisis.proyeccion.diasTranscurridos).toBe(8);
    // Variable = 34.000 en 8 días -> 4.250/día -> 4.300 en pesos enteros.
    expect(analisis.proyeccion.ritmoDiarioCents).toBe(4_300);
    expect(analisis.proyeccion.variableCents).toBe(34_000);
    expect(analisis.proyeccion.fijoCents).toBe(3_000_000);
  });

  it('acepta varios ciclos objetivo', async () => {
    const useCase = crearCaso(data);
    const analisis = await useCase.ejecutar({
      hogarId: 'h1',
      usuarioId: 'u1',
      ciclos: ['2026-10-29', '2026-09-29'],
      hoy: '2026-11-05',
    });

    // 4 del ciclo actual + 2 del anterior.
    expect(analisis.resumen.cantidad).toBe(6);
  });
});
