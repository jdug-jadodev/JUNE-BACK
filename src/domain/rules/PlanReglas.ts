import type { Plan } from '../enums/Plan';
import type { Hogar } from '../entities/Hogar';

/**
 * Reglas de acceso por plan. El gating vive en el backend, no en la app.
 */
export function esPremium(hogar: Hogar | null | undefined): boolean {
  return hogar?.plan === 'PREMIUM';
}

export function planEfectivo(hogar: Hogar | null | undefined): Plan {
  return hogar?.plan ?? 'FREE';
}
