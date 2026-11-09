import { describe, expect, it, vi } from 'vitest';
import { AnalizarConIAUseCase } from '../../src/application/usecases/AnalizarConIAUseCase';
import type { Analisis } from '../../src/domain/entities/Analisis';
import type { ConsultarAnalisisPort } from '../../src/domain/ports/in/ConsultarAnalisisPort';
import type { AIClasificacionRepositorioPort } from '../../src/domain/ports/out/AIClasificacionRepositorioPort';
import type { AnalisisIARepositorioPort } from '../../src/domain/ports/out/AnalisisIARepositorioPort';
import type { IngresoRepositorioPort } from '../../src/domain/ports/out/IngresoRepositorioPort';
import type { MiembroRepositorioPort } from '../../src/domain/ports/out/MiembroRepositorioPort';
import type { DeepSeekAdapter } from '../../src/infrastructure/ai/DeepSeekAdapter';

const analisis: Analisis = {
  ciclos: ['2026-10-29'],
  resumen: { totalCents: 3_000_000, cantidad: 3, diasConRegistro: 3, fijosCents: 2_000_000, variablesCents: 1_000_000 },
  categorias: [
    { categoria: 'vivienda', nombre: 'Vivienda', totalCents: 2_000_000, cantidad: 1, ejemplos: [] },
    { categoria: 'gustos', nombre: 'Gusticos', totalCents: 500_000, cantidad: 2, ejemplos: [] },
  ],
  gustos: [{ conceptoId: 'gusticos', nombre: 'Gusticos', cantidad: 2, totalCents: 500_000, ejemplos: [] }],
  sinClasificar: [],
  carrera: [],
  proyeccion: {
    diasTranscurridos: 5,
    diasTotales: 31,
    ritmoDiarioCents: 20_000,
    ritmoAnteriorCents: 15_000,
    variableCents: 1_000_000,
    fijoCents: 2_000_000,
  },
};

function crearCaso(
  opciones: {
    cache?: string | null;
    iaResultado?: {
      estado: string;
      sugerencias: Array<{ categoria: string; nota: string }>;
      recomendacion: string;
    };
    iaNull?: boolean;
    miembros?: number;
  } = {},
) {
  const consultarAnalisis = {
    ejecutar: vi.fn(async () => analisis),
  } as unknown as ConsultarAnalisisPort;

  const ingresos = {
    listar: vi.fn(async () => []),
    obtener: vi.fn(async () => null),
    crear: vi.fn(async () => undefined),
    actualizar: vi.fn(async () => undefined),
    eliminar: vi.fn(async () => undefined),
  } as unknown as IngresoRepositorioPort;

  const miembros = {
    listar: vi.fn(async () => Array.from({ length: opciones.miembros ?? 3 }, () => ({}))),
  } as unknown as MiembroRepositorioPort;

  const guardar = vi.fn(async () => undefined);
  const analisisIA = {
    buscar: vi.fn(async () => opciones.cache ?? null),
    guardar,
  } as unknown as AnalisisIARepositorioPort;

  const registrarUso = vi.fn(async () => undefined);
  const uso = {
    listar: vi.fn(async () => []),
    guardar: vi.fn(async () => undefined),
    usoDelMes: vi.fn(async () => ({ tokensIn: 0, tokensOut: 0, requests: 0 })),
    registrarUso,
  } as unknown as AIClasificacionRepositorioPort;

  const ia = opciones.iaNull
    ? null
    : ({
        analizar: vi.fn(async () => ({
          resultado: opciones.iaResultado ?? { estado: '', sugerencias: [], recomendacion: '' },
          tokensIn: 1000,
          tokensOut: 500,
        })),
      } as unknown as DeepSeekAdapter);

  return {
    useCase: new AnalizarConIAUseCase(consultarAnalisis, ingresos, miembros, analisisIA, uso, ia),
    ia,
    guardar,
    registrarUso,
  };
}

describe('AnalizarConIAUseCase', () => {
  it('devuelve desde la caché sin gastar tokens', async () => {
    const cache = JSON.stringify({
      estado: 'hola',
      sugerencias: [{ categoria: 'Viajes', montoCents: 300000, periodicidad: 'MENSUAL', nota: '' }],
      recomendacion: 'aparta un monto',
    });
    const { useCase, ia, registrarUso } = crearCaso({ cache });

    const resultado = await useCase.analizar({ hogarId: 'h1', usuarioId: 'u1' });

    expect(resultado.estado).toBe('hola');
    expect(resultado.cacheado).toBe(true);
    expect(resultado.progreso.diasRestantes).toBe(26);
    expect((ia as DeepSeekAdapter).analizar).not.toHaveBeenCalled();
    expect(registrarUso).not.toHaveBeenCalled();
  });

  it('usa los montos calculados por el backend, no los de la IA', async () => {
    const { useCase, guardar, registrarUso } = crearCaso({
      iaResultado: {
        estado: 'corto',
        sugerencias: [
          { categoria: 'Gusticos', nota: 'Antojos de la familia.' },
          { categoria: 'Viajes', nota: 'Para un paseo.' },
        ],
        recomendacion: 'aparta semanal',
      },
    });

    const resultado = await useCase.analizar({ hogarId: 'h1', usuarioId: 'u1' });

    expect(resultado.estado).toBe('corto');
    expect(resultado.sugerencias).toHaveLength(4);
    expect(resultado.sugerencias.map((s) => s.categoria)).toEqual([
      'Gusticos',
      'Salidas y ocio',
      'Restaurantes',
      'Ropa y calzado',
    ]);
    // 3 integrantes, sin ingreso: $30.000 por persona a la semana.
    expect(resultado.sugerencias[0].montoCents).toBe(9_000_000);
    expect(resultado.sugerencias[0].nota).toBe('Antojos de la familia.');
    expect(resultado.sugerencias[1].nota).not.toBe('');
    expect(resultado.cacheado).toBe(false);
    expect(guardar).toHaveBeenCalled();
    expect(registrarUso).toHaveBeenCalled();
  });

  it('escala los montos cuando el hogar tiene más integrantes', async () => {
    const { useCase } = crearCaso({ miembros: 6 });

    const resultado = await useCase.analizar({ hogarId: 'h1', usuarioId: 'u1' });

    expect(resultado.sugerencias[0].montoCents).toBe(18_000_000);
    expect(resultado.sugerencias[3].montoCents).toBe(54_000_000);
  });

  it('falla si no hay IA disponible', async () => {
    const { useCase } = crearCaso({ iaNull: true });

    await expect(useCase.analizar({ hogarId: 'h1', usuarioId: 'u1' })).rejects.toMatchObject({
      code: 'IA_NO_DISPONIBLE',
    });
  });
});
