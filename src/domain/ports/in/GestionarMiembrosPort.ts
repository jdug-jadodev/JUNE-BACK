import type { Hogar } from '../../entities/Hogar';
import type { Miembro } from '../../entities/Miembro';

export interface GestionarMiembrosPort {
  listar(input: { hogarId: string; usuarioId: string }): Promise<Miembro[]>;
  unirse(input: { usuarioId: string; inviteCode: string }): Promise<Hogar>;
  eliminar(input: { hogarId: string; miembroId: string; usuarioId: string }): Promise<void>;
}
