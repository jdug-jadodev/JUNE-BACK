export interface CategoriaAnalisis {
  categoria: string;
  nombre: string;
  totalCents: number;
  cantidad: number;
}

export interface GustoAnalisis {
  conceptoId: string;
  nombre: string;
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
  /** Proyección a fin de ciclo: variable proyectado + fijos ya registrados. */
  estimadoFinCicloCents: number;
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
  carrera: CarreraCiclo[];
  proyeccion: ProyeccionAnalisis;
}
