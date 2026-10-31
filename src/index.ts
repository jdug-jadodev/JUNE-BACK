import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { buildContainer } from './infrastructure/config/container';
import type { Env } from './infrastructure/config/env';
import { RefreshTokenD1Adapter } from './infrastructure/d1/repositories/RefreshTokenD1Adapter';
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

export default {
  fetch: app.fetch,
  scheduled: async (
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> => {
    const tokens = new RefreshTokenD1Adapter(env.DB);
    ctx.waitUntil(tokens.eliminarExpirados(new Date().toISOString()));
  },
};
