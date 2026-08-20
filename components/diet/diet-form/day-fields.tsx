"use client";

import { Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DAYS_OF_WEEK } from "@/lib/utils";
import { MealFields } from "./meal-fields";
import { emptyMeal, type DraftDay } from "./types";

export function DayFields({
  value,
  onChange,
  onRemove,
  canRemove,
}: {
  value: DraftDay;
  onChange: (patch: Partial<DraftDay>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  function updateMeal(index: number, patch: Partial<DraftDay["meals"][number]>) {
    onChange({
      meals: value.meals.map((meal, i) => (i === index ? { ...meal, ...patch } : meal)),
    });
  }

  function addMeal() {
    onChange({ meals: [...value.meals, emptyMeal(value.meals.length)] });
  }

  function removeMeal(index: number) {
    onChange({ meals: value.meals.filter((_, i) => i !== index) });
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-end justify-between gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor={`day-${value._key}`}>Día</Label>
          <select
            id={`day-${value._key}`}
            value={value.dayOfWeek}
            onChange={(e) => onChange({ dayOfWeek: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {DAYS_OF_WEEK.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
            <option value={value.dayOfWeek} hidden={DAYS_OF_WEEK.includes(value.dayOfWeek as any)}>
              {value.dayOfWeek}
            </option>
          </select>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          disabled={!canRemove}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Eliminar día</span>
        </Button>
      </div>

      <div className="space-y-3">
        {value.meals.map((meal, i) => (
          <MealFields
            key={meal._key}
            value={meal}
            onChange={(patch) => updateMeal(i, patch)}
            onRemove={() => removeMeal(i)}
            canRemove={value.meals.length > 1}
          />
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addMeal}>
        <Plus className="mr-1.5 h-4 w-4" />
        Añadir comida
      </Button>
    </Card>
  );
}
