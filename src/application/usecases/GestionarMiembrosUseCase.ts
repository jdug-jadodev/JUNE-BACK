import type { Hogar } from '../../domain/entities/Hogar';
import type { Miembro } from '../../domain/entities/Miembro';
import type { Acceso } from '../../domain/enums/Acceso';
import type { Rol } from '../../domain/enums/Rol';
import type { GestionarMiembrosPort } from '../../domain/ports/in/GestionarMiembrosPort';
import type { HogarRepositorioPort } from '../../domain/ports/out/HogarRepositorioPort';
import type { MiembroRepositorioPort } from '../../domain/ports/out/MiembroRepositorioPort';
import type { PasswordHashPort } from '../../domain/ports/out/PasswordHashPort';
import type { RefreshTokenRepositorioPort } from '../../domain/ports/out/RefreshTokenRepositorioPort';
import type { UsuarioRepositorioPort } from '../../domain/ports/out/UsuarioRepositorioPort';
import { SeguridadReglas } from '../../domain/rules/SeguridadReglas';
import {
  ConflictoError,
  NoEncontradoError,
  NoEsMiembroError,
  PermisoDenegadoError,
} from '../../exception/errors';

export class GestionarMiembrosUseCase implements GestionarMiembrosPort {
  constructor(
    private readonly miembros: MiembroRepositorioPort,
    private readonly hogares: HogarRepositorioPort,
    private readonly usuarios: UsuarioRepositorioPort,
    private readonly passwordHash: PasswordHashPort,
    private readonly refreshTokens: RefreshTokenRepositorioPort,
  ) {}

  async listar(input: { hogarId: string; usuarioId: string }): Promise<Miembro[]> {
    const miembro = await this.miembros.buscar(input.hogarId, input.usuarioId);
    if (!miembro) throw new NoEsMiembroError();
    return this.miembros.listar(input.hogarId);
  }

  async unirse(input: { usuarioId: string; inviteCode: string }): Promise<Hogar> {
    const hogar = await this.hogares.buscarPorInviteCode(input.inviteCode.trim().toUpperCase());
    if (!hogar) throw new NoEncontradoError('Código de invitación inválido');

    const existente = await this.miembros.buscar(hogar.id, input.usuarioId);
    if (existente) throw new ConflictoError('Ya perteneces a este hogar');

    await this.miembros.crear({
      id: crypto.randomUUID(),
      hogarId: hogar.id,
      usuarioId: input.usuarioId,
      rol: 'MIEMBRO',
      acceso: 'ESCRITURA',
      joinedAt: new Date().toISOString(),
    });

    return hogar;
  }

  async eliminar(input: {
    hogarId: string;
    miembroId: string;
    usuarioId: string;
  }): Promise<void> {
    const solicitante = await this.miembros.buscar(input.hogarId, input.usuarioId);
    if (!solicitante || solicitante.rol !== 'ADMIN') throw new PermisoDenegadoError();
    if (solicitante.id === input.miembroId) {
      throw new ConflictoError('No puedes eliminarte a ti mismo');
    }

    await this.miembros.eliminar(input.miembroId);
  }

  async cambiarAcceso(input: {
    hogarId: string;
    miembroId: string;
    usuarioId: string;
    acceso: Acceso;
  }): Promise<void> {
    const solicitante = await this.miembros.buscar(input.hogarId, input.usuarioId);
    if (!solicitante || solicitante.rol !== 'ADMIN') throw new PermisoDenegadoError();

    const objetivo = (await this.miembros.listar(input.hogarId)).find(
      (miembro) => miembro.id === input.miembroId,
    );
    if (!objetivo) throw new NoEncontradoError('Miembro no encontrado');

    if (objetivo.rol === 'ADMIN') {
      throw new ConflictoError('El administrador siempre puede escribir');
    }

    await this.miembros.actualizarAcceso(input.miembroId, input.acceso);
  }

  async restablecerPassword(input: {
    hogarId: string;
    miembroId: string;
    usuarioId: string;
  }): Promise<string> {
    const solicitante = await this.miembros.buscar(input.hogarId, input.usuarioId);
    if (!solicitante || solicitante.rol !== 'ADMIN') throw new PermisoDenegadoError();

    const objetivo = (await this.miembros.listar(input.hogarId)).find(
      (miembro) => miembro.id === input.miembroId,
    );
    if (!objetivo) throw new NoEncontradoError('Miembro no encontrado');

    if (objetivo.usuarioId === input.usuarioId) {
      throw new ConflictoError('Usa "Cambiar mi contraseña" para tu propia cuenta');
    }

    const temporal = SeguridadReglas.generarPasswordTemporal();
    const hash = await this.passwordHash.hash(temporal);
    await this.usuarios.actualizarPasswordHash(objetivo.usuarioId, hash);
    await this.usuarios.actualizarIntentoReset(objetivo.usuarioId, 0, null);
    await this.refreshTokens.eliminarPorUsuario(objetivo.usuarioId);

    return temporal;
  }

  async cambiarRol(input: {
    hogarId: string;
    miembroId: string;
    usuarioId: string;
    rol: Rol;
  }): Promise<void> {
    const solicitante = await this.miembros.buscar(input.hogarId, input.usuarioId);
    if (!solicitante || solicitante.rol !== 'ADMIN') throw new PermisoDenegadoError();

    const objetivo = (await this.miembros.listar(input.hogarId)).find(
      (miembro) => miembro.id === input.miembroId,
    );
    if (!objetivo) throw new NoEncontradoError('Miembro no encontrado');

    if (objetivo.id === solicitante.id) {
      throw new ConflictoError('No puedes cambiar tu propio rol');
    }

    const hogar = await this.hogares.obtener(input.hogarId);
    if (!hogar) throw new NoEncontradoError('Hogar no encontrado');

    if (objetivo.usuarioId === hogar.ownerId && input.rol !== 'ADMIN') {
      throw new ConflictoError('El dueño del hogar debe seguir siendo administrador');
    }

    await this.miembros.actualizarRol(input.miembroId, input.rol);
    if (input.rol === 'ADMIN') {
      await this.miembros.actualizarAcceso(input.miembroId, 'ESCRITURA');
    }
  }
}
