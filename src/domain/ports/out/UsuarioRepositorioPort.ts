import type { Usuario } from '../../entities/Usuario';
import type { UsuarioSeguridad } from '../../entities/UsuarioSeguridad';

export interface UsuarioConPassword {
  usuario: Usuario;
  passwordHash: string;
}

export interface UsuarioRepositorioPort {
  crear(usuario: Usuario, passwordHash: string): Promise<Usuario>;
  buscarPorEmail(email: string): Promise<UsuarioConPassword | null>;
  buscarPorId(id: string): Promise<Usuario | null>;
  buscarConPasswordPorId(id: string): Promise<UsuarioConPassword | null>;
  buscarSeguridadPorEmail(email: string): Promise<UsuarioSeguridad | null>;
  buscarSeguridadPorId(id: string): Promise<UsuarioSeguridad | null>;
  actualizarPregunta(id: string, pregunta: string, respuestaHash: string): Promise<void>;
  actualizarCodigoRecuperacion(id: string, codigoHash: string | null): Promise<void>;
  actualizarPasswordHash(id: string, passwordHash: string): Promise<void>;
  actualizarIntentoReset(
    id: string,
    intentos: number,
    bloqueadoHasta: string | null,
  ): Promise<void>;
}
