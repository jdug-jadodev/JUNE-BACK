import type { Acceso } from '../enums/Acceso';
import type { Rol } from '../enums/Rol';

export interface Miembro {
  id: string;
  hogarId: string;
  usuarioId: string;
  nombre?: string;
  email?: string;
  rol: Rol;
  acceso: Acceso;
  joinedAt: string;
}
