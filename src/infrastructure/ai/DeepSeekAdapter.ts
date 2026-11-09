import type { ConceptoCatalogo } from '../../domain/entities/AIClasificacion';

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

export interface RespuestaTextoIA {
  texto: string;
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
  'Eres un asesor financiero amable para una familia en Colombia.',
  'Recibes un resumen de los gastos del hogar y sus ingresos.',
  'Debes: detectar patrones de gasto, comparar gastos contra ingresos y dar ideas para gastar menos sin sacrificar lo importante.',
  'Reglas:',
  '- Nunca digas "deberías", "estás gastando demasiado" ni regañes.',
  '- Compara contra el historial propio, no contra metas impuestas.',
  '- Da UNA sola recomendación práctica y concreta.',
  '- Usa cifras completas en pesos colombianos.',
  '- Responde en un texto corto y claro (máximo 4 párrafos), con un tono cálido.',
  '- Termina con una sola línea de acción.',
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

  async analizar(resumen: string): Promise<RespuestaTextoIA> {
    const { contenido, tokensIn, tokensOut } = await this.completar(
      ANALISIS_PROMPT,
      resumen,
      1200,
      0.3,
    );

    return { texto: contenido.trim(), tokensIn, tokensOut };
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
}
