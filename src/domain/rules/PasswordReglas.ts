import { PasswordInvalidaError } from '../../exception/errors';

export const PasswordReglas = {
  validar(password: string): void {
    if (password.length < 8) {
      throw new PasswordInvalidaError();
    }
  },
};
