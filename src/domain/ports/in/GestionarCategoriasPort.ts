export interface CategoriaPersonalizadaDto {
  id: string;
  nombre: string;
  categoria: string;
  categoriaNombre: string;
  esGusto: boolean;
}

export interface GestionarCategoriasPort {
  listar(input: { hogarId: string; usuarioId: string }): Promise<CategoriaPersonalizadaDto[]>;
  crear(input: {
    hogarId: string;
    usuarioId: string;
    nombre: string;
  }): Promise<CategoriaPersonalizadaDto>;
}
