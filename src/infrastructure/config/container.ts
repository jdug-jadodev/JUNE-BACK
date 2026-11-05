import type { AutenticacionPort } from '../../domain/ports/in/AutenticacionPort';
import type { ConsultarGastosPort } from '../../domain/ports/in/ConsultarGastosPort';
import type { ConsultarAnalisisPort } from '../../domain/ports/in/ConsultarAnalisisPort';
import type { ActualizarGastoPort } from '../../domain/ports/in/ActualizarGastoPort';
import type { EliminarGastoPort } from '../../domain/ports/in/EliminarGastoPort';
import type { GestionarHogarPort } from '../../domain/ports/in/GestionarHogarPort';
import type { GestionarMiembrosPort } from '../../domain/ports/in/GestionarMiembrosPort';
import type { RegistrarGastoPort } from '../../domain/ports/in/RegistrarGastoPort';
import type { ExportarGastosPort } from '../../domain/ports/in/ExportarGastosPort';
import type { ClasificarTerminoPort } from '../../domain/ports/in/ClasificarTerminoPort';
import type { SeguridadPort } from '../../domain/ports/in/SeguridadPort';
import type { TokenPort } from '../../domain/ports/out/TokenPort';
import { ActualizarGastoUseCase } from '../../application/usecases/ActualizarGastoUseCase';
import { AutenticacionUseCase } from '../../application/usecases/AutenticacionUseCase';
import { ConsultarGastosUseCase } from '../../application/usecases/ConsultarGastosUseCase';
import { ConsultarAnalisisUseCase } from '../../application/usecases/ConsultarAnalisisUseCase';
import { ClasificarTerminoUseCase } from '../../application/usecases/ClasificarTerminoUseCase';
import { EliminarGastoUseCase } from '../../application/usecases/EliminarGastoUseCase';
import { ExportarGastosUseCase } from '../../application/usecases/ExportarGastosUseCase';
import { GestionarHogarUseCase } from '../../application/usecases/GestionarHogarUseCase';
import { GestionarMiembrosUseCase } from '../../application/usecases/GestionarMiembrosUseCase';
import { RegistrarGastoUseCase } from '../../application/usecases/RegistrarGastoUseCase';
import { SeguridadUseCase } from '../../application/usecases/SeguridadUseCase';
import { GastoD1Adapter } from '../d1/repositories/GastoD1Adapter';
import { ClasificacionD1Adapter } from '../d1/repositories/ClasificacionD1Adapter';
import { HogarD1Adapter } from '../d1/repositories/HogarD1Adapter';
import { MiembroD1Adapter } from '../d1/repositories/MiembroD1Adapter';
import { RefreshTokenD1Adapter } from '../d1/repositories/RefreshTokenD1Adapter';
import { UsuarioD1Adapter } from '../d1/repositories/UsuarioD1Adapter';
import { JwtAdapter } from '../auth/JwtAdapter';
import { Pbkdf2Adapter } from '../auth/Pbkdf2Adapter';
import type { Env } from './env';

export interface Container {
  token: TokenPort;
  autenticacion: AutenticacionPort;
  gestionarHogar: GestionarHogarPort;
  gestionarMiembros: GestionarMiembrosPort;
  registrarGasto: RegistrarGastoPort;
  actualizarGasto: ActualizarGastoPort;
  eliminarGasto: EliminarGastoPort;
  consultarGastos: ConsultarGastosPort;
  consultarAnalisis: ConsultarAnalisisPort;
  clasificarTermino: ClasificarTerminoPort;
  exportarGastos: ExportarGastosPort;
  seguridad: SeguridadPort;
}

export function buildContainer(env: Env): Container {
  const gastos = new GastoD1Adapter(env.DB);
  const clasificaciones = new ClasificacionD1Adapter(env.DB);
  const miembros = new MiembroD1Adapter(env.DB);
  const hogares = new HogarD1Adapter(env.DB);
  const usuarios = new UsuarioD1Adapter(env.DB);
  const refreshTokens = new RefreshTokenD1Adapter(env.DB);
  const passwordHash = new Pbkdf2Adapter();
  const token = new JwtAdapter(env.JWT_SECRET);

  return {
    token,
    autenticacion: new AutenticacionUseCase(usuarios, refreshTokens, passwordHash, token),
    gestionarHogar: new GestionarHogarUseCase(hogares, miembros, passwordHash),
    gestionarMiembros: new GestionarMiembrosUseCase(
      miembros,
      hogares,
      usuarios,
      passwordHash,
      refreshTokens,
    ),
    registrarGasto: new RegistrarGastoUseCase(gastos, miembros, usuarios),
    actualizarGasto: new ActualizarGastoUseCase(gastos, miembros, hogares, passwordHash),
    eliminarGasto: new EliminarGastoUseCase(gastos, miembros, hogares, passwordHash),
    consultarGastos: new ConsultarGastosUseCase(gastos, miembros, hogares),
    consultarAnalisis: new ConsultarAnalisisUseCase(gastos, miembros, hogares, clasificaciones),
    clasificarTermino: new ClasificarTerminoUseCase(miembros, clasificaciones),
    exportarGastos: new ExportarGastosUseCase(gastos, miembros, hogares),
    seguridad: new SeguridadUseCase(usuarios, passwordHash, refreshTokens),
  };
}
