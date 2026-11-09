import type { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { auth } from '../middleware/auth';
import { CATEGORIA_NOMBRE, CONCEPTOS } from '../../../domain/rules/CatalogoConceptos';

const fechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const gastoSchema = z.object({
  producto: z.string().min(1),
  montoCents: z.number().int().positive(),
  fecha: fechaSchema,
});

const clasificacionSchema = z.object({
  termino: z.string().min(1).max(120),
  conceptoId: z.string().min(1),
  nota: z.string().max(240).optional().nullable(),
});

const categoriaSchema = z.object({
  nombre: z.string().trim().min(2).max(40),
});

const aiInsightsSchema = z.object({
  ciclos: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  /** Personas en casa ajustadas por la persona. No se guarda en la base. */
  personas: z.number().int().min(1).max(15).optional(),
});

const filtroSchema = z.object({
  desde: fechaSchema.optional(),
  hasta: fechaSchema.optional(),
});

export function expensesRoutes(app: Hono<AppEnv>): void {
  app.get('/concepts', auth, async (c) => {
    return c.json(
      CONCEPTOS.map((concepto) => ({
        id: concepto.id,
        nombre: concepto.nombre,
        categoria: concepto.categoria,
        categoriaNombre: CATEGORIA_NOMBRE[concepto.categoria],
        esGusto: concepto.esGusto,
      })),
    );
  });

  app.get('/households/:hid/categories', auth, async (c) => {
    const categorias = await c.var.container.gestionarCategorias.listar({
      hogarId: c.req.param('hid'),
      usuarioId: c.var.usuarioId,
    });
    return c.json(categorias);
  });

  app.post('/households/:hid/categories', auth, async (c) => {
    const body = categoriaSchema.parse(await c.req.json());
    const categoria = await c.var.container.gestionarCategorias.crear({
      hogarId: c.req.param('hid'),
      usuarioId: c.var.usuarioId,
      nombre: body.nombre,
    });
    return c.json(categoria, 201);
  });

  app.post('/households/:hid/classification', auth, async (c) => {
    const body = clasificacionSchema.parse(await c.req.json());
    const resultado = await c.var.container.clasificarTermino.ejecutar({
      hogarId: c.req.param('hid'),
      usuarioId: c.var.usuarioId,
      termino: body.termino,
      conceptoId: body.conceptoId,
      nota: body.nota,
    });
    return c.json(resultado);
  });

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

  app.get('/households/:hid/insights', auth, async (c) => {
    const cyclesParam = c.req.query('ciclos');
    const ciclos = cyclesParam
      ? cyclesParam.split(',').map((x) => x.trim()).filter(Boolean)
      : undefined;

    const analisis = await c.var.container.consultarAnalisis.ejecutar({
      hogarId: c.req.param('hid'),
      usuarioId: c.var.usuarioId,
      ciclos,
    });
    return c.json(analisis);
  });

  app.post('/households/:hid/ai-insights', auth, async (c) => {
    const body = aiInsightsSchema.parse(await c.req.json());
    const analisis = await c.var.container.analizarConIA.analizar({
      hogarId: c.req.param('hid'),
      usuarioId: c.var.usuarioId,
      ciclos: body.ciclos,
      personas: body.personas,
    });
    return c.json(analisis);
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
