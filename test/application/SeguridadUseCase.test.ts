import { describe, expect, it, vi } from 'vitest';
import { SeguridadUseCase } from '../../src/application/usecases/SeguridadUseCase';
import type { UsuarioSeguridad } from '../../src/domain/entities/UsuarioSeguridad';
import type { PasswordHashPort } from '../../src/domain/ports/out/PasswordHashPort';
import type { RefreshTokenRepositorioPort } from '../../src/domain/ports/out/RefreshTokenRepositorioPort';
import type { UsuarioRepositorioPort } from '../../src/domain/ports/out/UsuarioRepositorioPort';
import {
  PasswordActualIncorrectaError,
  RecuperacionBloqueadaError,
  RecuperacionInvalidaError,
} from '../../src/exception/errors';

const seguridad: UsuarioSeguridad = {
  id: 'u1',
  email: 'ana@test.com',
  securityQuestion: 'Cual es tu ciudad',
  securityAnswerHash: 'hash-respuesta',
  recoveryCodeHash: 'hash-codigo',
  resetAttempts: 0,
  resetLockedUntil: null,
};

function crearCaso(opciones?: {
  bloqueadoHasta?: string;
  respuestaValida?: boolean;
  codigoValido?: boolean;
  passwordActualValida?: boolean;
}) {
  const actualizarPregunta = vi.fn(async () => {});
  const actualizarCodigoRecuperacion = vi.fn(async () => {});
  const actualizarPasswordHash = vi.fn(async () => {});
  const actualizarIntentoReset = vi.fn(async () => {});
  const eliminarPorUsuario = vi.fn(async () => {});

  const usuarios = {
    buscarSeguridadPorEmail: async () => ({
      ...seguridad,
      resetLockedUntil: opciones?.bloqueadoHasta ?? null,
    }),
    buscarSeguridadPorId: async () => seguridad,
    buscarConPasswordPorId: async () => ({
      usuario: { id: 'u1', email: 'ana@test.com', nombre: 'Ana', createdAt: '' },
      passwordHash: 'hash-actual',
    }),
    actualizarPregunta,
    actualizarCodigoRecuperacion,
    actualizarPasswordHash,
    actualizarIntentoReset,
  } as unknown as UsuarioRepositorioPort;

  const passwordHash = {
    hash: vi.fn(async (valor: string) => `hash:${valor}`),
    verificar: vi.fn(async (valor: string) => {
      if (valor === 'cali') return opciones?.respuestaValida ?? true;
      if (valor.startsWith('CAUCE')) return opciones?.codigoValido ?? true;
      if (valor === 'actual') return opciones?.passwordActualValida ?? true;
      return false;
    }),
  } as unknown as PasswordHashPort;

  const refreshTokens = {
    eliminarPorUsuario,
  } as unknown as RefreshTokenRepositorioPort;

  return {
    useCase: new SeguridadUseCase(usuarios, passwordHash, refreshTokens),
    actualizarPregunta,
    actualizarCodigoRecuperacion,
    actualizarPasswordHash,
    actualizarIntentoReset,
    eliminarPorUsuario,
  };
}

describe('SeguridadUseCase', () => {
  it('guarda la pregunta con la respuesta cifrada', async () => {
    const { useCase, actualizarPregunta } = crearCaso();

    await useCase.configurar({
      usuarioId: 'u1',
      pregunta: 'Cual es tu ciudad',
      respuesta: 'Cali',
    });

    expect(actualizarPregunta).toHaveBeenCalledWith(
      'u1',
      'Cual es tu ciudad',
      'hash:cali',
    );
  });

  it('restablece la contraseña con la respuesta correcta', async () => {
    const { useCase, actualizarPasswordHash, actualizarIntentoReset, eliminarPorUsuario } =
      crearCaso();

    await useCase.recuperarConPregunta({
      email: 'ana@test.com',
      respuesta: 'Cali',
      passwordNueva: 'Nueva123!',
    });

    expect(actualizarPasswordHash).toHaveBeenCalledWith('u1', 'hash:Nueva123!');
    expect(actualizarIntentoReset).toHaveBeenCalledWith('u1', 0, null);
    expect(eliminarPorUsuario).toHaveBeenCalledWith('u1');
  });

  it('rechaza una respuesta incorrecta y suma un intento', async () => {
    const { useCase, actualizarIntentoReset } = crearCaso({ respuestaValida: false });

    await expect(
      useCase.recuperarConPregunta({
        email: 'ana@test.com',
        respuesta: 'Bogota',
        passwordNueva: 'Nueva123!',
      }),
    ).rejects.toBeInstanceOf(RecuperacionInvalidaError);

    expect(actualizarIntentoReset).toHaveBeenCalledWith('u1', 1, null);
  });

  it('bloquea si ya hay demasiados intentos', async () => {
    const { useCase } = crearCaso({
      bloqueadoHasta: new Date(Date.now() + 60_000).toISOString(),
    });

    await expect(
      useCase.recuperarConPregunta({
        email: 'ana@test.com',
        respuesta: 'Cali',
        passwordNueva: 'Nueva123!',
      }),
    ).rejects.toBeInstanceOf(RecuperacionBloqueadaError);
  });

  it('genera una llave y guarda su hash', async () => {
    const { useCase, actualizarCodigoRecuperacion } = crearCaso();

    const codigo = await useCase.generarCodigo({ usuarioId: 'u1' });

    expect(codigo).toMatch(/^CAUCE-/);
    expect(actualizarCodigoRecuperacion).toHaveBeenCalledWith(
      'u1',
      expect.stringContaining('hash:CAUCE'),
    );
  });

  it('restablece con la llave y la invalida', async () => {
    const { useCase, actualizarPasswordHash, actualizarCodigoRecuperacion } = crearCaso();

    await useCase.recuperarConCodigo({
      email: 'ana@test.com',
      codigo: 'CAUCE-AAAA-BBBB',
      passwordNueva: 'Nueva123!',
    });

    expect(actualizarPasswordHash).toHaveBeenCalledWith('u1', 'hash:Nueva123!');
    expect(actualizarCodigoRecuperacion).toHaveBeenCalledWith('u1', null);
  });

  it('rechaza cambiar la contraseña si la actual no coincide', async () => {
    const { useCase } = crearCaso({ passwordActualValida: false });

    await expect(
      useCase.cambiarPassword({
        usuarioId: 'u1',
        passwordActual: 'incorrecta',
        passwordNueva: 'Nueva123!',
      }),
    ).rejects.toBeInstanceOf(PasswordActualIncorrectaError);
  });
});
