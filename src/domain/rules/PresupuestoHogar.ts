import type { Analisis } from '../entities/Analisis';
import type { PeriodicidadIA, SugerenciaIA } from '../entities/AnalisisIA';

export type NivelCostoVida = 'BAJO' | 'MEDIO' | 'ALTO';

export interface PerfilHogar {
  miembrosRegistrados: number;
  /** Personas que probablemente viven en el hogar (incluye quienes no usan la app). */
  personasEstimadas: number;
  hayNinos: boolean;
  hayAdolescentes: boolean;
  hayBebe: boolean;
  hayMascotas: boolean;
  /** Porcentaje del ingreso mensual que se va en gastos fijos (0-100). */
  cargaFijaPct: number;
  nivelCostoVida: NivelCostoVida;
  mercadoMensualCents: number;
  mercadoPorPersonaCents: number;
  /** Dinero mensual razonable para gustos, ocio, restaurantes y ropa. */
  discrecionalMensualCents: number;
  referencias: SugerenciaIA[];
}

const pesos = (n: number): number => Math.round(n * 100);
const SEMANAS_POR_MES = 52 / 12;

/** Montos base por persona, en pesos colombianos. */
const BASE_POR_PERSONA = {
  gusticosSemana: pesos(30_000),
  ocioSemana: pesos(50_000),
  restaurantesSemana: pesos(40_000),
  ropaMes: pesos(90_000),
};

const SENALES_NINOS = [
  'colegio',
  'jardin',
  'kinder',
  'preescolar',
  'primaria',
  'panal',
  'panito',
  'bebe',
  'formula',
  'guarderia',
  'ninera',
  'onces',
  'uniforme',
  'utiles',
  'escuela',
  'ruta escolar',
  'bus escolar',
  'pediatra',
  'juguete',
  'maternal',
  'cumpleanos infantil',
];

const SENALES_ADOLESCENTES = [
  'universidad',
  'matricula',
  'semestre',
  'pregrado',
  'mesada',
  'bachillerato',
  'icfes',
  'grado',
  'tecnico',
  'sena',
];

const SENALES_BEBE = [
  'panal',
  'panito',
  'bebe',
  'formula',
  'tetero',
  'maternal',
  'guarderia',
  'pediatra',
  'cuna',
];

const normalizar = (texto: string): string =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const redondear = (cents: number): number => {
  const unidad = cents >= pesos(100_000) ? pesos(10_000) : pesos(5_000);
  return Math.max(unidad, Math.round(cents / unidad) * unidad);
};

const perCapitaMercado = (ingresoMensualCents: number): number => {
  if (ingresoMensualCents >= pesos(10_000_000)) return pesos(600_000);
  if (ingresoMensualCents >= pesos(5_000_000)) return pesos(450_000);
  if (ingresoMensualCents >= pesos(2_000_000)) return pesos(320_000);
  return pesos(250_000);
};

/**
 * Deduce el tamaño y el estilo de vida del hogar usando solo los datos que ya
 * existen: integrantes registrados, mercado, educación, mascotas y carga fija.
 * No pide información adicional a la persona.
 */
export function inferirPerfilHogar(
  analisis: Analisis,
  ingresoMensualCents: number,
  miembrosRegistrados: number,
): PerfilHogar {
  const ciclos = Math.max(1, analisis.ciclos.length);
  const dias = Math.max(1, analisis.proyeccion.diasTranscurridos);

  const categoria = (id: string) => analisis.categorias.find((c) => c.categoria === id);

  const mercadoCiclo = (categoria('mercado')?.totalCents ?? 0) / ciclos;
  const mercadoMensualCents = Math.round((mercadoCiclo / dias) * 30);

  const terminos = [
    ...analisis.categorias.flatMap((c) => c.ejemplos.map((e) => `${e.nombre} ${e.termino}`)),
    ...analisis.gustos.flatMap((g) => g.ejemplos.map((e) => `${e.nombre} ${e.termino}`)),
    ...analisis.sinClasificar.flatMap((s) => s.ejemplos.map((e) => `${e.nombre} ${e.termino}`)),
  ].map(normalizar);

  const contiene = (senales: string[]): boolean =>
    terminos.some((termino) => senales.some((senal) => termino.includes(senal)));

  const hayNinos = contiene(SENALES_NINOS) || (categoria('educacion')?.totalCents ?? 0) > 0;
  const hayAdolescentes = contiene(SENALES_ADOLESCENTES);
  const hayBebe = contiene(SENALES_BEBE);
  const hayMascotas = (categoria('mascotas')?.totalCents ?? 0) > 0;

  const porMercado =
    dias >= 5 && mercadoMensualCents > 0
      ? Math.round(mercadoMensualCents / perCapitaMercado(ingresoMensualCents))
      : 0;
  const personasEstimadas = Math.min(12, Math.max(1, miembrosRegistrados, porMercado));

  const fijosCiclo = analisis.resumen.fijosCents / ciclos;
  const cargaFijaPct =
    ingresoMensualCents > 0
      ? Math.min(100, Math.round((fijosCiclo / ingresoMensualCents) * 100))
      : 0;

  const nivelCostoVida: NivelCostoVida =
    cargaFijaPct >= 55 ? 'ALTO' : cargaFijaPct >= 35 ? 'MEDIO' : 'BAJO';

  const factorDiscrecional =
    cargaFijaPct >= 65 ? 0.08 : cargaFijaPct >= 50 ? 0.11 : cargaFijaPct >= 35 ? 0.15 : 0.18;

  const mensualBase =
    (BASE_POR_PERSONA.gusticosSemana +
      BASE_POR_PERSONA.ocioSemana +
      BASE_POR_PERSONA.restaurantesSemana) *
      SEMANAS_POR_MES *
      personasEstimadas +
    BASE_POR_PERSONA.ropaMes * personasEstimadas;

  const tope =
    ingresoMensualCents > 0
      ? ingresoMensualCents * factorDiscrecional
      : Number.POSITIVE_INFINITY;
  const escala = mensualBase > tope && mensualBase > 0 ? tope / mensualBase : 1;

  const referencias: SugerenciaIA[] = [
    {
      categoria: 'Gusticos',
      montoCents: redondear(BASE_POR_PERSONA.gusticosSemana * personasEstimadas * escala),
      periodicidad: 'SEMANAL',
      nota: '',
    },
    {
      categoria: 'Salidas y ocio',
      montoCents: redondear(BASE_POR_PERSONA.ocioSemana * personasEstimadas * escala),
      periodicidad: 'SEMANAL',
      nota: '',
    },
    {
      categoria: 'Restaurantes',
      montoCents: redondear(BASE_POR_PERSONA.restaurantesSemana * personasEstimadas * escala),
      periodicidad: 'SEMANAL',
      nota: '',
    },
    {
      categoria: 'Ropa y calzado',
      montoCents: redondear(BASE_POR_PERSONA.ropaMes * personasEstimadas * escala),
      periodicidad: 'MENSUAL',
      nota: '',
    },
  ];

  return {
    miembrosRegistrados,
    personasEstimadas,
    hayNinos,
    hayAdolescentes,
    hayBebe,
    hayMascotas,
    cargaFijaPct,
    nivelCostoVida,
    mercadoMensualCents,
    mercadoPorPersonaCents:
      personasEstimadas > 0 ? Math.round(mercadoMensualCents / personasEstimadas) : 0,
    discrecionalMensualCents: Math.round(
      (referencias[0].montoCents + referencias[1].montoCents + referencias[2].montoCents) *
        SEMANAS_POR_MES +
        referencias[3].montoCents,
    ),
    referencias,
  };
}

/** Nota breve de respaldo si la IA no devuelve una para la categoría. */
export function notaPorDefecto(categoria: string, periodicidad: PeriodicidadIA): string {
  switch (categoria) {
    case 'Gusticos':
      return 'Para antojos y snacks de toda la familia.';
    case 'Salidas y ocio':
      return 'Incluye planes y transporte (Uber, bus, parqueadero).';
    case 'Restaurantes':
      return 'Para comer fuera sin descuadrar el ciclo.';
    case 'Ropa y calzado':
      return periodicidad === 'MENSUAL'
        ? 'Para ropa y calzado de todo el hogar este mes.'
        : 'Para ropa y calzado de la familia.';
    default:
      return 'Monto calculado para todo el hogar.';
  }
}

/** Empareja el nombre que devolvió la IA con una de las referencias calculadas. */
export function coincidirReferencia(
  categoriaIA: string,
  referencias: SugerenciaIA[],
): SugerenciaIA | null {
  const texto = normalizar(categoriaIA);

  const mapa: Array<[string[], string]> = [
    [['gustico', 'antojo', 'snack', 'mecato', 'postre'], 'Gusticos'],
    [['ocio', 'salida', 'viaje', 'diversion', 'plan'], 'Salidas y ocio'],
    [['restaurant', 'comer', 'comida'], 'Restaurantes'],
    [['ropa', 'calzado', 'vestuario'], 'Ropa y calzado'],
  ];

  for (const [claves, nombre] of mapa) {
    if (claves.some((clave) => texto.includes(clave))) {
      return referencias.find((r) => r.categoria === nombre) ?? null;
    }
  }

  return referencias.find((r) => normalizar(r.categoria) === texto) ?? null;
}
