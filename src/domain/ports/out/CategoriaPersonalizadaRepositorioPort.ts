import type { CategoriaPersonalizada } from '../../entities/CategoriaPersonalizada';

export interface CategoriaPersonalizadaRepositorioPort {
  listar(hogarId: string): Promise<CategoriaPersonalizada[]>;
  obtener(hogarId: string, id: string): Promise<CategoriaPersonalizada | null>;
  crear(categoria: CategoriaPersonalizada): Promise<void>;
}
