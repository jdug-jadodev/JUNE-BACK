import type { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { auth } from '../middleware/auth';

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

const seguridadSchema = z.object({
  pregunta: z.string().min(5).max(120),
  respuesta: z.string().min(2),
});

const emailSchema = z.object({
  email: z.string().email(),
});

const resetPreguntaSchema = z.object({
  email: z.string().email(),
  respuesta: z.string().min(1),
  passwordNueva: z.string().min(8),
});

const resetCodigoSchema = z.object({
  email: z.string().email(),
  codigo: z.string().min(1),
  passwordNueva: z.string().min(8),
});

const cambiarPasswordSchema = z.object({
  passwordActual: z.string().min(1),
  passwordNueva: z.string().min(8),
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

  app.get('/auth/security', auth, async (c) => {
    const estado = await c.var.container.seguridad.estado({
      usuarioId: c.var.usuarioId,
    });
    return c.json(estado);
  });

  app.post('/auth/security', auth, async (c) => {
    const body = seguridadSchema.parse(await c.req.json());
    await c.var.container.seguridad.configurar({
      usuarioId: c.var.usuarioId,
      pregunta: body.pregunta,
      respuesta: body.respuesta,
    });
    return c.body(null, 204);
  });

  app.post('/auth/recovery-code', auth, async (c) => {
    const codigo = await c.var.container.seguridad.generarCodigo({
      usuarioId: c.var.usuarioId,
    });
    return c.json({ codigo });
  });

  app.post('/auth/security-question', async (c) => {
    const body = emailSchema.parse(await c.req.json());
    const pregunta = await c.var.container.seguridad.preguntaPorEmail({
      email: body.email,
    });
    return c.json({ pregunta });
  });

  app.post('/auth/reset-password', async (c) => {
    const body = resetPreguntaSchema.parse(await c.req.json());
    await c.var.container.seguridad.recuperarConPregunta(body);
    return c.body(null, 204);
  });

  app.post('/auth/reset-password-code', async (c) => {
    const body = resetCodigoSchema.parse(await c.req.json());
    await c.var.container.seguridad.recuperarConCodigo(body);
    return c.body(null, 204);
  });

  app.post('/auth/change-password', auth, async (c) => {
    const body = cambiarPasswordSchema.parse(await c.req.json());
    await c.var.container.seguridad.cambiarPassword({
      usuarioId: c.var.usuarioId,
      passwordActual: body.passwordActual,
      passwordNueva: body.passwordNueva,
    });
    return c.body(null, 204);
  });
}
