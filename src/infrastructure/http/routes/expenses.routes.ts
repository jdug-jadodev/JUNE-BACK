import type { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { auth } from '../middleware/auth';

const fechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const gastoSchema = z.object({
  producto: z.string().min(1),
  montoCents: z.number().int().positive(),
  fecha: fechaSchema,
});

const filtroSchema = z.object({
  desde: fechaSchema.optional(),
  hasta: fechaSchema.optional(),
});

export function expensesRoutes(app: Hono<AppEnv>): void {
  app.get('/households/:hid/expenses/months', auth, async (c) => {
    const meses = await c.var.container.consultarGastos.meses({
      hogarId: c.req.param('hid'),
      usuarioId: c.var.usuarioId,
    });
    return c.json(meses);
  });

  app.get('/households/:hid/cycles', auth, async (c) => {
    const ciclos = await c.var.container.consultarGastos.ciclos({
      hogarId: c.req.param('hid'),
      usuarioId: c.var.usuarioId,
    });
    return c.json(ciclos);
  });

  app.get('/households/:hid/expenses', auth, async (c) => {
    const filtro = filtroSchema.parse({
      desde: c.req.query('desde'),
      hasta: c.req.query('hasta'),
    });

    const gastos = await c.var.container.consultarGastos.ejecutar({
      hogarId: c.req.param('hid'),
      usuarioId: c.var.usuarioId,
      updatedAfter: c.req.query('updatedAfter'),
      desde: filtro.desde,
      hasta: filtro.hasta,
    });
    return c.json(gastos);
  });

  app.post('/households/:hid/expenses', auth, async (c) => {
    const body = gastoSchema.parse(await c.req.json());
    const gasto = await c.var.container.registrarGasto.ejecutar({
      hogarId: c.req.param('hid'),
      usuarioId: c.var.usuarioId,
      producto: body.producto,
      montoCents: body.montoCents,
      fecha: body.fecha,
    });
    return c.json(gasto, 201);
  });

  app.patch('/households/:hid/expenses/:eid', auth, async (c) => {
    const body = gastoSchema.parse(await c.req.json());
    const gasto = await c.var.container.actualizarGasto.ejecutar({
      hogarId: c.req.param('hid'),
      gastoId: c.req.param('eid'),
      usuarioId: c.var.usuarioId,
      adminPassword: c.req.header('X-Admin-Password') ?? '',
      producto: body.producto,
      montoCents: body.montoCents,
      fecha: body.fecha,
    });
    return c.json(gasto);
  });

  app.delete('/households/:hid/expenses/:eid', auth, async (c) => {
    await c.var.container.eliminarGasto.ejecutar({
      hogarId: c.req.param('hid'),
      gastoId: c.req.param('eid'),
      usuarioId: c.var.usuarioId,
      adminPassword: c.req.header('X-Admin-Password') ?? '',
    });
    return c.body(null, 204);
  });
}
