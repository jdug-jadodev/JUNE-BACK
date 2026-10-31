import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { buildContainer } from './infrastructure/config/container';
import { registerErrorHandler } from './infrastructure/http/middleware/errors';
import { authRoutes } from './infrastructure/http/routes/auth.routes';
import { expensesRoutes } from './infrastructure/http/routes/expenses.routes';
import { householdsRoutes } from './infrastructure/http/routes/households.routes';
import type { AppEnv } from './infrastructure/http/types';

const app = new Hono<AppEnv>();

app.use('*', logger());
app.use('*', cors());

app.use('*', async (c, next) => {
  c.set('container', buildContainer(c.env));
  await next();
});

app.get('/health', (c) => c.json({ status: 'ok' }));

authRoutes(app);
householdsRoutes(app);
expensesRoutes(app);

registerErrorHandler(app);

export default app;
