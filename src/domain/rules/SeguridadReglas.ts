import { SeguridadInvalidaError } from '../../exception/errors';

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function aleatorio(cantidad: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(cantidad));
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
}

export const SeguridadReglas = {
  normalizarRespuesta(respuesta: string): string {
    return respuesta
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  },

  validarPregunta(pregunta: string): string {
    const limpia = pregunta.trim();
    if (limpia.length < 5 || limpia.length > 120) {
      throw new SeguridadInvalidaError('La pregunta debe tener entre 5 y 120 caracteres');
    }
    return limpia;
  },

  validarRespuesta(respuesta: string): string {
    const limpia = this.normalizarRespuesta(respuesta);
    if (limpia.length < 2) {
      throw new SeguridadInvalidaError('La respuesta debe tener al menos 2 caracteres');
    }
    return limpia;
  },

  normalizarCodigo(codigo: string): string {
    return codigo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  },

  generarCodigo(): string {
    const parte = aleatorio(8);
    return `CAUCE-${parte.slice(0, 4)}-${parte.slice(4)}`;
  },

  generarPasswordTemporal(): string {
    return `Cauce-${aleatorio(6)}`;
  },
};
