import { Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MacroBar } from "@/components/diet/macro-bar";
import { sumMacros } from "@/lib/nutrition";
import type { Meal } from "@/components/diet/types";

export function DailySummary({ meals }: { meals: Meal[] }) {
  const allItems = meals.flatMap((meal) => meal.options.flatMap((option) => option.items));
  const totals = sumMacros(allItems);

  if (!totals.hasData) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
          <Flame className="h-4 w-4 shrink-0" />
          <span>Sin datos nutricionales estimados para este día.</span>
        </CardContent>
      </Card>
    );
  }

  const maxGrams = Math.max(totals.protein, totals.carbs, totals.fat, 1);

  return (
    <Card>
      <CardContent className="space-y-4 pt-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{Math.round(totals.calories)}</p>
            <p className="text-xs text-muted-foreground">kcal estimadas del día</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MacroBar type="protein" grams={totals.protein} maxGrams={maxGrams} />
          <MacroBar type="carbs" grams={totals.carbs} maxGrams={maxGrams} />
          <MacroBar type="fat" grams={totals.fat} maxGrams={maxGrams} />
        </div>
      </CardContent>
    </Card>
  );
}
