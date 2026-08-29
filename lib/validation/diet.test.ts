import { describe, expect, it } from "vitest";
import { createDietSchema, dietEditOperationSchema, dietEditOperationsSchema } from "./diet";

const validItem = { ingredient: "Arroz", amount: "100g" };

describe("createDietSchema", () => {
  it("accepts a minimal valid diet tree", () => {
    const diet = {
      title: "Semana 1",
      days: [
        {
          dayOfWeek: "Lunes",
          meals: [
            { name: "Comida", order: 0, options: [{ name: "Opción A", items: [validItem] }] },
          ],
        },
      ],
    };
    expect(createDietSchema.safeParse(diet).success).toBe(true);
  });

  it("rejects a day with no meals", () => {
    const diet = { title: "Semana 1", days: [{ dayOfWeek: "Lunes", meals: [] }] };
    expect(createDietSchema.safeParse(diet).success).toBe(false);
  });

  it("rejects an option with no items", () => {
    const diet = {
      title: "Semana 1",
      days: [
        {
          dayOfWeek: "Lunes",
          meals: [{ name: "Comida", order: 0, options: [{ name: "A", items: [] }] }],
        },
      ],
    };
    expect(createDietSchema.safeParse(diet).success).toBe(false);
  });

  it("coerces numeric macro strings", () => {
    const diet = {
      title: "Semana 1",
      days: [
        {
          dayOfWeek: "Lunes",
          meals: [
            {
              name: "Comida",
              order: 0,
              options: [{ name: "A", items: [{ ...validItem, calories: "200" }] }],
            },
          ],
        },
      ],
    };
    const result = createDietSchema.safeParse(diet);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.days[0].meals[0].options[0].items[0].calories).toBe(200);
    }
  });
});

describe("dietEditOperationSchema", () => {
  it("accepts a valid add_item operation", () => {
    const op = { action: "add_item", mealOptionId: "opt-1", ingredient: "Huevo", amount: "2 uds" };
    expect(dietEditOperationSchema.safeParse(op).success).toBe(true);
  });

  it("rejects an unknown action", () => {
    expect(dietEditOperationSchema.safeParse({ action: "delete_meal", itemId: "x" }).success).toBe(
      false,
    );
  });

  it("caps the number of operations per batch", () => {
    const ops = Array.from({ length: 21 }, () => ({
      action: "delete_item" as const,
      itemId: "item-1",
    }));
    expect(dietEditOperationsSchema.safeParse(ops).success).toBe(false);
  });
});
