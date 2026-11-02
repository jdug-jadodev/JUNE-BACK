import type { UsuarioSeguridad } from '../../domain/entities/UsuarioSeguridad';
import type { SeguridadPort } from '../../domain/ports/in/SeguridadPort';
import type { PasswordHashPort } from '../../domain/ports/out/PasswordHashPort';
import type { RefreshTokenRepositorioPort } from '../../domain/ports/out/RefreshTokenRepositorioPort';
import type { UsuarioRepositorioPort } from '../../domain/ports/out/UsuarioRepositorioPort';
import { PasswordReglas } from '../../domain/rules/PasswordReglas';
import { SeguridadReglas } from '../../domain/rules/SeguridadReglas';
import {
  PasswordActualIncorrectaError,
  RecuperacionBloqueadaError,
  RecuperacionInvalidaError,
  SinLlaveRecuperacionError,
  SinPreguntaSeguridadError,
} from '../../exception/errors';

const MAX_INTENTOS = 5;
const BLOQUEO_MINUTOS = 15;

export class SeguridadUseCase implements SeguridadPort {
  constructor(
    private readonly usuarios: UsuarioRepositorioPort,
    private readonly passwordHash: PasswordHashPort,
    private readonly refreshTokens: RefreshTokenRepositorioPort,
  ) {}

  async configurar(input: {
    usuarioId: string;
    pregunta: string;
    respuesta: string;
  }): Promise<void> {
    const pregunta = SeguridadReglas.validarPregunta(input.pregunta);
    const respuesta = SeguridadReglas.validarRespuesta(input.respuesta);
    const hash = await this.passwordHash.hash(respuesta);
    await this.usuarios.actualizarPregunta(input.usuarioId, pregunta, hash);
  }

  async estado(input: { usuarioId: string }): Promise<{
    pregunta: string | null;
    tieneCodigo: boolean;
  }> {
    const seguridad = await this.usuarios.buscarSeguridadPorId(input.usuarioId);
    return {
      pregunta: seguridad?.securityQuestion ?? null,
      tieneCodigo: Boolean(seguridad?.recoveryCodeHash),
    };
  }

  async generarCodigo(input: { usuarioId: string }): Promise<string> {
    const codigo = SeguridadReglas.generarCodigo();
    const hash = await this.passwordHash.hash(SeguridadReglas.normalizarCodigo(codigo));
    await this.usuarios.actualizarCodigoRecuperacion(input.usuarioId, hash);
    return codigo;
  }

  async preguntaPorEmail(input: { email: string }): Promise<string | null> {
    const seguridad = await this.usuarios.buscarSeguridadPorEmail(
      input.email.trim().toLowerCase(),
    );
    return seguridad?.securityQuestion ?? null;
  }

  async recuperarConPregunta(input: {
    email: string;
    respuesta: string;
    passwordNueva: string;
  }): Promise<void> {
    const seguridad = await this.usuarios.buscarSeguridadPorEmail(
      input.email.trim().toLowerCase(),
    );
    if (!seguridad) {
      throw new RecuperacionInvalidaError();
    }
    if (!seguridad.securityAnswerHash || !seguridad.securityQuestion) {
      throw new SinPreguntaSeguridadError();
    }

    await this.validarNoBloqueado(seguridad);

    const respuesta = SeguridadReglas.normalizarRespuesta(input.respuesta);
    const valida = await this.passwordHash.verificar(
      respuesta,
      seguridad.securityAnswerHash,
    );
    if (!valida) await this.registrarFallo(seguridad);

    await this.aplicarNuevaPassword(seguridad.id, input.passwordNueva);
  }

  async recuperarConCodigo(input: {
    email: string;
    codigo: string;
    passwordNueva: string;
  }): Promise<void> {
    const seguridad = await this.usuarios.buscarSeguridadPorEmail(
      input.email.trim().toLowerCase(),
    );
    if (!seguridad) {
      throw new RecuperacionInvalidaError();
    }
    if (!seguridad.recoveryCodeHash) {
      throw new SinLlaveRecuperacionError();
    }

    await this.validarNoBloqueado(seguridad);

    const codigo = SeguridadReglas.normalizarCodigo(input.codigo);
    const valido = await this.passwordHash.verificar(codigo, seguridad.recoveryCodeHash);
    if (!valido) await this.registrarFallo(seguridad);

    await this.aplicarNuevaPassword(seguridad.id, input.passwordNueva);
    await this.usuarios.actualizarCodigoRecuperacion(seguridad.id, null);
  }

  async cambiarPassword(input: {
    usuarioId: string;
    passwordActual: string;
    passwordNueva: string;
  }): Promise<void> {
    const encontrado = await this.usuarios.buscarConPasswordPorId(input.usuarioId);
    if (!encontrado) throw new RecuperacionInvalidaError();

    const valida = await this.passwordHash.verificar(
      input.passwordActual,
      encontrado.passwordHash,
    );
    if (!valida) throw new PasswordActualIncorrectaError();

    PasswordReglas.validar(input.passwordNueva);
    const hash = await this.passwordHash.hash(input.passwordNueva);
    await this.usuarios.actualizarPasswordHash(input.usuarioId, hash);
    await this.usuarios.actualizarIntentoReset(input.usuarioId, 0, null);
    await this.refreshTokens.eliminarPorUsuario(input.usuarioId);
  }

  private async validarNoBloqueado(seguridad: UsuarioSeguridad): Promise<void> {
    if (
      seguridad.resetLockedUntil &&
      new Date(seguridad.resetLockedUntil) > new Date()
    ) {
      throw new RecuperacionBloqueadaError();
    }
  }

  private async registrarFallo(seguridad: UsuarioSeguridad): Promise<never> {
    const intentos = seguridad.resetAttempts + 1;
    const bloqueadoHasta =
      intentos >= MAX_INTENTOS
        ? new Date(Date.now() + BLOQUEO_MINUTOS * 60 * 1000).toISOString()
        : null;

    await this.usuarios.actualizarIntentoReset(
      seguridad.id,
      intentos,
      bloqueadoHasta,
    );

    if (bloqueadoHasta) throw new RecuperacionBloqueadaError();
    throw new RecuperacionInvalidaError();
  }

  private async aplicarNuevaPassword(
    usuarioId: string,
    passwordNueva: string,
  ): Promise<void> {
    PasswordReglas.validar(passwordNueva);
    const hash = await this.passwordHash.hash(passwordNueva);
    await this.usuarios.actualizarPasswordHash(usuarioId, hash);
    await this.usuarios.actualizarIntentoReset(usuarioId, 0, null);
    await this.refreshTokens.eliminarPorUsuario(usuarioId);
  }
}
