"use client";

import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { DraftItem } from "./types";

function numberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function ItemFields({
  value,
  onChange,
  onRemove,
  canRemove,
}: {
  value: DraftItem;
  onChange: (patch: Partial<DraftItem>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="grid flex-1 grid-cols-2 gap-2">
          <div className="col-span-2 space-y-1">
            <Label htmlFor={`ingredient-${value._key}`}>Ingrediente</Label>
            <Input
              id={`ingredient-${value._key}`}
              value={value.ingredient}
              onChange={(e) => onChange({ ingredient: e.target.value })}
              placeholder="Pechuga de pollo"
              required
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label htmlFor={`amount-${value._key}`}>Cantidad</Label>
            <Input
              id={`amount-${value._key}`}
              value={value.amount}
              onChange={(e) => onChange({ amount: e.target.value })}
              placeholder="150 g"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`calories-${value._key}`}>Calorías (kcal)</Label>
            <Input
              id={`calories-${value._key}`}
              type="number"
              step="any"
              value={value.calories ?? ""}
              onChange={(e) => onChange({ calories: numberOrNull(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`protein-${value._key}`}>Proteína (g)</Label>
            <Input
              id={`protein-${value._key}`}
              type="number"
              step="any"
              value={value.protein ?? ""}
              onChange={(e) => onChange({ protein: numberOrNull(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`carbs-${value._key}`}>Carbohidratos (g)</Label>
            <Input
              id={`carbs-${value._key}`}
              type="number"
              step="any"
              value={value.carbs ?? ""}
              onChange={(e) => onChange({ carbs: numberOrNull(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`fat-${value._key}`}>Grasa (g)</Label>
            <Input
              id={`fat-${value._key}`}
              type="number"
              step="any"
              value={value.fat ?? ""}
              onChange={(e) => onChange({ fat: numberOrNull(e.target.value) })}
            />
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          disabled={!canRemove}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Eliminar ingrediente</span>
        </Button>
      </div>
    </div>
  );
}
