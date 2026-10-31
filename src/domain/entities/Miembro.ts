import type { Rol } from '../enums/Rol';

export interface Miembro {
  id: string;
  hogarId: string;
  usuarioId: string;
  nombre?: string;
  email?: string;
  rol: Rol;
  joinedAt: string;
}
