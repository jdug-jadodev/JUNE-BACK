export interface PasswordHashPort {
  hash(password: string): Promise<string>;
  verificar(password: string, hash: string): Promise<boolean>;
}
