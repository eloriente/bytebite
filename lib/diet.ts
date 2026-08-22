import { prisma } from "@/lib/prisma";
import type { ParsedDiet } from "@/lib/gemini";
import { todayInSpanish } from "@/lib/utils";

interface DietWithDays {
  title: string;
  days: {
    dayOfWeek: string;
    meals: {
      name: string;
      options: { name: string; items: { ingredient: string; amount: string }[] }[];
    }[];
  }[];
}

/**
 * Resumen en texto plano de la dieta activa (solo las comidas de hoy) para
 * usarlo como contexto del asistente de chat. Puramente determinista, sin IA.
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

  return [
    `Dieta activa del usuario: "${diet.title}". Comidas planificadas para hoy (${today}):`,
    ...lines,
  ].join("\n");
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
