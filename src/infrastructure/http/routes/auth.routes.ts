import type { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../types';

const registroSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nombre: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export function authRoutes(app: Hono<AppEnv>): void {
  app.post('/auth/register', async (c) => {
    const body = registroSchema.parse(await c.req.json());
    const resultado = await c.var.container.autenticacion.registrar(body);
    return c.json(resultado, 201);
  });

  app.post('/auth/login', async (c) => {
    const body = loginSchema.parse(await c.req.json());
    const resultado = await c.var.container.autenticacion.login(body);
    return c.json(resultado);
  });

  app.post('/auth/refresh', async (c) => {
    const body = refreshSchema.parse(await c.req.json());
    const resultado = await c.var.container.autenticacion.refrescar(body.refreshToken);
    return c.json(resultado);
  });
}
