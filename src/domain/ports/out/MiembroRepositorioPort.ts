import type { Miembro } from '../../entities/Miembro';
import type { Acceso } from '../../enums/Acceso';

export interface MiembroRepositorioPort {
  crear(miembro: Miembro): Promise<Miembro>;
  buscar(hogarId: string, usuarioId: string): Promise<Miembro | null>;
  listar(hogarId: string): Promise<Miembro[]>;
  eliminar(id: string): Promise<void>;
  actualizarAcceso(id: string, acceso: Acceso): Promise<void>;
  contarAdmins(hogarId: string): Promise<number>;
}
