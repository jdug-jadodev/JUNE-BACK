import type { ConceptoCatalogo } from '../../domain/entities/AIClasificacion';
import type { PeriodicidadIA, SugerenciaIA } from '../../domain/entities/AnalisisIA';

export interface ResultadoIAClasificacion {
  termino: string;
  conceptoId: string;
  confianza: number;
  explicacion: string;
}

export interface RespuestaIA {
  resultados: ResultadoIAClasificacion[];
  tokensIn: number;
  tokensOut: number;
}

export interface ResultadoAnalisisIA {
  estado: string;
  sugerencias: SugerenciaIA[];
  recomendacion: string;
}

export interface RespuestaAnalisisIA {
  resultado: ResultadoAnalisisIA;
  tokensIn: number;
  tokensOut: number;
}

interface DeepSeekResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

const CLASIFICACION_PROMPT = [
  'Eres un clasificador de gastos de un hogar en Colombia.',
  'Recibes un catálogo de categorías y una lista de nombres de gastos.',
  'Debes asignar a cada gasto el id de concepto del catálogo que mejor le corresponda.',
  'Si un gasto no encaja en ningún concepto, usa el id "otros" (o el más cercano).',
  'Solo puedes devolver ids que existan en el catálogo.',
  'Responde ÚNICAMENTE con JSON válido, sin texto adicional, con esta forma:',
  '{"clasificaciones":[{"termino":"...","conceptoId":"...","confianza":0.9,"explicacion":"..."}]}',
  'La "confianza" es un número entre 0 y 1.',
].join('\n');

const ANALISIS_PROMPT = [
  'Eres un asesor financiero para una familia en Colombia.',
  'Recibes datos del ciclo de gastos y los ingresos.',
  'Debes devolver ÚNICAMENTE JSON válido, sin texto adicional, con esta forma:',
  '{"estado":"una frase corta","sugerencias":[{"categoria":"...","montoCents":0,"periodicidad":"SEMANAL","nota":"..."}],"recomendacion":"una frase de acción"}',
  'Reglas:',
  '- "estado": una sola frase útil y nueva (NO repitas que vivienda es lo más caro; enfócate en lo que no es obvio).',
  '- "sugerencias": entre 3 y 5 montos sugeridos SOLO para categorías discrecionales (gusticos, salidas/ocio, viajes, restaurantes, ropa). Calcula montos realistas en centavos según el ingreso y los días que faltan. "periodicidad" es SEMANAL o MENSUAL.',
  '- "recomendacion": una sola frase concreta de acción.',
  '- Sin regañar, sin "deberías". Montos en pesos colombianos.',
].join('\n');

export class DeepSeekAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async clasificar(
    terminos: string[],
    catalogo: ConceptoCatalogo[],
  ): Promise<RespuestaIA> {
    const userContent = JSON.stringify({ catalogo, terminos });
    const { contenido, tokensIn, tokensOut } = await this.completar(
      CLASIFICACION_PROMPT,
      userContent,
      800,
      0,
    );

    return {
      resultados: this.parsearClasificaciones(contenido),
      tokensIn,
      tokensOut,
    };
  }

  async analizar(resumen: string): Promise<RespuestaAnalisisIA> {
    const { contenido, tokensIn, tokensOut } = await this.completar(
      ANALISIS_PROMPT,
      resumen,
      800,
      0.3,
    );

    return {
      resultado: this.parsearAnalisis(contenido),
      tokensIn,
      tokensOut,
    };
  }

  private async completar(
    systemPrompt: string,
    userContent: string,
    maxTokens: number,
    temperature: number,
  ): Promise<{ contenido: string; tokensIn: number; tokensOut: number }> {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek respondió ${response.status}`);
    }

    const data = (await response.json()) as DeepSeekResponse;
    return {
      contenido: data.choices?.[0]?.message?.content ?? '',
      tokensIn: data.usage?.prompt_tokens ?? 0,
      tokensOut: data.usage?.completion_tokens ?? 0,
    };
  }

  private parsearClasificaciones(content: string): ResultadoIAClasificacion[] {
    try {
      const json = JSON.parse(content) as {
        clasificaciones?: Array<{
          termino?: string;
          conceptoId?: string;
          confianza?: number;
          explicacion?: string;
        }>;
      };
      return (json.clasificaciones ?? [])
        .filter((c) => typeof c.termino === 'string' && typeof c.conceptoId === 'string')
        .map((c) => ({
          termino: c.termino as string,
          conceptoId: c.conceptoId as string,
          confianza: typeof c.confianza === 'number' ? c.confianza : 1,
          explicacion: typeof c.explicacion === 'string' ? c.explicacion : '',
        }));
    } catch {
      return [];
    }
  }

  private parsearAnalisis(content: string): ResultadoAnalisisIA {
    try {
      const json = JSON.parse(content) as {
        estado?: string;
        sugerencias?: Array<{
          categoria?: string;
          montoCents?: number;
          periodicidad?: string;
          nota?: string;
        }>;
        recomendacion?: string;
      };

      const sugerencias: SugerenciaIA[] = (json.sugerencias ?? [])
        .filter((s) => typeof s.categoria === 'string' && typeof s.montoCents === 'number')
        .map((s) => ({
          categoria: s.categoria as string,
          montoCents: Math.max(0, Math.round(s.montoCents as number)),
          periodicidad: (s.periodicidad === 'MENSUAL' ? 'MENSUAL' : 'SEMANAL') as PeriodicidadIA,
          nota: typeof s.nota === 'string' ? s.nota : '',
        }));

      return {
        estado: typeof json.estado === 'string' ? json.estado : '',
        sugerencias,
        recomendacion: typeof json.recomendacion === 'string' ? json.recomendacion : '',
      };
    } catch {
      return { estado: '', sugerencias: [], recomendacion: '' };
    }
  }
}
