import type { Hogar } from '../../entities/Hogar';
import type { Plan } from '../../enums/Plan';

export interface GestionarHogarPort {
  crear(input: { usuarioId: string; nombre: string }): Promise<Hogar>;
  listar(input: { usuarioId: string }): Promise<Hogar[]>;
  obtener(input: { hogarId: string; usuarioId: string }): Promise<Hogar>;
  configurarPassword(input: { hogarId: string; usuarioId: string; password: string }): Promise<void>;
  configurarCorte(input: {
    hogarId: string;
    usuarioId: string;
    cutoffDay: number;
  }): Promise<Hogar>;
  configurarPlan(input: { hogarId: string; usuarioId: string; plan: Plan }): Promise<Hogar>;
}
