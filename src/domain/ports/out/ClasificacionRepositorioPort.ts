import type { ClasificacionHogar } from '../../entities/ClasificacionHogar';

export interface ClasificacionRepositorioPort {
  listar(hogarId: string): Promise<ClasificacionHogar[]>;
  guardar(input: {
    hogarId: string;
    termino: string;
    conceptoId: string;
    nota: string | null;
  }): Promise<void>;
}
