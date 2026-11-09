import type { Plan } from '../enums/Plan';

export interface Hogar {
  id: string;
  nombre: string;
  ownerId: string;
  inviteCode: string;
  adminPasswordHash: string | null;
  cutoffDay: number;
  createdAt: string;
  /** Plan de suscripción del hogar. */
  plan: Plan;
  /** Fecha de vencimiento del plan pago, si aplica. */
  planExpiresAt?: string | null;
  /** Origen del plan: PLAY | FOUNDER | MANUAL | BECA. */
  planSource?: string | null;
}
