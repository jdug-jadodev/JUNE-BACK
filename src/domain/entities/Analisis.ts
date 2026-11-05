export interface CategoriaAnalisis {
  categoria: string;
  nombre: string;
  totalCents: number;
  cantidad: number;
  /** Hasta 3 nombres de gastos que alimentan la categoría. */
  ejemplos: string[];
}

export interface GustoAnalisis {
  conceptoId: string;
  nombre: string;
  cantidad: number;
  totalCents: number;
  /** Hasta 3 nombres de gastos que alimentan el gusto. */
  ejemplos: string[];
}

export interface SinClasificarAnalisis {
  /** Término normalizado, sirve para corregirlo. */
  termino: string;
  /** Hasta 3 nombres originales del gasto. */
  ejemplos: string[];
  cantidad: number;
  totalCents: number;
}

export interface CarreraDia {
  /** Fecha ISO del día. */
  fecha: string;
  /** Acumulado de gasto hasta ese día inclusive. */
  acumuladoCents: number;
}

export interface CarreraCiclo {
  etiqueta: 'actual' | 'anterior';
  inicio: string;
  fin: string;
  dias: CarreraDia[];
}

export interface ProyeccionAnalisis {
  diasTranscurridos: number;
  diasTotales: number;
  /** Ritmo diario de gasto variable, en centavos (pesos enteros). */
  ritmoDiarioCents: number;
  /** Ritmo variable del ciclo anterior. */
  ritmoAnteriorCents: number;
  variableCents: number;
  fijoCents: number;
}

export interface Analisis {
  /** Inicios de ciclo analizados (formato YYYY-MM-DD). */
  ciclos: string[];
  resumen: {
    totalCents: number;
    cantidad: number;
    diasConRegistro: number;
    fijosCents: number;
    variablesCents: number;
  };
  categorias: CategoriaAnalisis[];
  gustos: GustoAnalisis[];
  sinClasificar: SinClasificarAnalisis[];
  carrera: CarreraCiclo[];
  proyeccion: ProyeccionAnalisis;
}
