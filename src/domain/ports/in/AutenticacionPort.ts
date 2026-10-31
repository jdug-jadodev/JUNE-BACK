import type { Usuario } from '../../entities/Usuario';

export interface AutenticacionResultado {
  usuario: Usuario;
  accessToken: string;
  refreshToken: string;
}

export interface AutenticacionPort {
  registrar(input: { email: string; password: string; nombre: string }): Promise<AutenticacionResultado>;
  login(input: { email: string; password: string }): Promise<AutenticacionResultado>;
  refrescar(refreshToken: string): Promise<AutenticacionResultado>;
}
