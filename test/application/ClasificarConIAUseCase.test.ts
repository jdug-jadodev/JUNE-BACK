import { describe, expect, it, vi } from 'vitest';
import { ClasificarConIAUseCase } from '../../src/application/usecases/ClasificarConIAUseCase';
import type { AIClasificacion, ConceptoCatalogo } from '../../src/domain/entities/AIClasificacion';
import type { AIClasificacionRepositorioPort } from '../../src/domain/ports/out/AIClasificacionRepositorioPort';
import type { DeepSeekAdapter } from '../../src/infrastructure/ai/DeepSeekAdapter';

const catalogo: ConceptoCatalogo[] = [
  { id: 'cursos', nombre: 'Cursos', categoria: 'educacion' },
  { id: 'restaurante', nombre: 'Restaurante', categoria: 'comida' },
];

function repoMock(
  cache: AIClasificacion[] = [],
  uso: { tokensIn: number; tokensOut: number; requests: number } = { tokensIn: 0, tokensOut: 0, requests: 0 },
) {
  const guardar = vi.fn(async () => undefined);
  const registrarUso = vi.fn(async () => undefined);
  const repo = {
    listar: vi.fn(async () => cache),
    guardar,
    usoDelMes: vi.fn(async () => uso),
    registrarUso,
  } as unknown as AIClasificacionRepositorioPort;
  return { repo, guardar, registrarUso };
}

function iaMock(
  resultados: Array<{ termino: string; conceptoId: string; confianza: number; explicacion: string }> = [],
  tokensIn = 1000,
  tokensOut = 100,
) {
  return {
    clasificar: vi.fn(async () => ({ resultados, tokensIn, tokensOut })),
  } as unknown as DeepSeekAdapter;
}

describe('ClasificarConIAUseCase', () => {
  it('usa la caché y no llama a la IA', async () => {
    const cache: AIClasificacion[] = [
      { termino: 'clases de piano', conceptoId: 'cursos', confianza: 0.9, explicacion: 'es un curso' },
    ];
    const { repo } = repoMock(cache);
    const ia = iaMock();
    const useCase = new ClasificarConIAUseCase(repo, ia);

    const mapa = await useCase.clasificar('h1', ['clases de piano'], catalogo);

    expect([...mapa.entries()]).toEqual([['clases de piano', 'cursos']]);
    expect(ia.clasificar).not.toHaveBeenCalled();
  });

  it('clasifica términos nuevos y persiste', async () => {
    const { repo, guardar, registrarUso } = repoMock();
    const ia = iaMock([{ termino: 'clases de piano', conceptoId: 'cursos', confianza: 0.9, explicacion: 'es un curso' }]);
    const useCase = new ClasificarConIAUseCase(repo, ia);

    const mapa = await useCase.clasificar('h1', ['clases de piano'], catalogo);

    expect(mapa.get('clases de piano')).toBe('cursos');
    expect(guardar).toHaveBeenCalledWith('h1', [
      expect.objectContaining({ termino: 'clases de piano', conceptoId: 'cursos' }),
    ]);
    expect(registrarUso).toHaveBeenCalled();
  });

  it('ignora resultados con conceptos inválidos', async () => {
    const { repo, guardar } = repoMock();
    const ia = iaMock([{ termino: 'x', conceptoId: 'inventado', confianza: 0.9, explicacion: '' }]);
    const useCase = new ClasificarConIAUseCase(repo, ia);

    const mapa = await useCase.clasificar('h1', ['x'], catalogo);

    expect(mapa.size).toBe(0);
    expect(guardar).not.toHaveBeenCalled();
  });

  it('no clasifica si no hay adaptador de IA', async () => {
    const { repo } = repoMock();
    const useCase = new ClasificarConIAUseCase(repo, null);

    const mapa = await useCase.clasificar('h1', ['clases de piano'], catalogo);

    expect(mapa.size).toBe(0);
  });

  it('no clasifica si se agotó el presupuesto', async () => {
    const { repo } = repoMock([], { tokensIn: 30_000_000, tokensOut: 0, requests: 100 });
    const ia = iaMock([{ termino: 'clases de piano', conceptoId: 'cursos', confianza: 0.9, explicacion: '' }]);
    const useCase = new ClasificarConIAUseCase(repo, ia);

    const mapa = await useCase.clasificar('h1', ['clases de piano'], catalogo);

    expect(mapa.size).toBe(0);
    expect(ia.clasificar).not.toHaveBeenCalled();
  });
});
