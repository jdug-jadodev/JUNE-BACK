import type { CategoriaPersonalizada } from '../../domain/entities/CategoriaPersonalizada';
import type {
  CategoriaPersonalizadaDto,
  GestionarCategoriasPort,
} from '../../domain/ports/in/GestionarCategoriasPort';
import type { CategoriaPersonalizadaRepositorioPort } from '../../domain/ports/out/CategoriaPersonalizadaRepositorioPort';
import type { MiembroRepositorioPort } from '../../domain/ports/out/MiembroRepositorioPort';
import { normalizarTermino } from '../../domain/rules/Clasificador';
import {
  ConflictoError,
  DomainError,
  NoEsMiembroError,
  SoloLecturaError,
} from '../../exception/errors';

const MAX_NOMBRE = 40;
const MIN_NOMBRE = 2;
const CATEGORIA_NOMBRE = 'Personalizada';

function aDto(categoria: CategoriaPersonalizada): CategoriaPersonalizadaDto {
  return {
    id: categoria.id,
    nombre: categoria.nombre,
    categoria: categoria.id,
    categoriaNombre: CATEGORIA_NOMBRE,
    esGusto: categoria.esGusto,
  };
}

export class GestionarCategoriasUseCase implements GestionarCategoriasPort {
  constructor(
    private readonly miembros: MiembroRepositorioPort,
    private readonly categorias: CategoriaPersonalizadaRepositorioPort,
  ) {}

  async listar(input: {
    hogarId: string;
    usuarioId: string;
  }): Promise<CategoriaPersonalizadaDto[]> {
    const miembro = await this.miembros.buscar(input.hogarId, input.usuarioId);
    if (!miembro) throw new NoEsMiembroError();

    const categorias = await this.categorias.listar(input.hogarId);
    return categorias.map(aDto);
  }

  async crear(input: {
    hogarId: string;
    usuarioId: string;
    nombre: string;
  }): Promise<CategoriaPersonalizadaDto> {
    const miembro = await this.miembros.buscar(input.hogarId, input.usuarioId);
    if (!miembro) throw new NoEsMiembroError();
    if (miembro.acceso !== 'ESCRITURA') throw new SoloLecturaError();

    const nombre = input.nombre.trim().replace(/\s+/g, ' ');
    const normalizado = normalizarTermino(nombre);
    if (nombre.length < MIN_NOMBRE || nombre.length > MAX_NOMBRE || !normalizado) {
      throw new DomainError(
        'CATEGORIA_INVALIDA',
        `El nombre debe tener entre ${MIN_NOMBRE} y ${MAX_NOMBRE} caracteres`,
        400,
      );
    }

    const existentes = await this.categorias.listar(input.hogarId);
    if (existentes.some((c) => normalizarTermino(c.nombre) === normalizado)) {
      throw new ConflictoError('Ya tienes una categoría con ese nombre');
    }

    const categoria: CategoriaPersonalizada = {
      id: `cat:${crypto.randomUUID()}`,
      hogarId: input.hogarId,
      nombre,
      tipo: 'VARIABLE',
      esGusto: false,
      createdAt: new Date().toISOString(),
    };

    await this.categorias.crear(categoria);
    return aDto(categoria);
  }
}
