export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  hasData: boolean;
}

interface NutrientFields {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export function sumMacros(items: NutrientFields[]): MacroTotals {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let hasData = false;

  for (const item of items) {
    if (item.calories != null) {
      calories += item.calories;
      hasData = true;
    }
    if (item.protein != null) {
      protein += item.protein;
      hasData = true;
    }
    if (item.carbs != null) {
      carbs += item.carbs;
      hasData = true;
    }
    if (item.fat != null) {
      fat += item.fat;
      hasData = true;
    }
  }

  return { calories, protein, carbs, fat, hasData };
}
