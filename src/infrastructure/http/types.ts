import type { Container } from '../config/container';
import type { Env } from '../config/env';

export type AppEnv = {
  Bindings: Env;
  Variables: {
    usuarioId: string;
    container: Container;
  };
};
