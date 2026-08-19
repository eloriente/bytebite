import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

let _genAI: GoogleGenAI | null = null;

/**
 * Lazily instantiated so importing this module (e.g. during `next build`'s
 * page-data collection for the route handler) never requires the API key —
 * only calling extractDietFromPdf() at request time does.
 */
function getGenAI(): GoogleGenAI {
  if (!_genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set in the environment");
    }
    _genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return _genAI;
}

export const GEMINI_MODEL = "gemini-3.6-flash";

/**
 * Structured Output schema mirroring the Prisma Diet graph
 * (Diet -> DietDay -> Meal -> MealOption -> Item).
 */
export const dietResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    days: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          dayOfWeek: { type: Type.STRING },
          meals: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                order: { type: Type.INTEGER },
                options: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      description: { type: Type.STRING, nullable: true },
                      items: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            ingredient: { type: Type.STRING },
                            amount: { type: Type.STRING },
                          },
                          required: ["ingredient", "amount"],
                        },
                      },
                    },
                    required: ["name", "items"],
                  },
                },
              },
              required: ["name", "order", "options"],
            },
          },
        },
        required: ["dayOfWeek", "meals"],
      },
    },
  },
  required: ["title", "days"],
};

export interface ParsedDietItem {
  ingredient: string;
  amount: string;
}

export interface ParsedDietOption {
  name: string;
  description?: string | null;
  items: ParsedDietItem[];
}

export interface ParsedDietMeal {
  name: string;
  order: number;
  options: ParsedDietOption[];
}

export interface ParsedDietDay {
  dayOfWeek: string;
  meals: ParsedDietMeal[];
}

export interface ParsedDiet {
  title: string;
  days: ParsedDietDay[];
}

const EXTRACTION_PROMPT = `Eres un asistente que extrae dietas nutricionales de documentos PDF.
Analiza el PDF adjunto y devuelve la dieta completa estructurada en JSON siguiendo estrictamente
el esquema proporcionado. Reglas:
- Agrupa las comidas por día de la semana (Lunes a Domingo). Si la dieta no distingue días,
  usa un único día llamado "Todos los días".
- Cada toma del día (Desayuno, Almuerzo, Comida, Merienda, Cena, Recena, etc.) es un "meal",
  con "order" indicando su posición cronológica (0 = primera del día).
- Si una toma ofrece alternativas intercambiables ("Opción A" / "Opción B"), crea una entrada en
  "options" por cada alternativa. Si solo hay una alternativa, crea igualmente un único option
  con name "Opción única".
- Cada ingrediente con su cantidad va en "items" (ingredient + amount, p.ej. "Pechuga de pollo" / "150 g").
- No inventes datos que no aparezcan en el documento. Sé fiel al texto original.`;

export async function extractDietFromPdf(
  pdfBuffer: Buffer,
): Promise<ParsedDiet> {
  const base64Pdf = pdfBuffer.toString("base64");

  const response = await getGenAI().models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: EXTRACTION_PROMPT },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Pdf,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: dietResponseSchema,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return JSON.parse(text) as ParsedDiet;
}
