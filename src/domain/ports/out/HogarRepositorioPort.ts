import type { Hogar } from '../../entities/Hogar';

export interface HogarRepositorioPort {
  crear(hogar: Hogar): Promise<Hogar>;
  listarPorUsuario(usuarioId: string): Promise<Hogar[]>;
  obtener(id: string): Promise<Hogar | null>;
  buscarPorInviteCode(codigo: string): Promise<Hogar | null>;
  actualizarPasswordHash(id: string, hash: string): Promise<void>;
  actualizarCorte(id: string, cutoffDay: number): Promise<void>;
}
