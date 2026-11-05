import type {
  Analisis,
  CarreraCiclo,
  CarreraDia,
  ProyeccionAnalisis,
  SinClasificarAnalisis,
} from '../../domain/entities/Analisis';
import type { Gasto } from '../../domain/entities/Gasto';
import type { ConsultarAnalisisPort } from '../../domain/ports/in/ConsultarAnalisisPort';
import type { ClasificacionRepositorioPort } from '../../domain/ports/out/ClasificacionRepositorioPort';
import type { GastoRepositorioPort } from '../../domain/ports/out/GastoRepositorioPort';
import type { HogarRepositorioPort } from '../../domain/ports/out/HogarRepositorioPort';
import type { MiembroRepositorioPort } from '../../domain/ports/out/MiembroRepositorioPort';
import { CicloReglas } from '../../domain/rules/CicloReglas';
import { clasificar, normalizarTermino } from '../../domain/rules/Clasificador';
import { CATEGORIA_NOMBRE } from '../../domain/rules/CatalogoConceptos';
import { NoEncontradoError, NoEsMiembroError } from '../../exception/errors';

type AliasHogar = Record<string, string>;
type Ejemplos = Map<string, { nombre: string; montoCents: number }>;

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
  const clave = normalizarTermino(nombre);
  if (!nombre || !clave) return;

  const previo = ejemplos.get(clave);
  if (!previo || montoCents > previo.montoCents) {
    ejemplos.set(clave, { nombre, montoCents });
  }
}

/** Los 3 gastos más grandes del grupo, sin repetir nombres. */
function topEjemplos(ejemplos: Ejemplos): string[] {
  return [...ejemplos.values()]
    .sort((a, b) => b.montoCents - a.montoCents)
    .slice(0, 3)
    .map((e) => e.nombre);
}

export class ConsultarAnalisisUseCase implements ConsultarAnalisisPort {
  constructor(
    private readonly gastos: GastoRepositorioPort,
    private readonly miembros: MiembroRepositorioPort,
    private readonly hogares: HogarRepositorioPort,
    private readonly clasificaciones: ClasificacionRepositorioPort,
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

    const overrides = await this.clasificaciones.listar(input.hogarId);
    const alias: AliasHogar = Object.fromEntries(
      overrides.map((o) => [o.termino, o.conceptoId]),
    );

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

    const resumen = this.resumen(objetivo, alias);
    const categorias = this.categorias(objetivo, alias);
    const gustos = this.gustos(objetivo, alias);
    const sinClasificar = this.sinClasificar(objetivo, alias);
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
    const proyeccion = this.proyeccion(actual, anterior, cicloActual, hoy, alias);

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

  private clasificarProducto(producto: string, alias: AliasHogar) {
    return clasificar(producto, alias);
  }

  private resumen(gastos: Gasto[], alias: AliasHogar): Analisis['resumen'] {
    let fijosCents = 0;
    let variablesCents = 0;
    const dias = new Set<string>();

    for (const g of gastos) {
      const clasif = this.clasificarProducto(g.producto, alias);
      if (clasif?.concepto.tipo === 'FIJO') fijosCents += g.montoCents;
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

  private categorias(gastos: Gasto[], alias: AliasHogar): Analisis['categorias'] {
    const mapa = new Map<
      string,
      { nombre: string; totalCents: number; cantidad: number; ejemplos: Ejemplos }
    >();

    for (const g of gastos) {
      const clasif = this.clasificarProducto(g.producto, alias);
      // Lo que no se reconoce va a su propia tarjeta, no a "En qué se fue".
      if (!clasif) continue;

      const categoria = clasif.concepto.categoria;
      const actual = mapa.get(categoria) ?? {
        nombre: CATEGORIA_NOMBRE[categoria],
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
        ejemplos: topEjemplos(valor.ejemplos),
      }))
      .sort((a, b) => b.totalCents - a.totalCents);
  }

  private gustos(gastos: Gasto[], alias: AliasHogar): Analisis['gustos'] {
    const mapa = new Map<
      string,
      { nombre: string; cantidad: number; totalCents: number; ejemplos: Ejemplos }
    >();

    for (const g of gastos) {
      const clasif = this.clasificarProducto(g.producto, alias);
      if (!clasif?.concepto.esGusto) continue;

      const actual = mapa.get(clasif.concepto.id) ?? {
        nombre: clasif.concepto.nombre,
        cantidad: 0,
        totalCents: 0,
        ejemplos: new Map(),
      };
      actual.cantidad += 1;
      actual.totalCents += g.montoCents;
      agregarEjemplo(actual.ejemplos, g.producto, g.montoCents);
      mapa.set(clasif.concepto.id, actual);
    }

    return [...mapa.entries()]
      .map(([conceptoId, valor]) => ({
        conceptoId,
        nombre: valor.nombre,
        cantidad: valor.cantidad,
        totalCents: valor.totalCents,
        ejemplos: topEjemplos(valor.ejemplos),
      }))
      .sort((a, b) => b.totalCents - a.totalCents);
  }

  private sinClasificar(gastos: Gasto[], alias: AliasHogar): SinClasificarAnalisis[] {
    const mapa = new Map<
      string,
      { termino: string; cantidad: number; totalCents: number; ejemplos: Ejemplos }
    >();

    for (const g of gastos) {
      if (this.clasificarProducto(g.producto, alias)) continue;

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
        ejemplos: topEjemplos(valor.ejemplos),
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

  private esFijo(g: Gasto, alias: AliasHogar): boolean {
    return this.clasificarProducto(g.producto, alias)?.concepto.tipo === 'FIJO';
  }

  private proyeccion(
    actual: Gasto[],
    anterior: Gasto[],
    cicloActual: { inicio: string; fin: string },
    hoy: string,
    alias: AliasHogar,
  ): ProyeccionAnalisis {
    const diasTotales = diasEntre(cicloActual.inicio, cicloActual.fin);
    const transcurridos = Math.max(1, Math.min(diasEntre(cicloActual.inicio, hoy), diasTotales));

    const variableActual = actual.reduce(
      (s, g) => s + (this.esFijo(g, alias) ? 0 : g.montoCents),
      0,
    );
    const fijoActual = actual.reduce(
      (s, g) => s + (this.esFijo(g, alias) ? g.montoCents : 0),
      0,
    );
    const variableAnterior = anterior.reduce(
      (s, g) => s + (this.esFijo(g, alias) ? 0 : g.montoCents),
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
