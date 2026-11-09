import type { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { auth } from '../middleware/auth';

const crearHogarSchema = z.object({
  nombre: z.string().min(1),
});

const unirseSchema = z.object({
  inviteCode: z.string().min(1),
});

const passwordSchema = z.object({
  password: z.string().min(8),
});

const corteSchema = z.object({
  cutoffDay: z.number().int().min(1).max(31),
});

const accesoSchema = z.object({
  acceso: z.enum(['LECTURA', 'ESCRITURA']),
});

const rolSchema = z.object({
  rol: z.enum(['ADMIN', 'MIEMBRO']),
});

const planSchema = z.object({
  plan: z.enum(['FREE', 'PREMIUM']),
});

export function householdsRoutes(app: Hono<AppEnv>): void {
  app.get('/households', auth, async (c) => {
    const hogares = await c.var.container.gestionarHogar.listar({
      usuarioId: c.var.usuarioId,
    });
    return c.json(hogares);
  });

  app.post('/households', auth, async (c) => {
    const body = crearHogarSchema.parse(await c.req.json());
    const hogar = await c.var.container.gestionarHogar.crear({
      usuarioId: c.var.usuarioId,
      nombre: body.nombre,
    });
    return c.json(hogar, 201);
  });

  app.post('/households/join', auth, async (c) => {
    const body = unirseSchema.parse(await c.req.json());
    const hogar = await c.var.container.gestionarMiembros.unirse({
      usuarioId: c.var.usuarioId,
      inviteCode: body.inviteCode,
    });
    return c.json(hogar);
  });

  app.get('/households/:hid', auth, async (c) => {
    const hogar = await c.var.container.gestionarHogar.obtener({
      hogarId: c.req.param('hid'),
      usuarioId: c.var.usuarioId,
    });
    return c.json(hogar);
  });

  app.post('/households/:hid/admin-password', auth, async (c) => {
    const body = passwordSchema.parse(await c.req.json());
    await c.var.container.gestionarHogar.configurarPassword({
      hogarId: c.req.param('hid'),
      usuarioId: c.var.usuarioId,
      password: body.password,
    });
    return c.body(null, 204);
  });

  app.patch('/households/:hid/cutoff', auth, async (c) => {
    const body = corteSchema.parse(await c.req.json());
    const hogar = await c.var.container.gestionarHogar.configurarCorte({
      hogarId: c.req.param('hid'),
      usuarioId: c.var.usuarioId,
      cutoffDay: body.cutoffDay,
    });
    return c.json(hogar);
  });

  app.patch('/households/:hid/plan', auth, async (c) => {
    const body = planSchema.parse(await c.req.json());
    const hogar = await c.var.container.gestionarHogar.configurarPlan({
      hogarId: c.req.param('hid'),
      usuarioId: c.var.usuarioId,
      plan: body.plan,
    });
    return c.json(hogar);
  });

  app.get('/households/:hid/members', auth, async (c) => {
    const miembros = await c.var.container.gestionarMiembros.listar({
      hogarId: c.req.param('hid'),
      usuarioId: c.var.usuarioId,
    });
    return c.json(miembros);
  });

  app.get('/households/:hid/export.csv', auth, async (c) => {
    const monthsParam = c.req.query('months');
    const meses = monthsParam
      ? monthsParam.split(',').map((mes) => mes.trim()).filter(Boolean)
      : undefined;

    const cyclesParam = c.req.query('ciclos');
    const ciclos = cyclesParam
      ? z
          .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
          .parse(cyclesParam.split(',').map((ciclo) => ciclo.trim()).filter(Boolean))
      : undefined;

    const csv = await c.var.container.exportarGastos.ejecutar({
      hogarId: c.req.param('hid'),
      usuarioId: c.var.usuarioId,
      meses,
      ciclos,
    });
    return c.body(csv, 200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="gastos_cauce.csv"',
    });
  });

  app.delete('/households/:hid/members/:mid', auth, async (c) => {
    await c.var.container.gestionarMiembros.eliminar({
      hogarId: c.req.param('hid'),
      miembroId: c.req.param('mid'),
      usuarioId: c.var.usuarioId,
    });
    return c.body(null, 204);
  });

  app.patch('/households/:hid/members/:mid/access', auth, async (c) => {
    const body = accesoSchema.parse(await c.req.json());
    await c.var.container.gestionarMiembros.cambiarAcceso({
      hogarId: c.req.param('hid'),
      miembroId: c.req.param('mid'),
      usuarioId: c.var.usuarioId,
      acceso: body.acceso,
    });
    return c.body(null, 204);
  });

  app.post('/households/:hid/members/:mid/reset-password', auth, async (c) => {
    const passwordTemporal = await c.var.container.gestionarMiembros.restablecerPassword({
      hogarId: c.req.param('hid'),
      miembroId: c.req.param('mid'),
      usuarioId: c.var.usuarioId,
    });
    return c.json({ passwordTemporal });
  });

  app.patch('/households/:hid/members/:mid/role', auth, async (c) => {
    const body = rolSchema.parse(await c.req.json());
    await c.var.container.gestionarMiembros.cambiarRol({
      hogarId: c.req.param('hid'),
      miembroId: c.req.param('mid'),
      usuarioId: c.var.usuarioId,
      rol: body.rol,
    });
    return c.body(null, 204);
  });
}
