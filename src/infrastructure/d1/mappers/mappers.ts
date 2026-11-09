import type { Gasto } from '../../../domain/entities/Gasto';
import type { Hogar } from '../../../domain/entities/Hogar';
import type { Miembro } from '../../../domain/entities/Miembro';
import type { Usuario } from '../../../domain/entities/Usuario';
import type { Acceso } from '../../../domain/enums/Acceso';
import type { Rol } from '../../../domain/enums/Rol';

export interface UsuarioRow {
  id: string;
  email: string;
  nombre: string;
  password_hash: string;
  security_question: string | null;
  security_answer_hash: string | null;
  recovery_code_hash: string | null;
  reset_attempts: number;
  reset_locked_until: string | null;
  created_at: string;
}

export interface HogarRow {
  id: string;
  nombre: string;
  owner_id: string;
  invite_code: string;
  admin_password_hash: string | null;
  cutoff_day: number;
  created_at: string;
  plan: string | null;
  plan_expires_at: string | null;
  plan_source: string | null;
}

export interface MiembroRow {
  id: string;
  household_id: string;
  user_id: string;
  role: string;
  access_level: string;
  joined_at: string;
  nombre: string | null;
  email: string | null;
}

export interface GastoRow {
  id: string;
  household_id: string;
  producto: string;
  monto_cents: number;
  fecha: string;
  created_by: string;
  created_by_nombre: string | null;
  created_at: string;
  updated_at: string;
}

export const UsuarioMapper = {
  toDomain(row: UsuarioRow): Usuario {
    return {
      id: row.id,
      email: row.email,
      nombre: row.nombre,
      createdAt: row.created_at,
    };
  },
};

export const HogarMapper = {
  toDomain(row: HogarRow): Hogar {
    return {
      id: row.id,
      nombre: row.nombre,
      ownerId: row.owner_id,
      inviteCode: row.invite_code,
      adminPasswordHash: row.admin_password_hash,
      cutoffDay: row.cutoff_day ?? 1,
      createdAt: row.created_at,
      plan: (row.plan ?? 'FREE') as Hogar['plan'],
      planExpiresAt: row.plan_expires_at ?? null,
      planSource: row.plan_source ?? null,
    };
  },
};

export const MiembroMapper = {
  toDomain(row: MiembroRow): Miembro {
    return {
      id: row.id,
      hogarId: row.household_id,
      usuarioId: row.user_id,
      nombre: row.nombre ?? undefined,
      email: row.email ?? undefined,
      rol: row.role as Rol,
      acceso: (row.access_level as Acceso) ?? 'ESCRITURA',
      joinedAt: row.joined_at,
    };
  },
};

export const GastoMapper = {
  toDomain(row: GastoRow): Gasto {
    return {
      id: row.id,
      hogarId: row.household_id,
      producto: row.producto,
      montoCents: row.monto_cents,
      fecha: row.fecha,
      creadoPor: row.created_by,
      creadoPorNombre: row.created_by_nombre ?? 'Miembro',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
};
