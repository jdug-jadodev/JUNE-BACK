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
import type { GestionarCategoriasPort } from '../../domain/ports/in/GestionarCategoriasPort';
import type { GestionarIngresosPort } from '../../domain/ports/in/GestionarIngresosPort';
import type { SeguridadPort } from '../../domain/ports/in/SeguridadPort';
import type { TokenPort } from '../../domain/ports/out/TokenPort';
import { ActualizarGastoUseCase } from '../../application/usecases/ActualizarGastoUseCase';
import { AutenticacionUseCase } from '../../application/usecases/AutenticacionUseCase';
import { ConsultarGastosUseCase } from '../../application/usecases/ConsultarGastosUseCase';
import { ConsultarAnalisisUseCase } from '../../application/usecases/ConsultarAnalisisUseCase';
import { ClasificarTerminoUseCase } from '../../application/usecases/ClasificarTerminoUseCase';
import { ClasificarConIAUseCase } from '../../application/usecases/ClasificarConIAUseCase';
import { GestionarCategoriasUseCase } from '../../application/usecases/GestionarCategoriasUseCase';
import { GestionarIngresosUseCase } from '../../application/usecases/GestionarIngresosUseCase';
import { EliminarGastoUseCase } from '../../application/usecases/EliminarGastoUseCase';
import { ExportarGastosUseCase } from '../../application/usecases/ExportarGastosUseCase';
import { GestionarHogarUseCase } from '../../application/usecases/GestionarHogarUseCase';
import { GestionarMiembrosUseCase } from '../../application/usecases/GestionarMiembrosUseCase';
import { RegistrarGastoUseCase } from '../../application/usecases/RegistrarGastoUseCase';
import { SeguridadUseCase } from '../../application/usecases/SeguridadUseCase';
import { GastoD1Adapter } from '../d1/repositories/GastoD1Adapter';
import { ClasificacionD1Adapter } from '../d1/repositories/ClasificacionD1Adapter';
import { CategoriaPersonalizadaD1Adapter } from '../d1/repositories/CategoriaPersonalizadaD1Adapter';
import { AIClasificacionD1Adapter } from '../d1/repositories/AIClasificacionD1Adapter';
import { IngresoD1Adapter } from '../d1/repositories/IngresoD1Adapter';
import { HogarD1Adapter } from '../d1/repositories/HogarD1Adapter';
import { MiembroD1Adapter } from '../d1/repositories/MiembroD1Adapter';
import { RefreshTokenD1Adapter } from '../d1/repositories/RefreshTokenD1Adapter';
import { UsuarioD1Adapter } from '../d1/repositories/UsuarioD1Adapter';
import { JwtAdapter } from '../auth/JwtAdapter';
import { Pbkdf2Adapter } from '../auth/Pbkdf2Adapter';
import { DeepSeekAdapter } from '../ai/DeepSeekAdapter';
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
  gestionarCategorias: GestionarCategoriasPort;
  gestionarIngresos: GestionarIngresosPort;
  exportarGastos: ExportarGastosPort;
  seguridad: SeguridadPort;
}

export function buildContainer(env: Env): Container {
  const gastos = new GastoD1Adapter(env.DB);
  const clasificaciones = new ClasificacionD1Adapter(env.DB);
  const categorias = new CategoriaPersonalizadaD1Adapter(env.DB);
  const ingresos = new IngresoD1Adapter(env.DB);
  const aiClasificaciones = new AIClasificacionD1Adapter(env.DB);
  const miembros = new MiembroD1Adapter(env.DB);
  const hogares = new HogarD1Adapter(env.DB);
  const usuarios = new UsuarioD1Adapter(env.DB);
  const refreshTokens = new RefreshTokenD1Adapter(env.DB);
  const passwordHash = new Pbkdf2Adapter();
  const token = new JwtAdapter(env.JWT_SECRET);

  const deepseek = env.DEEPSEEK_API_KEY
    ? new DeepSeekAdapter(env.DEEPSEEK_API_KEY, env.DEEPSEEK_MODEL ?? 'deepseek-chat')
    : null;
  const presupuestoIA = Number.parseFloat(env.IA_PRESUPUESTO_MES_USD ?? '5') || 5;
  const clasificarConIA = new ClasificarConIAUseCase(aiClasificaciones, deepseek, presupuestoIA);

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
    consultarAnalisis: new ConsultarAnalisisUseCase(
      gastos,
      miembros,
      hogares,
      clasificaciones,
      categorias,
      clasificarConIA,
    ),
    clasificarTermino: new ClasificarTerminoUseCase(miembros, clasificaciones, categorias),
    gestionarCategorias: new GestionarCategoriasUseCase(miembros, categorias),
    gestionarIngresos: new GestionarIngresosUseCase(miembros, ingresos),
    exportarGastos: new ExportarGastosUseCase(gastos, miembros, hogares),
    seguridad: new SeguridadUseCase(usuarios, passwordHash, refreshTokens),
  };
}
