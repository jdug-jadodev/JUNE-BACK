import type { AnalisisIA } from '../../entities/AnalisisIA';

export interface AnalizarConIAPort {
  analizar(input: {
    hogarId: string;
    usuarioId: string;
    ciclos?: string[];
    /** Personas en casa indicadas localmente por la persona (1-15). */
    personas?: number;
  }): Promise<AnalisisIA>;
}
