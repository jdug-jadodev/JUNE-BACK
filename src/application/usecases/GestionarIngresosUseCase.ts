import type { Ingreso, Periodicidad } from '../../domain/entities/Ingreso';
import type { GestionarIngresosPort } from '../../domain/ports/in/GestionarIngresosPort';
import type { IngresoRepositorioPort } from '../../domain/ports/out/IngresoRepositorioPort';
import type { MiembroRepositorioPort } from '../../domain/ports/out/MiembroRepositorioPort';
import {
  DomainError,
  NoEncontradoError,
  PermisoDenegadoError,
} from '../../exception/errors';

const MAX_NOMBRE = 60;
const PERIODICIDADES: Periodicidad[] = ['MENSUAL', 'QUINCENAL'];

export class GestionarIngresosUseCase implements GestionarIngresosPort {
  constructor(
    private readonly miembros: MiembroRepositorioPort,
    private readonly ingresos: IngresoRepositorioPort,
  ) {}

  async listar(input: { hogarId: string; usuarioId: string }): Promise<Ingreso[]> {
    await this.requiereAdmin(input.hogarId, input.usuarioId);
    return this.ingresos.listar(input.hogarId);
  }

  async crear(input: {
    hogarId: string;
    usuarioId: string;
    nombre?: string | null;
    montoCents: number;
    periodicidad: Periodicidad;
  }): Promise<Ingreso> {
    await this.requiereAdmin(input.hogarId, input.usuarioId);
    const { nombre, montoCents, periodicidad } = this.validar(input);

    const ahora = new Date().toISOString();
    const ingreso: Ingreso = {
      id: crypto.randomUUID(),
      hogarId: input.hogarId,
      nombre,
      montoCents,
      periodicidad,
      createdAt: ahora,
      updatedAt: ahora,
    };

    await this.ingresos.crear(ingreso);
    return ingreso;
  }

  async actualizar(input: {
    hogarId: string;
    usuarioId: string;
    ingresoId: string;
    nombre?: string | null;
    montoCents: number;
    periodicidad: Periodicidad;
  }): Promise<Ingreso> {
    await this.requiereAdmin(input.hogarId, input.usuarioId);

    const actual = await this.ingresos.obtener(input.ingresoId);
    if (!actual || actual.hogarId !== input.hogarId) {
      throw new NoEncontradoError('Ingreso no encontrado');
    }

    const { nombre, montoCents, periodicidad } = this.validar(input);
    const ingreso: Ingreso = {
      ...actual,
      nombre,
      montoCents,
      periodicidad,
      updatedAt: new Date().toISOString(),
    };

    await this.ingresos.actualizar(ingreso);
    return ingreso;
  }

  async eliminar(input: {
    hogarId: string;
    usuarioId: string;
    ingresoId: string;
  }): Promise<void> {
    await this.requiereAdmin(input.hogarId, input.usuarioId);

    const actual = await this.ingresos.obtener(input.ingresoId);
    if (!actual || actual.hogarId !== input.hogarId) {
      throw new NoEncontradoError('Ingreso no encontrado');
    }

    await this.ingresos.eliminar(input.ingresoId);
  }

  private async requiereAdmin(hogarId: string, usuarioId: string): Promise<void> {
    const miembro = await this.miembros.buscar(hogarId, usuarioId);
    if (!miembro) throw new DomainError('NO_ES_MIEMBRO', 'No perteneces a este hogar', 403);
    if (miembro.rol !== 'ADMIN') throw new PermisoDenegadoError();
  }

  private validar(input: {
    nombre?: string | null;
    montoCents: number;
    periodicidad: Periodicidad;
  }): { nombre: string | null; montoCents: number; periodicidad: Periodicidad } {
    const montoCents = input.montoCents;
    if (!Number.isInteger(montoCents) || montoCents <= 0) {
      throw new DomainError('INGRESO_INVALIDO', 'El monto debe ser un valor positivo', 400);
    }

    if (!PERIODICIDADES.includes(input.periodicidad)) {
      throw new DomainError('INGRESO_INVALIDO', 'La periodicidad debe ser mensual o quincenal', 400);
    }

    const nombre = input.nombre?.trim().slice(0, MAX_NOMBRE) || null;

    return { nombre, montoCents, periodicidad: input.periodicidad };
  }
}
