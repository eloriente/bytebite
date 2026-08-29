import { z } from "zod";

export const dietItemSchema = z.object({
  ingredient: z.string().trim().min(1, "El ingrediente es obligatorio.").max(200),
  amount: z.string().trim().min(1, "La cantidad es obligatoria.").max(100),
  calories: z.coerce.number().min(0).nullable().optional(),
  protein: z.coerce.number().min(0).nullable().optional(),
  carbs: z.coerce.number().min(0).nullable().optional(),
  fat: z.coerce.number().min(0).nullable().optional(),
});

export const dietOptionSchema = z.object({
  name: z.string().trim().min(1, "El nombre de la opción es obligatorio.").max(100),
  description: z.string().trim().max(500).nullable().optional(),
  items: z.array(dietItemSchema).min(1, "Añade al menos un ingrediente."),
});

export const dietMealSchema = z.object({
  name: z.string().trim().min(1, "El nombre de la comida es obligatorio.").max(100),
  order: z.coerce.number().int().min(0),
  options: z.array(dietOptionSchema).min(1, "Añade al menos una opción."),
});

export const dietDaySchema = z.object({
  dayOfWeek: z.string().trim().min(1, "El día es obligatorio.").max(20),
  meals: z.array(dietMealSchema).min(1, "Añade al menos una comida."),
});

export const createDietSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio.").max(200),
  days: z.array(dietDaySchema).min(1, "Añade al menos un día."),
});

export type CreateDietInput = z.infer<typeof createDietSchema>;

// Esquemas granulares para el CRUD de un árbol de dieta ya existente.
export const dayCreateSchema = z.object({
  dietId: z.string().min(1),
  dayOfWeek: z.string().trim().min(1, "El día es obligatorio.").max(20),
});

export const mealCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre de la comida es obligatorio.").max(100),
  order: z.coerce.number().int().min(0),
});
export const mealUpdateSchema = mealCreateSchema.partial();

export const optionCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre de la opción es obligatorio.").max(100),
  description: z.string().trim().max(500).nullable().optional(),
});
export const optionUpdateSchema = optionCreateSchema.partial();

export const itemCreateSchema = dietItemSchema;
export const itemUpdateSchema = dietItemSchema.partial();

export const dietRenameSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio.").max(200),
});

// Operaciones que el asistente de chat (modo Edit) puede proponer sobre los
// ingredientes de la dieta activa. Alcance v1: solo items, nunca comidas/opciones/días.
export const dietEditOperationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add_item"),
    mealOptionId: z.string().min(1),
    ingredient: z.string().trim().min(1).max(200),
    amount: z.string().trim().min(1).max(100),
    calories: z.coerce.number().min(0).nullable().optional(),
    protein: z.coerce.number().min(0).nullable().optional(),
    carbs: z.coerce.number().min(0).nullable().optional(),
    fat: z.coerce.number().min(0).nullable().optional(),
  }),
  z.object({
    action: z.literal("update_item"),
    itemId: z.string().min(1),
    ingredient: z.string().trim().min(1).max(200).optional(),
    amount: z.string().trim().min(1).max(100).optional(),
    calories: z.coerce.number().min(0).nullable().optional(),
    protein: z.coerce.number().min(0).nullable().optional(),
    carbs: z.coerce.number().min(0).nullable().optional(),
    fat: z.coerce.number().min(0).nullable().optional(),
  }),
  z.object({
    action: z.literal("delete_item"),
    itemId: z.string().min(1),
    ingredient: z.string().trim().max(200).optional(),
    amount: z.string().trim().max(100).optional(),
  }),
]);

export const dietEditOperationsSchema = z.array(dietEditOperationSchema).max(20);

export type DietEditOperation = z.infer<typeof dietEditOperationSchema>;
