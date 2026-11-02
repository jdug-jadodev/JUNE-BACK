import type { Hogar } from '../../entities/Hogar';
import type { Miembro } from '../../entities/Miembro';
import type { Acceso } from '../../enums/Acceso';
import type { Rol } from '../../enums/Rol';

export interface GestionarMiembrosPort {
  listar(input: { hogarId: string; usuarioId: string }): Promise<Miembro[]>;
  unirse(input: { usuarioId: string; inviteCode: string }): Promise<Hogar>;
  eliminar(input: { hogarId: string; miembroId: string; usuarioId: string }): Promise<void>;
  cambiarAcceso(input: {
    hogarId: string;
    miembroId: string;
    usuarioId: string;
    acceso: Acceso;
  }): Promise<void>;
  restablecerPassword(input: {
    hogarId: string;
    miembroId: string;
    usuarioId: string;
  }): Promise<string>;
  cambiarRol(input: {
    hogarId: string;
    miembroId: string;
    usuarioId: string;
    rol: Rol;
  }): Promise<void>;
}
