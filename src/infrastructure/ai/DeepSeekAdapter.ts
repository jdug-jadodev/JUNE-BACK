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

interface DeepSeekResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

const SYSTEM_PROMPT = [
  'Eres un clasificador de gastos de un hogar en Colombia.',
  'Recibes un catálogo de categorías y una lista de nombres de gastos.',
  'Debes asignar a cada gasto el id de concepto del catálogo que mejor le corresponda.',
  'Si un gasto no encaja en ningún concepto, usa el id "otros" (o el más cercano).',
  'Solo puedes devolver ids que existan en el catálogo.',
  'Responde ÚNICAMENTE con JSON válido, sin texto adicional, con esta forma:',
  '{"clasificaciones":[{"termino":"...","conceptoId":"...","confianza":0.9,"explicacion":"..."}]}',
  'La "confianza" es un número entre 0 y 1.',
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

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        temperature: 0,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek respondió ${response.status}`);
    }

    const data = (await response.json()) as DeepSeekResponse;
    const content = data.choices?.[0]?.message?.content ?? '';
    const resultados = this.parsear(content);

    return {
      resultados,
      tokensIn: data.usage?.prompt_tokens ?? 0,
      tokensOut: data.usage?.completion_tokens ?? 0,
    };
  }

  private parsear(content: string): ResultadoIAClasificacion[] {
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
