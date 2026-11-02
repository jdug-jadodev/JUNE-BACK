export interface UsuarioSeguridad {
  id: string;
  email: string;
  securityQuestion: string | null;
  securityAnswerHash: string | null;
  recoveryCodeHash: string | null;
  resetAttempts: number;
  resetLockedUntil: string | null;
}
