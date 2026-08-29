import { describe, expect, it } from "vitest";
import { buildDietEditContext, summarizeActiveDietForPrompt } from "./diet";
import { DAYS_OF_WEEK, todayInSpanish } from "./utils";

const today = todayInSpanish();
const otherDay = DAYS_OF_WEEK.find((d) => d !== today)!;

describe("summarizeActiveDietForPrompt", () => {
  it("reports no active diet", () => {
    expect(summarizeActiveDietForPrompt(null)).toMatch(/no tiene ninguna dieta activa/);
  });

  it("reports no meals planned for today", () => {
    const diet = { title: "Dieta test", days: [{ dayOfWeek: otherDay, meals: [] }] };
    expect(summarizeActiveDietForPrompt(diet)).toMatch(/no hay comidas registradas para hoy/);
  });

  it("summarizes today's meals with macro totals", () => {
    const diet = {
      title: "Dieta test",
      days: [
        {
          dayOfWeek: today,
          meals: [
            {
              name: "Desayuno",
              options: [
                {
                  name: "Opción A",
                  items: [
                    {
                      ingredient: "Avena",
                      amount: "50g",
                      calories: 200,
                      protein: 8,
                      carbs: 30,
                      fat: 3,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const summary = summarizeActiveDietForPrompt(diet);
    expect(summary).toContain('Dieta activa del usuario: "Dieta test"');
    expect(summary).toContain("Desayuno: Avena (50g)");
    expect(summary).toContain("200 kcal");
  });
});

describe("buildDietEditContext", () => {
  it("reports no active diet", () => {
    expect(buildDietEditContext(null)).toMatch(/No hay nada que editar/);
  });

  it("includes item and option ids for every day", () => {
    const diet = {
      title: "Dieta test",
      days: [
        {
          dayOfWeek: "Lunes",
          meals: [
            {
              name: "Comida",
              options: [
                {
                  id: "opt-1",
                  name: "Opción A",
                  items: [
                    {
                      id: "item-1",
                      ingredient: "Pollo",
                      amount: "150g",
                      calories: 250,
                      protein: 30,
                      carbs: 0,
                      fat: 5,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const context = buildDietEditContext(diet);
    expect(context).toContain("[mealOption:opt-1]");
    expect(context).toContain("[item:item-1]");
    expect(context).toContain("Macros totales estimados de toda la semana");
  });
});
