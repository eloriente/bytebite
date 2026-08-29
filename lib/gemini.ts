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
                            calories: { type: Type.NUMBER, nullable: true },
                            protein: { type: Type.NUMBER, nullable: true },
                            carbs: { type: Type.NUMBER, nullable: true },
                            fat: { type: Type.NUMBER, nullable: true },
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
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
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
- No inventes datos que no aparezcan en el documento. Sé fiel al texto original para "ingredient" y "amount".
- Además, para cada item, ESTIMA sus valores nutricionales (calories en kcal, protein/carbs/fat en gramos)
  correspondientes a la cantidad indicada en "amount", usando tu conocimiento nutricional general (no es
  necesario que el documento incluya estos datos). Si no puedes hacer una estimación razonable para un
  ingrediente o cantidad concretos, deja esos campos en null en lugar de forzar un valor.`;

export async function extractDietFromPdf(pdfBuffer: Buffer): Promise<ParsedDiet> {
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

export interface ChatHistoryMessage {
  role: "user" | "model";
  content: string;
}

interface AskNutritionAssistantParams {
  history: ChatHistoryMessage[];
  userText: string;
  imageBuffer?: Buffer;
  imageMimeType?: string;
  goalLabel: string | null;
  dietSummary: string;
}

function buildAssistantSystemInstruction(goalLabel: string | null, dietSummary: string): string {
  return `Eres el asistente nutricional de ByteBite, una app de gestión de dietas. Hablas en español,
con un tono cercano, informal y nada técnico (como lo haría un amigo que sabe de nutrición, no un
médico ni un nutricionista clínico). Evita jerga y tecnicismos innecesarios; explica las cosas de
forma sencilla y directa.

Objetivo del usuario: ${goalLabel ?? "no indicado (pregúntale cuál es si es relevante para responder)"}.
${dietSummary}

Cuando el usuario te mande una foto de un ingrediente, producto o etiqueta nutricional:
- Dile de forma clara si ese producto encaja bien o no con su objetivo, y por qué, en 2-3 frases como máximo.
- Propón un plato o forma concreta de usarlo que tenga sentido con su objetivo y, si aplica, con su dieta activa.
No hace falta que analices cada nutriente en detalle salvo que el usuario lo pida explícitamente.
Responde siempre en texto plano corto (sin markdown pesado), como en una conversación de chat.`;
}

/**
 * Structured Output schema para el modo Edit del asistente de chat: una
 * respuesta en texto ("reply") más una lista plana de operaciones sobre
 * ingredientes de la dieta activa. Alcance v1: solo items (add/update/delete),
 * nunca comidas/opciones/días.
 */
export const dietEditResponseSchema = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING },
    operations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING }, // "add_item" | "update_item" | "delete_item"
          mealOptionId: { type: Type.STRING, nullable: true },
          itemId: { type: Type.STRING, nullable: true },
          ingredient: { type: Type.STRING, nullable: true },
          amount: { type: Type.STRING, nullable: true },
          calories: { type: Type.NUMBER, nullable: true },
          protein: { type: Type.NUMBER, nullable: true },
          carbs: { type: Type.NUMBER, nullable: true },
          fat: { type: Type.NUMBER, nullable: true },
        },
        required: ["action"],
      },
    },
  },
  required: ["reply", "operations"],
};

export interface RawDietEditOperation {
  action: string;
  mealOptionId?: string | null;
  itemId?: string | null;
  ingredient?: string | null;
  amount?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

export interface ProposeDietEditResult {
  reply: string;
  operations: RawDietEditOperation[];
}

function buildDietEditSystemInstruction(goalLabel: string | null, dietContext: string): string {
  return `Eres el asistente de ByteBite en modo edición de dieta. Hablas en español, con un tono
cercano e informal, como lo haría un amigo que sabe de nutrición.

Objetivo del usuario: ${goalLabel ?? "no indicado"}.
${dietContext}

Tu único poder de edición es sobre INGREDIENTES (items) dentro de opciones de comida que ya
existen en la dieta activa. No puedes crear ni eliminar comidas, opciones ni días completos.

Reglas estrictas:
- Si el usuario pide un cambio de ingrediente (añadir, sustituir, quitar, ajustar cantidad),
  genera una o más operaciones en "operations":
  - "add_item": requiere "mealOptionId" (el id real de la opción donde va, tomado del contexto)
    más "ingredient" y "amount"; opcionalmente estima "calories"/"protein"/"carbs"/"fat".
  - "update_item": requiere "itemId" (id real del item) y TODOS los campos que cambian de
    verdad. Si el usuario sustituye un ingrediente por otro (p.ej. "pollo por pavo"), incluye
    SIEMPRE el nuevo "ingredient" (y "amount" si cambia la cantidad), además de las macros
    reestimadas — no actualices solo las macros dejando el nombre del ingrediente antiguo.
  - "delete_item": requiere "itemId" (id real del item); incluye también "ingredient"/"amount"
    del item que borras, solo para que se pueda mostrar en la interfaz.
  - Usa EXCLUSIVAMENTE los ids que aparecen en el contexto (entre corchetes). Nunca inventes
    un id ni lo adivines.
- Mantén las propuestas coherentes con los macros que el usuario ya consume (visibles en el
  contexto): no dupliques calorías ni rompas el equilibrio actual salvo que el usuario lo pida
  expresamente.
- Si el usuario solo pregunta algo y no pide ningún cambio, deja "operations" como array vacío
  y responde solo con texto en "reply".
- "reply" es siempre el mensaje de chat que verá el usuario: explica en 2-3 frases qué cambio
  propones (o responde su pregunta), en texto plano corto, sin markdown pesado.`;
}

interface ProposeDietEditParams {
  history: ChatHistoryMessage[];
  userText: string;
  imageBuffer?: Buffer;
  imageMimeType?: string;
  goalLabel: string | null;
  dietContext: string;
}

export async function proposeDietEdit({
  history,
  userText,
  imageBuffer,
  imageMimeType,
  goalLabel,
  dietContext,
}: ProposeDietEditParams): Promise<ProposeDietEditResult> {
  const contents = [
    ...history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    })),
    {
      role: "user" as const,
      parts: [
        ...(userText ? [{ text: userText }] : []),
        ...(imageBuffer && imageMimeType
          ? [{ inlineData: { mimeType: imageMimeType, data: imageBuffer.toString("base64") } }]
          : []),
      ],
    },
  ];

  const response = await getGenAI().models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      systemInstruction: buildDietEditSystemInstruction(goalLabel, dietContext),
      responseMimeType: "application/json",
      responseSchema: dietEditResponseSchema,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return JSON.parse(text) as ProposeDietEditResult;
}

export async function askNutritionAssistant({
  history,
  userText,
  imageBuffer,
  imageMimeType,
  goalLabel,
  dietSummary,
}: AskNutritionAssistantParams): Promise<string> {
  const contents = [
    ...history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    })),
    {
      role: "user" as const,
      parts: [
        ...(userText ? [{ text: userText }] : []),
        ...(imageBuffer && imageMimeType
          ? [{ inlineData: { mimeType: imageMimeType, data: imageBuffer.toString("base64") } }]
          : []),
      ],
    },
  ];

  const response = await getGenAI().models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      systemInstruction: buildAssistantSystemInstruction(goalLabel, dietSummary),
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return text;
}
