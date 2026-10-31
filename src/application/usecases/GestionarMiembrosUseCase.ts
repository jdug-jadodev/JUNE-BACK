import type { Hogar } from '../../domain/entities/Hogar';
import type { Miembro } from '../../domain/entities/Miembro';
import type { GestionarMiembrosPort } from '../../domain/ports/in/GestionarMiembrosPort';
import type { HogarRepositorioPort } from '../../domain/ports/out/HogarRepositorioPort';
import type { MiembroRepositorioPort } from '../../domain/ports/out/MiembroRepositorioPort';
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
}
