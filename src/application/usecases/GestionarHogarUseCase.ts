import type { Hogar } from '../../domain/entities/Hogar';
import type { GestionarHogarPort } from '../../domain/ports/in/GestionarHogarPort';
import type { HogarRepositorioPort } from '../../domain/ports/out/HogarRepositorioPort';
import type { MiembroRepositorioPort } from '../../domain/ports/out/MiembroRepositorioPort';
import type { PasswordHashPort } from '../../domain/ports/out/PasswordHashPort';
import { PasswordReglas } from '../../domain/rules/PasswordReglas';
import { CicloReglas } from '../../domain/rules/CicloReglas';
import { NoEncontradoError, NoEsMiembroError, PermisoDenegadoError } from '../../exception/errors';

export class GestionarHogarUseCase implements GestionarHogarPort {
  constructor(
    private readonly hogares: HogarRepositorioPort,
    private readonly miembros: MiembroRepositorioPort,
    private readonly passwordHash: PasswordHashPort,
  ) {}

  async crear(input: { usuarioId: string; nombre: string }): Promise<Hogar> {
    const ahora = new Date().toISOString();
    const hogar: Hogar = {
      id: crypto.randomUUID(),
      nombre: input.nombre.trim(),
      ownerId: input.usuarioId,
      inviteCode: generarCodigoInvitacion(),
      adminPasswordHash: null,
      cutoffDay: 1,
      createdAt: ahora,
    };

    await this.hogares.crear(hogar);
    await this.miembros.crear({
      id: crypto.randomUUID(),
      hogarId: hogar.id,
      usuarioId: input.usuarioId,
      rol: 'ADMIN',
      acceso: 'ESCRITURA',
      joinedAt: ahora,
    });

    return hogar;
  }

  async listar(input: { usuarioId: string }): Promise<Hogar[]> {
    return this.hogares.listarPorUsuario(input.usuarioId);
  }

  async obtener(input: { hogarId: string; usuarioId: string }): Promise<Hogar> {
    const miembro = await this.miembros.buscar(input.hogarId, input.usuarioId);
    if (!miembro) throw new NoEsMiembroError();

    const hogar = await this.hogares.obtener(input.hogarId);
    if (!hogar) throw new NoEncontradoError('Hogar no encontrado');
    return hogar;
  }

  async configurarPassword(input: {
    hogarId: string;
    usuarioId: string;
    password: string;
  }): Promise<void> {
    PasswordReglas.validar(input.password);

    const miembro = await this.miembros.buscar(input.hogarId, input.usuarioId);
    if (!miembro || miembro.rol !== 'ADMIN') throw new PermisoDenegadoError();

    const hash = await this.passwordHash.hash(input.password);
    await this.hogares.actualizarPasswordHash(input.hogarId, hash);
  }

  async configurarCorte(input: {
    hogarId: string;
    usuarioId: string;
    cutoffDay: number;
  }): Promise<Hogar> {
    CicloReglas.validarCorte(input.cutoffDay);

    const miembro = await this.miembros.buscar(input.hogarId, input.usuarioId);
    if (!miembro || miembro.rol !== 'ADMIN') throw new PermisoDenegadoError();

    const hogar = await this.hogares.obtener(input.hogarId);
    if (!hogar) throw new NoEncontradoError('Hogar no encontrado');

    await this.hogares.actualizarCorte(input.hogarId, input.cutoffDay);
    return { ...hogar, cutoffDay: input.cutoffDay };
  }
}

function generarCodigoInvitacion(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  return `ANDRO-${code}`;
}
