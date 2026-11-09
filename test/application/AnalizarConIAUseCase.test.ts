import { describe, expect, it, vi } from 'vitest';
import { AnalizarConIAUseCase } from '../../src/application/usecases/AnalizarConIAUseCase';
import type { Analisis } from '../../src/domain/entities/Analisis';
import type { ConsultarAnalisisPort } from '../../src/domain/ports/in/ConsultarAnalisisPort';
import type { AIClasificacionRepositorioPort } from '../../src/domain/ports/out/AIClasificacionRepositorioPort';
import type { AnalisisIARepositorioPort } from '../../src/domain/ports/out/AnalisisIARepositorioPort';
import type { IngresoRepositorioPort } from '../../src/domain/ports/out/IngresoRepositorioPort';
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
    iaTexto?: string;
    iaNull?: boolean;
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
        analizar: vi.fn(async () => ({ texto: opciones.iaTexto ?? 'resumen', tokensIn: 1000, tokensOut: 500 })),
      } as unknown as DeepSeekAdapter);

  return {
    useCase: new AnalizarConIAUseCase(consultarAnalisis, ingresos, analisisIA, uso, ia),
    ia,
    guardar,
    registrarUso,
  };
}

describe('AnalizarConIAUseCase', () => {
  it('devuelve desde la caché sin gastar tokens', async () => {
    const { useCase, ia, registrarUso } = crearCaso({ cache: 'ya analizado' });

    const resultado = await useCase.analizar({ hogarId: 'h1', usuarioId: 'u1' });

    expect(resultado.texto).toBe('ya analizado');
    expect(resultado.cacheado).toBe(true);
    expect((ia as DeepSeekAdapter).analizar).not.toHaveBeenCalled();
    expect(registrarUso).not.toHaveBeenCalled();
  });

  it('llama a la IA y guarda el resultado', async () => {
    const { useCase, guardar, registrarUso } = crearCaso({ iaTexto: 'Este ciclo gastaste...' });

    const resultado = await useCase.analizar({ hogarId: 'h1', usuarioId: 'u1' });

    expect(resultado.texto).toBe('Este ciclo gastaste...');
    expect(resultado.cacheado).toBe(false);
    expect(guardar).toHaveBeenCalled();
    expect(registrarUso).toHaveBeenCalled();
  });

  it('falla si no hay IA disponible', async () => {
    const { useCase } = crearCaso({ iaNull: true });

    await expect(useCase.analizar({ hogarId: 'h1', usuarioId: 'u1' })).rejects.toMatchObject({
      code: 'IA_NO_DISPONIBLE',
    });
  });
});
