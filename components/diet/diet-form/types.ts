import type { ParsedDiet } from "@/lib/gemini";

export interface DraftItem {
  _key: string;
  ingredient: string;
  amount: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export interface DraftOption {
  _key: string;
  name: string;
  description: string | null;
  items: DraftItem[];
}

export interface DraftMeal {
  _key: string;
  name: string;
  order: number;
  options: DraftOption[];
}

export interface DraftDay {
  _key: string;
  dayOfWeek: string;
  meals: DraftMeal[];
}

function key() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function emptyItem(): DraftItem {
  return { _key: key(), ingredient: "", amount: "", calories: null, protein: null, carbs: null, fat: null };
}

export function emptyOption(): DraftOption {
  return { _key: key(), name: "Opción única", description: null, items: [emptyItem()] };
}

export function emptyMeal(order: number): DraftMeal {
  return { _key: key(), name: "", order, options: [emptyOption()] };
}

export function emptyDay(dayOfWeek: string): DraftDay {
  return { _key: key(), dayOfWeek, meals: [emptyMeal(0)] };
}

export function toParsedDiet(title: string, days: DraftDay[]): ParsedDiet {
  return {
    title,
    days: days.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      meals: day.meals.map((meal) => ({
        name: meal.name,
        order: meal.order,
        options: meal.options.map((option) => ({
          name: option.name,
          description: option.description,
          items: option.items.map((item) => ({
            ingredient: item.ingredient,
            amount: item.amount,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
          })),
        })),
      })),
    })),
  };
}
