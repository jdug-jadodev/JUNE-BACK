import type {
  Analisis,
  CarreraCiclo,
  CarreraDia,
  EjemploAnalisis,
  ProyeccionAnalisis,
  SinClasificarAnalisis,
} from '../../domain/entities/Analisis';
import type { CategoriaPersonalizada } from '../../domain/entities/CategoriaPersonalizada';
import type { ConceptoCatalogo } from '../../domain/entities/AIClasificacion';
import type { Categoria, Concepto, Necesidad, Tipo } from '../../domain/entities/Concepto';
import type { Gasto } from '../../domain/entities/Gasto';
import type { ConsultarAnalisisPort } from '../../domain/ports/in/ConsultarAnalisisPort';
import type { ClasificarConIAPort } from '../../domain/ports/in/ClasificarConIAPort';
import type { CategoriaPersonalizadaRepositorioPort } from '../../domain/ports/out/CategoriaPersonalizadaRepositorioPort';
import type { ClasificacionRepositorioPort } from '../../domain/ports/out/ClasificacionRepositorioPort';
import type { GastoRepositorioPort } from '../../domain/ports/out/GastoRepositorioPort';
import type { HogarRepositorioPort } from '../../domain/ports/out/HogarRepositorioPort';
import type { MiembroRepositorioPort } from '../../domain/ports/out/MiembroRepositorioPort';
import { CicloReglas } from '../../domain/rules/CicloReglas';
import { normalizarTermino, resolverAlias } from '../../domain/rules/Clasificador';
import { esPremium } from '../../domain/rules/PlanReglas';
import { CATEGORIA_NOMBRE, CONCEPTOS, CONCEPTOS_BY_ID } from '../../domain/rules/CatalogoConceptos';
import { NoEncontradoError, NoEsMiembroError } from '../../exception/errors';

type AliasHogar = Record<string, string>;
type EjemploInterno = {
  nombre: string;
  termino: string;
  cantidad: number;
  totalCents: number;
  montoMaxCents: number;
};
type Ejemplos = Map<string, EjemploInterno>;

interface ContextoClasificacion {
  alias: AliasHogar;
  /** Clasificaciones hechas por la IA (cache + nuevas). */
  iaAlias: AliasHogar;
  personalizadas: Map<string, CategoriaPersonalizada>;
}

interface ConceptoResuelto {
  id: string;
  nombre: string;
  categoria: string;
  tipo: Tipo;
  necesidad: Necesidad;
  esGusto: boolean;
}

function diaSiguiente(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function diaSuma(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function diaAnterior(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function diasEntre(inicio: string, fin: string): number {
  const a = new Date(`${inicio}T00:00:00Z`).getTime();
  const b = new Date(`${fin}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000) + 1;
}

function agregarEjemplo(ejemplos: Ejemplos, producto: string, montoCents: number): void {
  const nombre = producto.trim();
  const termino = normalizarTermino(nombre);
  if (!nombre || !termino) return;

  const previo = ejemplos.get(termino);
  if (!previo) {
    ejemplos.set(termino, {
      nombre,
      termino,
      cantidad: 1,
      totalCents: montoCents,
      montoMaxCents: montoCents,
    });
    return;
  }

  previo.cantidad += 1;
  previo.totalCents += montoCents;
  // Mostramos la escritura del gasto más grande del grupo.
  if (montoCents > previo.montoMaxCents) {
    previo.nombre = nombre;
    previo.montoMaxCents = montoCents;
  }
}

/** Todos los términos del grupo, ordenados por total gastado. */
function todosLosEjemplos(ejemplos: Ejemplos): EjemploAnalisis[] {
  return [...ejemplos.values()]
    .sort((a, b) => b.totalCents - a.totalCents)
    .map((e) => ({
      nombre: e.nombre,
      termino: e.termino,
      cantidad: e.cantidad,
      totalCents: e.totalCents,
    }));
}

function nombreCategoria(concepto: ConceptoResuelto): string {
  if (concepto.categoria.startsWith('cat:')) return concepto.nombre;
  return CATEGORIA_NOMBRE[concepto.categoria as Categoria];
}

export class ConsultarAnalisisUseCase implements ConsultarAnalisisPort {
  constructor(
    private readonly gastos: GastoRepositorioPort,
    private readonly miembros: MiembroRepositorioPort,
    private readonly hogares: HogarRepositorioPort,
    private readonly clasificaciones: ClasificacionRepositorioPort,
    private readonly categorias: CategoriaPersonalizadaRepositorioPort,
    private readonly clasificarConIA: ClasificarConIAPort,
  ) {}

  async ejecutar(input: {
    hogarId: string;
    usuarioId: string;
    ciclos?: string[];
    hoy?: string;
  }): Promise<Analisis> {
    const miembro = await this.miembros.buscar(input.hogarId, input.usuarioId);
    if (!miembro) throw new NoEsMiembroError();

    const hogar = await this.hogares.obtener(input.hogarId);
    if (!hogar) throw new NoEncontradoError('Hogar no encontrado');

    const [overrides, personalizadas] = await Promise.all([
      this.clasificaciones.listar(input.hogarId),
      this.categorias.listar(input.hogarId),
    ]);

    const contexto: ContextoClasificacion = {
      alias: Object.fromEntries(overrides.map((o) => [o.termino, o.conceptoId])),
      iaAlias: {},
      personalizadas: new Map(personalizadas.map((c) => [c.id, c])),
    };

    const hoy = input.hoy ?? new Date().toISOString().slice(0, 10);

    const cicloActual = CicloReglas.cicloDe(hoy, hogar.cutoffDay);
    const cicloAnterior = CicloReglas.cicloDe(diaAnterior(cicloActual.inicio), hogar.cutoffDay);

    const ciclosObjetivo =
      input.ciclos && input.ciclos.length > 0
        ? [...new Set(input.ciclos)]
        : [cicloActual.inicio];

    // Rango amplio que cubra objetivos, actual y anterior.
    const rangos = [
      cicloActual,
      cicloAnterior,
      ...ciclosObjetivo.map((ini) => CicloReglas.cicloDe(ini, hogar.cutoffDay)),
    ];
    const desde = rangos.map((r) => r.inicio).sort()[0];
    const hasta = rangos.map((r) => r.fin).sort().reverse()[0];

    const gastos = await this.gastos.listar(input.hogarId, { desde, hasta });

    const enCiclo = (g: Gasto, inicio: string): boolean =>
      CicloReglas.cicloDe(g.fecha, hogar.cutoffDay).inicio === inicio;

    const objetivo = gastos.filter((g) => ciclosObjetivo.some((ini) => enCiclo(g, ini)));
    const actual = gastos.filter((g) => enCiclo(g, cicloActual.inicio));
    const anterior = gastos.filter((g) => enCiclo(g, cicloAnterior.inicio));

    // Clasifica con IA los términos que el determinista no reconoce (solo premium).
    if (esPremium(hogar)) {
      const pendientes = this.terminosPendientes(objetivo, contexto);
      if (pendientes.length > 0) {
        contexto.iaAlias = Object.fromEntries(
          await this.clasificarConIA.clasificar(
            input.hogarId,
            pendientes,
            this.catalogoParaIA(personalizadas),
          ),
        );
      }
    }

    const resumen = this.resumen(objetivo, contexto);
    const categorias = this.categoriasAnalisis(objetivo, contexto);
    const gustos = this.gustos(objetivo, contexto);
    const sinClasificar = this.sinClasificar(objetivo, contexto);
    const carreraActual = this.carrera(actual, cicloActual.inicio, cicloActual.fin, hoy, 'actual');
    const carreraAnterior = this.carrera(
      anterior,
      cicloAnterior.inicio,
      cicloAnterior.fin,
      hoy,
      'anterior',
      carreraActual.dias.length,
    );
    const carrera = [carreraActual, carreraAnterior];
    const proyeccion = this.proyeccion(actual, anterior, cicloActual, hoy, contexto);

    return {
      ciclos: ciclosObjetivo,
      resumen,
      categorias,
      gustos,
      sinClasificar,
      carrera,
      proyeccion,
    };
  }

  private resolver(producto: string, contexto: ContextoClasificacion): ConceptoResuelto | null {
    const determinista = this.aConcepto(resolverAlias(producto, contexto.alias), contexto);
    if (determinista) return determinista;

    // La IA solo llena lo que el determinista no reconoce.
    const ia = this.aConcepto(resolverAlias(producto, contexto.iaAlias), contexto);
    if (ia) return ia;

    return null;
  }

  private aConcepto(
    resuelto: { conceptoId: string } | null,
    contexto: ContextoClasificacion,
  ): ConceptoResuelto | null {
    if (!resuelto) return null;

    const base: Concepto | undefined = CONCEPTOS_BY_ID[resuelto.conceptoId];
    if (base) {
      return {
        id: base.id,
        nombre: base.nombre,
        categoria: base.categoria,
        tipo: base.tipo,
        necesidad: base.necesidad,
        esGusto: base.esGusto,
      };
    }

    const personalizada = contexto.personalizadas.get(resuelto.conceptoId);
    if (!personalizada) return null;

    return {
      id: personalizada.id,
      nombre: personalizada.nombre,
      categoria: personalizada.id,
      tipo: personalizada.tipo,
      necesidad: 'NECESARIO',
      esGusto: personalizada.esGusto,
    };
  }

  private terminosPendientes(gastos: Gasto[], contexto: ContextoClasificacion): string[] {
    const pendientes = new Set<string>();
    for (const g of gastos) {
      if (this.resolver(g.producto, contexto)) continue;
      const termino = normalizarTermino(g.producto);
      if (termino) pendientes.add(termino);
    }
    return [...pendientes];
  }

  private catalogoParaIA(personalizadas: CategoriaPersonalizada[]): ConceptoCatalogo[] {
    const base = CONCEPTOS.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      categoria: c.categoria,
    }));
    const custom = personalizadas.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      categoria: c.id,
    }));
    return [...base, ...custom];
  }

  private resumen(gastos: Gasto[], contexto: ContextoClasificacion): Analisis['resumen'] {
    let fijosCents = 0;
    let variablesCents = 0;
    const dias = new Set<string>();

    for (const g of gastos) {
      const clasif = this.resolver(g.producto, contexto);
      if (clasif?.tipo === 'FIJO') fijosCents += g.montoCents;
      else variablesCents += g.montoCents;
      dias.add(g.fecha);
    }

    const totalCents = fijosCents + variablesCents;
    return {
      totalCents,
      cantidad: gastos.length,
      diasConRegistro: dias.size,
      fijosCents,
      variablesCents,
    };
  }

  private categoriasAnalisis(
    gastos: Gasto[],
    contexto: ContextoClasificacion,
  ): Analisis['categorias'] {
    const mapa = new Map<
      string,
      { nombre: string; totalCents: number; cantidad: number; ejemplos: Ejemplos }
    >();

    for (const g of gastos) {
      const clasif = this.resolver(g.producto, contexto);
      // Lo que no se reconoce va a su propia tarjeta, no a "En qué se fue".
      if (!clasif) continue;

      const categoria = clasif.categoria;
      const actual = mapa.get(categoria) ?? {
        nombre: nombreCategoria(clasif),
        totalCents: 0,
        cantidad: 0,
        ejemplos: new Map(),
      };
      actual.totalCents += g.montoCents;
      actual.cantidad += 1;
      agregarEjemplo(actual.ejemplos, g.producto, g.montoCents);
      mapa.set(categoria, actual);
    }

    return [...mapa.entries()]
      .map(([categoria, valor]) => ({
        categoria,
        nombre: valor.nombre,
        totalCents: valor.totalCents,
        cantidad: valor.cantidad,
        ejemplos: todosLosEjemplos(valor.ejemplos),
      }))
      .sort((a, b) => b.totalCents - a.totalCents);
  }

  private gustos(gastos: Gasto[], contexto: ContextoClasificacion): Analisis['gustos'] {
    let cantidad = 0;
    let totalCents = 0;
    const ejemplos: Ejemplos = new Map();

    for (const g of gastos) {
      const clasif = this.resolver(g.producto, contexto);
      if (!clasif?.esGusto) continue;
      cantidad += 1;
      totalCents += g.montoCents;
      agregarEjemplo(ejemplos, g.producto, g.montoCents);
    }

    if (cantidad === 0) return [];

    return [
      {
        conceptoId: 'gusticos',
        nombre: 'Gusticos',
        cantidad,
        totalCents,
        ejemplos: todosLosEjemplos(ejemplos),
      },
    ];
  }

  private sinClasificar(
    gastos: Gasto[],
    contexto: ContextoClasificacion,
  ): SinClasificarAnalisis[] {
    const mapa = new Map<
      string,
      { termino: string; cantidad: number; totalCents: number; ejemplos: Ejemplos }
    >();

    for (const g of gastos) {
      if (this.resolver(g.producto, contexto)) continue;

      const termino = normalizarTermino(g.producto) || g.producto.trim().toLowerCase() || 'sin nombre';
      const actual = mapa.get(termino) ?? {
        termino,
        cantidad: 0,
        totalCents: 0,
        ejemplos: new Map(),
      };
      actual.cantidad += 1;
      actual.totalCents += g.montoCents;
      agregarEjemplo(actual.ejemplos, g.producto, g.montoCents);
      mapa.set(termino, actual);
    }

    return [...mapa.values()]
      .map((valor) => ({
        termino: valor.termino,
        ejemplos: todosLosEjemplos(valor.ejemplos),
        cantidad: valor.cantidad,
        totalCents: valor.totalCents,
      }))
      .sort((a, b) => b.totalCents - a.totalCents);
  }

  private carrera(
    gastos: Gasto[],
    inicio: string,
    fin: string,
    hoy: string,
    etiqueta: CarreraCiclo['etiqueta'],
    maxDias?: number,
  ): CarreraCiclo {
    let finReal = etiqueta === 'actual' && hoy < fin ? hoy : fin;
    if (maxDias !== undefined) {
      const limite = diaSuma(inicio, maxDias - 1);
      if (limite < finReal) finReal = limite;
    }

    const porDia = new Map<string, number>();
    for (const g of gastos) porDia.set(g.fecha, (porDia.get(g.fecha) ?? 0) + g.montoCents);

    const dias: CarreraDia[] = [];
    let acumulado = 0;
    for (let d = inicio; d <= finReal; d = diaSiguiente(d)) {
      acumulado += porDia.get(d) ?? 0;
      dias.push({ fecha: d, acumuladoCents: acumulado });
    }

    return { etiqueta, inicio, fin, dias };
  }

  private esFijo(g: Gasto, contexto: ContextoClasificacion): boolean {
    return this.resolver(g.producto, contexto)?.tipo === 'FIJO';
  }

  private proyeccion(
    actual: Gasto[],
    anterior: Gasto[],
    cicloActual: { inicio: string; fin: string },
    hoy: string,
    contexto: ContextoClasificacion,
  ): ProyeccionAnalisis {
    const diasTotales = diasEntre(cicloActual.inicio, cicloActual.fin);
    const transcurridos = Math.max(1, Math.min(diasEntre(cicloActual.inicio, hoy), diasTotales));

    const variableActual = actual.reduce(
      (s, g) => s + (this.esFijo(g, contexto) ? 0 : g.montoCents),
      0,
    );
    const fijoActual = actual.reduce(
      (s, g) => s + (this.esFijo(g, contexto) ? g.montoCents : 0),
      0,
    );
    const variableAnterior = anterior.reduce(
      (s, g) => s + (this.esFijo(g, contexto) ? 0 : g.montoCents),
      0,
    );

    // Ritmos en pesos enteros (múltiplos de 100 centavos).
    const ritmoDiario = Math.round(variableActual / transcurridos / 100) * 100;
    const ritmoAnterior = Math.round(variableAnterior / diasTotales / 100) * 100;

    return {
      diasTranscurridos: transcurridos,
      diasTotales,
      ritmoDiarioCents: ritmoDiario,
      ritmoAnteriorCents: ritmoAnterior,
      variableCents: variableActual,
      fijoCents: fijoActual,
    };
  }
}
