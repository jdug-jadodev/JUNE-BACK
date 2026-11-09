import type { AIClasificacion } from '../../entities/AIClasificacion';

export interface UsoIA {
  tokensIn: number;
  tokensOut: number;
  requests: number;
}

export interface AIClasificacionRepositorioPort {
  listar(hogarId: string): Promise<AIClasificacion[]>;
  guardar(hogarId: string, clasificaciones: AIClasificacion[]): Promise<void>;
  usoDelMes(mes: string): Promise<UsoIA>;
  registrarUso(mes: string, tokensIn: number, tokensOut: number): Promise<void>;
}
