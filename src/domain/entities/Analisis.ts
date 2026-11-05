/** Gasto de ejemplo dentro de una categoría o gusto. */
export interface EjemploAnalisis {
  /** Nombre original, tal como lo escribió la persona. */
  nombre: string;
  /** Término normalizado que se usa para corregir la clasificación. */
  termino: string;
}

export interface CategoriaAnalisis {
  categoria: string;
  nombre: string;
  totalCents: number;
  cantidad: number;
  /** Hasta 3 gastos que alimentan la categoría, elegidos por monto. */
  ejemplos: EjemploAnalisis[];
}

export interface GustoAnalisis {
  conceptoId: string;
  nombre: string;
  cantidad: number;
  totalCents: number;
  /** Hasta 3 gastos que alimentan los gusticos, elegidos por monto. */
  ejemplos: EjemploAnalisis[];
}

export interface SinClasificarAnalisis {
  /** Término normalizado, sirve para corregirlo. */
  termino: string;
  /** Hasta 3 nombres originales del gasto. */
  ejemplos: EjemploAnalisis[];
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
  /** Un solo total de gusticos, sin importar el tipo de gusto. */
  gustos: GustoAnalisis[];
  sinClasificar: SinClasificarAnalisis[];
  carrera: CarreraCiclo[];
  proyeccion: ProyeccionAnalisis;
}
