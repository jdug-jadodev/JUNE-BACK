import { describe, expect, it } from 'vitest';
import { clasificar, normalizarTermino } from '../../src/domain/rules/Clasificador';

describe('normalizarTermino', () => {
  it('quita tildes y deja minúsculas', () => {
    expect(normalizarTermino('Coca-Cola')).toBe('coca cola');
    expect(normalizarTermino('Mamá de Ángel')).toBe('mama de angel');
    expect(normalizarTermino('  Pan   y   tostadas ')).toBe('pan y tostadas');
  });
});

describe('clasificar', () => {
  it('clasifica gaseosas por alias con guion', () => {
    expect(clasificar('coca-cola')?.concepto.id).toBe('gaseosa');
    expect(clasificar('Coca Cola')?.concepto.id).toBe('gaseosa');
  });

  it('clasifica arriendo', () => {
    expect(clasificar('arriendo')?.concepto.categoria).toBe('vivienda');
  });

  it('el alias más largo gana: papas y cilantro es verdura, no mecato', () => {
    expect(clasificar('papas y cilantro')?.concepto.id).toBe('verduras');
    expect(clasificar('papas')?.concepto.id).toBe('snacks');
  });

  it('no confunde agua con aguardiente', () => {
    expect(clasificar('agua')?.concepto.id).toBe('agua');
    expect(clasificar('aguardiente')?.concepto.id).toBe('licor');
  });

  it('las correcciones del hogar tienen prioridad', () => {
    expect(clasificar('plaza', { plaza: 'mercado' })?.concepto.id).toBe('mercado');
    // Sin corrección, "plaza" cae en verduras.
    expect(clasificar('plaza')?.concepto.id).toBe('verduras');
  });

  it('devuelve null cuando no reconoce', () => {
    expect(clasificar('xyzdesconocido')).toBeNull();
  });

  it('marca los gustos pequeños', () => {
    expect(clasificar('coca-cola')?.concepto.esGusto).toBe(true);
    expect(clasificar('cerveza')?.concepto.esGusto).toBe(true);
    expect(clasificar('arriendo')?.concepto.esGusto).toBe(false);
  });

  it('reconoce suscripciones escritas de varias formas', () => {
    expect(clasificar('ia suscripciones')?.concepto.id).toBe('streaming');
    expect(clasificar('suscripciones')?.concepto.id).toBe('streaming');
    expect(clasificar('Netflix')?.concepto.id).toBe('streaming');
  });
});
