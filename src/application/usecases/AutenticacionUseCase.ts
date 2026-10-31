import type {
  AutenticacionPort,
  AutenticacionResultado,
} from '../../domain/ports/in/AutenticacionPort';
import type { UsuarioRepositorioPort } from '../../domain/ports/out/UsuarioRepositorioPort';
import type { RefreshTokenRepositorioPort } from '../../domain/ports/out/RefreshTokenRepositorioPort';
import type { PasswordHashPort } from '../../domain/ports/out/PasswordHashPort';
import type { TokenPort } from '../../domain/ports/out/TokenPort';
import type { Usuario } from '../../domain/entities/Usuario';
import { PasswordReglas } from '../../domain/rules/PasswordReglas';
import {
  ConflictoError,
  CredencialesInvalidasError,
  NoAutenticadoError,
} from '../../exception/errors';

const REFRESH_DIAS = 30;

export class AutenticacionUseCase implements AutenticacionPort {
  constructor(
    private readonly usuarios: UsuarioRepositorioPort,
    private readonly refreshTokens: RefreshTokenRepositorioPort,
    private readonly passwordHash: PasswordHashPort,
    private readonly token: TokenPort,
  ) {}

  async registrar(input: {
    email: string;
    password: string;
    nombre: string;
  }): Promise<AutenticacionResultado> {
    const email = input.email.trim().toLowerCase();
    const nombre = input.nombre.trim();

    PasswordReglas.validar(input.password);

    const existente = await this.usuarios.buscarPorEmail(email);
    if (existente) throw new ConflictoError('Ya existe una cuenta con ese email');

    const usuario: Usuario = {
      id: crypto.randomUUID(),
      email,
      nombre,
      createdAt: new Date().toISOString(),
    };

    const passwordHash = await this.passwordHash.hash(input.password);
    await this.usuarios.crear(usuario, passwordHash);

    return this.emitir(usuario);
  }

  async login(input: { email: string; password: string }): Promise<AutenticacionResultado> {
    const email = input.email.trim().toLowerCase();
    const encontrado = await this.usuarios.buscarPorEmail(email);
    if (!encontrado) throw new CredencialesInvalidasError();

    const valida = await this.passwordHash.verificar(input.password, encontrado.passwordHash);
    if (!valida) throw new CredencialesInvalidasError();

    return this.emitir(encontrado.usuario);
  }

  async refrescar(refreshToken: string): Promise<AutenticacionResultado> {
    const tokenHash = await this.token.hashRefresh(refreshToken);
    const guardado = await this.refreshTokens.buscar(tokenHash);
    if (!guardado) throw new NoAutenticadoError();

    if (new Date(guardado.expiresAt) <= new Date()) {
      await this.refreshTokens.eliminar(tokenHash);
      throw new NoAutenticadoError();
    }

    const usuario = await this.usuarios.buscarPorId(guardado.usuarioId);
    if (!usuario) throw new NoAutenticadoError();

    await this.refreshTokens.eliminar(tokenHash);
    return this.emitir(usuario);
  }

  private async emitir(usuario: Usuario): Promise<AutenticacionResultado> {
    const accessToken = await this.token.firmarAccess(usuario.id);
    const refreshToken = this.token.generarRefresh();
    const tokenHash = await this.token.hashRefresh(refreshToken);
    const expiresAt = new Date(
      Date.now() + REFRESH_DIAS * 24 * 60 * 60 * 1000,
    ).toISOString();

    await this.refreshTokens.guardar({ usuarioId: usuario.id, tokenHash, expiresAt });

    return { usuario, accessToken, refreshToken };
  }
}
