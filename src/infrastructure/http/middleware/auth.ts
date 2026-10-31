import type { MiddlewareHandler } from 'hono';
import { NoAutenticadoError } from '../../../exception/errors';
import type { AppEnv } from '../types';

export const auth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header('Authorization') ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new NoAutenticadoError();
  }

  const usuarioId = await c.var.container.token.verificarAccess(token);
  c.set('usuarioId', usuarioId);
  await next();
};
