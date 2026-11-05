import type { Analisis } from '../../entities/Analisis';

export interface ConsultarAnalisisPort {
  ejecutar(input: {
    hogarId: string;
    usuarioId: string;
    /** Inicios de ciclo a analizar. Vacío/undefined = ciclo actual. */
    ciclos?: string[];
    /** Fecha "hoy" en ISO, para pruebas. Por defecto la fecha real. */
    hoy?: string;
  }): Promise<Analisis>;
}
