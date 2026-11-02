export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class GastoInvalidoError extends DomainError {
  constructor(message: string) {
    super('GASTO_INVALIDO', message, 400);
  }
}

export class PasswordInvalidaError extends DomainError {
  constructor(message = 'La contraseña debe tener al menos 8 caracteres') {
    super('PASSWORD_INVALIDA', message, 400);
  }
}

export class CredencialesInvalidasError extends DomainError {
  constructor() {
    super('CREDENCIALES_INVALIDAS', 'Email o contraseña incorrectos', 401);
  }
}

export class NoAutenticadoError extends DomainError {
  constructor() {
    super('NO_AUTENTICADO', 'Token inválido o ausente', 401);
  }
}

export class NoEsMiembroError extends DomainError {
  constructor() {
    super('NO_ES_MIEMBRO', 'No perteneces a este hogar', 403);
  }
}

export class PermisoDenegadoError extends DomainError {
  constructor() {
    super('PERMISO_DENEGADO', 'Solo el administrador con contraseña puede realizar esta acción', 403);
  }
}

export class NoEncontradoError extends DomainError {
  constructor(message = 'Recurso no encontrado') {
    super('NO_ENCONTRADO', message, 404);
  }
}

export class ConflictoError extends DomainError {
  constructor(message: string) {
    super('CONFLICTO', message, 409);
  }
}

export class PasswordAdminNoConfiguradaError extends DomainError {
  constructor() {
    super('PASSWORD_ADMIN_NO_CONFIGURADA', 'Configura la contraseña de administrador primero', 400);
  }
}

export class GastoBloqueadoError extends DomainError {
  constructor() {
    super('GASTO_BLOQUEADO', 'Solo se pueden modificar gastos del ciclo actual', 409);
  }
}

export class CorteInvalidoError extends DomainError {
  constructor() {
    super('CORTE_INVALIDO', 'El día de corte debe estar entre 1 y 31', 400);
  }
}

export class SoloLecturaError extends DomainError {
  constructor() {
    super('SOLO_LECTURA', 'Tu acceso es de solo lectura', 403);
  }
}
