import { describe, expect, it } from 'vitest';
import type { Analisis } from '../../src/domain/entities/Analisis';
import { inferirPerfilHogar } from '../../src/domain/rules/PresupuestoHogar';

const pesos = (n: number): number => n * 100;

function crearAnalisis(overrides: Partial<Analisis> = {}): Analisis {
  return {
    ciclos: ['2026-10-29'],
    resumen: {
      totalCents: pesos(6_430_000),
      cantidad: 3,
      diasConRegistro: 3,
      fijosCents: pesos(6_430_000),
      variablesCents: 0,
    },
    categorias: [
      {
        categoria: 'vivienda',
        nombre: 'Vivienda',
        totalCents: pesos(3_075_400),
        cantidad: 1,
        ejemplos: [],
      },
      {
        categoria: 'servicios',
        nombre: 'Servicios',
        totalCents: pesos(822_370),
        cantidad: 1,
        ejemplos: [],
      },
      {
        categoria: 'mercado',
        nombre: 'Mercado',
        totalCents: pesos(1_430_230),
        cantidad: 1,
        ejemplos: [],
      },
      {
        categoria: 'educacion',
        nombre: 'Educación',
        totalCents: pesos(500_000),
        cantidad: 1,
        ejemplos: [{ nombre: 'colegio de los niños', termino: 'colegio de los ninos', cantidad: 1, totalCents: pesos(500_000) }],
      },
    ],
    gustos: [],
    sinClasificar: [],
    carrera: [],
    proyeccion: {
      diasTranscurridos: 12,
      diasTotales: 31,
      ritmoDiarioCents: 0,
      ritmoAnteriorCents: 0,
      variableCents: 0,
      fijoCents: pesos(6_430_000),
    },
    ...overrides,
  };
}

describe('inferirPerfilHogar', () => {
  it('estima personas y detecta niños sin preguntar nada', () => {
    const perfil = inferirPerfilHogar(crearAnalisis(), pesos(15_900_000), 4);

    expect(perfil.hayNinos).toBe(true);
    expect(perfil.hayBebe).toBe(false);
    expect(perfil.personasEstimadas).toBe(6);
    expect(perfil.cargaFijaPct).toBe(40);
    expect(perfil.nivelCostoVida).toBe('MEDIO');
  });

  it('calcula montos realistas para todo el hogar y respeta el ingreso', () => {
    const perfil = inferirPerfilHogar(crearAnalisis(), pesos(15_900_000), 4);
    const [gusticos, ocio, restaurantes, ropa] = perfil.referencias;

    // Escala por persona, pero sin volverse impagable para un hogar endeudado.
    expect(ropa.montoCents).toBeGreaterThanOrEqual(pesos(200_000));
    expect(ropa.montoCents).toBeLessThanOrEqual(pesos(300_000));
    expect(gusticos.montoCents).toBeGreaterThanOrEqual(pesos(80_000));
    expect(ocio.montoCents).toBeGreaterThanOrEqual(pesos(100_000));
    expect(restaurantes.montoCents).toBeGreaterThanOrEqual(pesos(90_000));
    expect(perfil.discrecionalMensualCents).toBeLessThanOrEqual(pesos(15_900_000) * 0.12);
  });

  it('sin ingresos registrados no recorta los montos por persona', () => {
    const perfil = inferirPerfilHogar(crearAnalisis(), 0, 1);

    expect(perfil.cargaFijaPct).toBe(0);
    expect(perfil.referencias[0].montoCents).toBe(pesos(25_000) * perfil.personasEstimadas);
    expect(perfil.referencias[3].montoCents).toBe(pesos(60_000) * perfil.personasEstimadas);
  });

  it('reporta las deudas y recorta el dinero discrecional con carga fija alta', () => {
    const sinDeudas = inferirPerfilHogar(crearAnalisis(), pesos(15_900_000), 4);
    const conDeudas = inferirPerfilHogar(
      crearAnalisis({
        resumen: { ...crearAnalisis().resumen, fijosCents: pesos(10_000_000) },
        categorias: [
          ...crearAnalisis().categorias,
          {
            categoria: 'deudas',
            nombre: 'Deudas y pagos',
            totalCents: pesos(4_500_000),
            cantidad: 1,
            ejemplos: [],
          },
        ],
      }),
      pesos(15_900_000),
      4,
    );

    expect(conDeudas.deudasPct).toBeGreaterThanOrEqual(25);
    expect(conDeudas.cargaFijaPct).toBeGreaterThan(sinDeudas.cargaFijaPct);
    expect(conDeudas.discrecionalMensualCents).toBeLessThan(sinDeudas.discrecionalMensualCents);
  });

  it('respeta el número de personas ajustado localmente', () => {
    const perfil = inferirPerfilHogar(crearAnalisis(), pesos(15_900_000), 4, 9);

    expect(perfil.personasEstimadas).toBe(9);
    expect(perfil.personasAjustadas).toBe(true);

    const sinTopeNueve = inferirPerfilHogar(crearAnalisis(), 0, 4, 9);
    const sinTopeSeis = inferirPerfilHogar(crearAnalisis(), 0, 4, 6);
    expect(sinTopeNueve.referencias[0].montoCents).toBeGreaterThan(
      sinTopeSeis.referencias[0].montoCents,
    );
  });

  it('ignora valores fuera de rango', () => {
    const perfil = inferirPerfilHogar(crearAnalisis(), pesos(15_900_000), 4, 0);

    expect(perfil.personasAjustadas).toBe(false);
    expect(perfil.personasEstimadas).toBe(6);
  });

  it('detecta bebés, adolescentes y mascotas en los gastos', () => {
    const analisis = crearAnalisis({
      categorias: [
        ...crearAnalisis().categorias,
        {
          categoria: 'mascotas',
          nombre: 'Mascotas',
          totalCents: pesos(80_000),
          cantidad: 1,
          ejemplos: [],
        },
      ],
      sinClasificar: [
        {
          termino: 'panales',
          ejemplos: [{ nombre: 'pañales del bebé', termino: 'panales del bebe', cantidad: 1, totalCents: pesos(60_000) }],
          cantidad: 1,
          totalCents: pesos(60_000),
        },
        {
          termino: 'mesada',
          ejemplos: [{ nombre: 'mesada universidad', termino: 'mesada universidad', cantidad: 1, totalCents: pesos(200_000) }],
          cantidad: 1,
          totalCents: pesos(200_000),
        },
      ],
    });

    const perfil = inferirPerfilHogar(analisis, pesos(15_900_000), 5);

    expect(perfil.hayBebe).toBe(true);
    expect(perfil.hayAdolescentes).toBe(true);
    expect(perfil.hayMascotas).toBe(true);
  });
});
