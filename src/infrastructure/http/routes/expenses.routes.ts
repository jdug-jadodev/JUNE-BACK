import type { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { auth } from '../middleware/auth';

const gastoSchema = z.object({
  producto: z.string().min(1),
  montoCents: z.number().int().positive(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export function expensesRoutes(app: Hono<AppEnv>): void {
  app.get('/households/:hid/expenses', auth, async (c) => {
    const gastos = await c.var.container.consultarGastos.ejecutar({
      hogarId: c.req.param('hid'),
      usuarioId: c.var.usuarioId,
      updatedAfter: c.req.query('updatedAfter'),
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
