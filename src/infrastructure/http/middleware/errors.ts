import type { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ZodError } from 'zod';
import { DomainError } from '../../../exception/errors';
import type { AppEnv } from '../types';

export function registerErrorHandler(app: Hono<AppEnv>): void {
  app.onError((err, c) => {
    if (err instanceof ZodError) {
      const primero = err.issues[0];
      return c.json(
        { code: 'VALIDACION', message: primero?.message ?? 'Datos inválidos' },
        400,
      );
    }

    if (err instanceof DomainError) {
      return c.json({ code: err.code, message: err.message }, err.status as ContentfulStatusCode);
    }

    console.error('Error no controlado:', err);
    return c.json(
      { code: 'ERROR_INTERNO', message: 'Error interno del servidor' },
      500,
    );
  });
}
