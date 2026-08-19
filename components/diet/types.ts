export interface Item {
  id: string;
  ingredient: string;
  amount: string;
  checked: boolean;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export interface MealOption {
  id: string;
  name: string;
  description: string | null;
  items: Item[];
}

export interface Meal {
  id: string;
  name: string;
  order: number;
  options: MealOption[];
}

export interface DietDay {
  id: string;
  dayOfWeek: string;
  meals: Meal[];
}
