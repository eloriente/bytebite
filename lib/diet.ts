import { prisma } from "@/lib/prisma";
import type { ParsedDiet } from "@/lib/gemini";
import { todayInSpanish } from "@/lib/utils";
import { sumMacros, type MacroTotals } from "@/lib/nutrition";

interface DietItemFields {
  ingredient: string;
  amount: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

interface DietWithDays {
  title: string;
  days: {
    dayOfWeek: string;
    meals: {
      name: string;
      options: { name: string; items: DietItemFields[] }[];
    }[];
  }[];
}

function formatMacros(macros: MacroTotals): string {
  if (!macros.hasData) return "sin datos nutricionales estimados";
  return `~${Math.round(macros.calories)} kcal, ${Math.round(macros.protein)} g proteína, ${Math.round(macros.carbs)} g carbohidratos, ${Math.round(macros.fat)} g grasa`;
}

/**
 * Resumen en texto plano de la dieta activa (solo las comidas de hoy, con sus
 * macros totales) para usarlo como contexto del asistente de chat (modo Ask).
 * Puramente determinista, sin IA.
 */
export function summarizeActiveDietForPrompt(diet: DietWithDays | null): string {
  if (!diet) return "El usuario no tiene ninguna dieta activa cargada en la app.";

  const today = todayInSpanish();
  const todayPlan = diet.days.find((d) => d.dayOfWeek === today);

  if (!todayPlan || todayPlan.meals.length === 0) {
    return `El usuario tiene una dieta activa llamada "${diet.title}", pero no hay comidas registradas para hoy (${today}).`;
  }

  const lines = todayPlan.meals.map((meal) => {
    const optionsText = meal.options
      .map((opt) => opt.items.map((item) => `${item.ingredient} (${item.amount})`).join(", "))
      .join(" / ");
    return `- ${meal.name}: ${optionsText}`;
  });

  const allItems = todayPlan.meals.flatMap((meal) => meal.options.flatMap((opt) => opt.items));
  const totals = sumMacros(allItems);

  return [
    `Dieta activa del usuario: "${diet.title}". Comidas planificadas para hoy (${today}):`,
    ...lines,
    `Macros totales estimados de hoy: ${formatMacros(totals)}.`,
    "Usa siempre estos datos reales como base: no des consejos que ignoren lo que el usuario ya come hoy según su dieta.",
  ].join("\n");
}

interface DietItemWithId extends DietItemFields {
  id: string;
}

interface DietWithIds {
  title: string;
  days: {
    dayOfWeek: string;
    meals: {
      name: string;
      options: { id: string; name: string; items: DietItemWithId[] }[];
    }[];
  }[];
}

/**
 * Contexto completo (semana entera, con ids de MealOption/Item y macros por día)
 * para el asistente de chat en modo Edit: necesita los ids para poder referenciar
 * qué ingrediente añade/modifica/elimina, y los macros para proponer cambios
 * coherentes con lo que el usuario ya consume.
 */
export function buildDietEditContext(diet: DietWithIds | null): string {
  if (!diet) {
    return "El usuario no tiene ninguna dieta activa cargada en la app. No hay nada que editar.";
  }

  const dayBlocks = diet.days.map((day) => {
    const mealLines = day.meals.map((meal) => {
      const optionLines = meal.options.map((opt) => {
        const itemLines = opt.items
          .map((item) => `    · [item:${item.id}] ${item.ingredient} (${item.amount})`)
          .join("\n");
        return `  - Opción "${opt.name}" [mealOption:${opt.id}]:\n${itemLines}`;
      });
      return `- ${meal.name}:\n${optionLines.join("\n")}`;
    });

    const dayItems = day.meals.flatMap((meal) => meal.options.flatMap((opt) => opt.items));
    const dayTotals = sumMacros(dayItems);

    return [
      `## ${day.dayOfWeek}`,
      ...mealLines,
      `Macros totales estimados de ${day.dayOfWeek}: ${formatMacros(dayTotals)}.`,
    ].join("\n");
  });

  const allItems = diet.days.flatMap((day) =>
    day.meals.flatMap((meal) => meal.options.flatMap((opt) => opt.items)),
  );
  const weekTotals = sumMacros(allItems);

  return [
    `Dieta activa del usuario: "${diet.title}". Árbol completo con ids para poder editar ingredientes:`,
    ...dayBlocks,
    `Macros totales estimados de toda la semana: ${formatMacros(weekTotals)}.`,
    "Los ids entre corchetes (mealOption:... / item:...) son los reales de la base de datos: úsalos tal cual en las operaciones, nunca inventes ids nuevos.",
  ].join("\n\n");
}

/**
 * Crea una dieta completa (días -> comidas -> opciones -> items) para un usuario
 * y la marca como activa, desactivando cualquier otra dieta activa previa.
 * Compartido por la carga vía PDF (tras revisión) y la entrada manual.
 */
export async function createDietForUser(
  userId: string,
  parsedDiet: ParsedDiet,
  pdfPath?: string | null,
) {
  return prisma.$transaction(async (tx) => {
    await tx.diet.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    return tx.diet.create({
      data: {
        userId,
        title: parsedDiet.title,
        isActive: true,
        pdfPath: pdfPath ?? null,
        days: {
          create: parsedDiet.days.map((day) => ({
            dayOfWeek: day.dayOfWeek,
            meals: {
              create: day.meals.map((meal) => ({
                name: meal.name,
                order: meal.order,
                options: {
                  create: meal.options.map((option) => ({
                    name: option.name,
                    description: option.description ?? null,
                    items: {
                      create: option.items.map((item) => ({
                        ingredient: item.ingredient,
                        amount: item.amount,
                        calories: item.calories ?? null,
                        protein: item.protein ?? null,
                        carbs: item.carbs ?? null,
                        fat: item.fat ?? null,
                      })),
                    },
                  })),
                },
              })),
            },
          })),
        },
      },
      select: { id: true, title: true },
    });
  });
}
