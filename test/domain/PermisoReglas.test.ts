import { describe, expect, it } from 'vitest';
import { PermisoReglas } from '../../src/domain/rules/PermisoReglas';

describe('PermisoReglas', () => {
  it('admin con contraseña válida puede editar y eliminar', () => {
    expect(PermisoReglas.puedeEditar('ADMIN', true)).toBe(true);
    expect(PermisoReglas.puedeEliminar('ADMIN', true)).toBe(true);
  });

  it('admin sin contraseña válida no puede', () => {
    expect(PermisoReglas.puedeEditar('ADMIN', false)).toBe(false);
    expect(PermisoReglas.puedeEliminar('ADMIN', false)).toBe(false);
  });

  it('un miembro nunca puede, aunque la contraseña sea válida', () => {
    expect(PermisoReglas.puedeEditar('MIEMBRO', true)).toBe(false);
    expect(PermisoReglas.puedeEliminar('MIEMBRO', true)).toBe(false);
  });
});
