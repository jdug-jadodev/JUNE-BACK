import type { Rol } from '../enums/Rol';

export const PermisoReglas = {
  esAdmin: (rol: Rol): boolean => rol === 'ADMIN',

  puedeEditar: (rol: Rol, passwordValida: boolean): boolean =>
    rol === 'ADMIN' && passwordValida,

  puedeEliminar: (rol: Rol, passwordValida: boolean): boolean =>
    rol === 'ADMIN' && passwordValida,
};
