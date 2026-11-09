import type { AnalisisIA } from '../../entities/AnalisisIA';

export interface AnalizarConIAPort {
  analizar(input: {
    hogarId: string;
    usuarioId: string;
    ciclos?: string[];
  }): Promise<AnalisisIA>;
}
