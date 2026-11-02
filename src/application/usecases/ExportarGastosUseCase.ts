import type { ExportarGastosPort } from '../../domain/ports/in/ExportarGastosPort';
import type { GastoRepositorioPort } from '../../domain/ports/out/GastoRepositorioPort';
import type { HogarRepositorioPort } from '../../domain/ports/out/HogarRepositorioPort';
import type { MiembroRepositorioPort } from '../../domain/ports/out/MiembroRepositorioPort';
import { CicloReglas } from '../../domain/rules/CicloReglas';
import { NoEncontradoError, NoEsMiembroError } from '../../exception/errors';

export class ExportarGastosUseCase implements ExportarGastosPort {
  constructor(
    private readonly gastos: GastoRepositorioPort,
    private readonly miembros: MiembroRepositorioPort,
    private readonly hogares: HogarRepositorioPort,
  ) {}

  async ejecutar(input: {
    hogarId: string;
    usuarioId: string;
    meses?: string[];
    ciclos?: string[];
  }): Promise<string> {
    const miembro = await this.miembros.buscar(input.hogarId, input.usuarioId);
    if (!miembro) throw new NoEsMiembroError();

    const hogar = await this.hogares.obtener(input.hogarId);
    if (!hogar) throw new NoEncontradoError('Hogar no encontrado');

    const gastos = (await this.gastos.listar(input.hogarId)).filter((g) => {
      if (input.ciclos?.length) {
        return input.ciclos.includes(CicloReglas.cicloDe(g.fecha, hogar.cutoffDay).inicio);
      }
      return !input.meses?.length || input.meses.includes(g.fecha.slice(0, 7));
    });

    const encabezado = 'fecha;producto;monto_cop;registrado_por';
    const filas = gastos.map(
      (g) =>
        `${g.fecha};${escapar(g.producto)};${(g.montoCents / 100).toFixed(2)};${escapar(
          g.creadoPorNombre,
        )}`,
    );

    return '\uFEFF' + [encabezado, ...filas].join('\r\n');
  }
}

function escapar(valor: string): string {
  if (valor.includes(';') || valor.includes('"') || valor.includes('\n')) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}
