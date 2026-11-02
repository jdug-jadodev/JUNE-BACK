import type { Hogar } from '../../../domain/entities/Hogar';
import type { HogarRepositorioPort } from '../../../domain/ports/out/HogarRepositorioPort';
import type { MiembroRepositorioPort } from '../../../domain/ports/out/MiembroRepositorioPort';
import type { PasswordHashPort } from '../../../domain/ports/out/PasswordHashPort';
import { PermisoReglas } from '../../../domain/rules/PermisoReglas';
import {
  NoEncontradoError,
  NoEsMiembroError,
  PasswordAdminNoConfiguradaError,
  PermisoDenegadoError,
} from '../../../exception/errors';

export async function validarAdmin(input: {
  hogarId: string;
  usuarioId: string;
  adminPassword: string;
  miembroRepo: MiembroRepositorioPort;
  hogarRepo: HogarRepositorioPort;
  passwordHash: PasswordHashPort;
}): Promise<Hogar> {
  const miembro = await input.miembroRepo.buscar(input.hogarId, input.usuarioId);
  if (!miembro) throw new NoEsMiembroError();

  if (!PermisoReglas.esAdmin(miembro.rol)) throw new PermisoDenegadoError();

  const hogar = await input.hogarRepo.obtener(input.hogarId);
  if (!hogar) throw new NoEncontradoError('Hogar no encontrado');
  if (!hogar.adminPasswordHash) throw new PasswordAdminNoConfiguradaError();

  const passwordValida = await input.passwordHash.verificar(
    input.adminPassword,
    hogar.adminPasswordHash,
  );
  if (!PermisoReglas.puedeEditar(miembro.rol, passwordValida)) {
    throw new PermisoDenegadoError();
  }

  return hogar;
}
