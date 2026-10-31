import type { Usuario } from '../../entities/Usuario';

export interface UsuarioConPassword {
  usuario: Usuario;
  passwordHash: string;
}

export interface UsuarioRepositorioPort {
  crear(usuario: Usuario, passwordHash: string): Promise<Usuario>;
  buscarPorEmail(email: string): Promise<UsuarioConPassword | null>;
  buscarPorId(id: string): Promise<Usuario | null>;
}
