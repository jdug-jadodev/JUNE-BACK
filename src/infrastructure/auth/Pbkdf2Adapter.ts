import type { PasswordHashPort } from '../../domain/ports/out/PasswordHashPort';

const ITERACIONES = 100_000;
const LONGITUD_CLAVE = 32;

function aBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function desdeBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

async function derivar(
  password: string,
  salt: Uint8Array,
  iteraciones: number,
): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: iteraciones, hash: 'SHA-256' },
    material,
    LONGITUD_CLAVE * 8,
  );

  return new Uint8Array(bits);
}

export class Pbkdf2Adapter implements PasswordHashPort {
  async hash(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const clave = await derivar(password, salt, ITERACIONES);
    return `pbkdf2$${ITERACIONES}$${aBase64(salt)}$${aBase64(clave)}`;
  }

  async verificar(password: string, hash: string): Promise<boolean> {
    const [algoritmo, iteraciones, saltB64, claveB64] = hash.split('$');
    if (algoritmo !== 'pbkdf2' || !iteraciones || !saltB64 || !claveB64) return false;

    const salt = desdeBase64(saltB64);
    const clave = await derivar(password, salt, Number(iteraciones));
    return aBase64(clave) === claveB64;
  }
}
