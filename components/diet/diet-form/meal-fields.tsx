"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OptionFields } from "./option-fields";
import { emptyOption, type DraftMeal } from "./types";

export function MealFields({
  value,
  onChange,
  onRemove,
  canRemove,
}: {
  value: DraftMeal;
  onChange: (patch: Partial<DraftMeal>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  function updateOption(index: number, patch: Partial<DraftMeal["options"][number]>) {
    onChange({
      options: value.options.map((option, i) => (i === index ? { ...option, ...patch } : option)),
    });
  }

  function addOption() {
    onChange({ options: [...value.options, emptyOption()] });
  }

  function removeOption(index: number) {
    onChange({ options: value.options.filter((_, i) => i !== index) });
  }

  return (
    <Card className="space-y-3 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor={`meal-name-${value._key}`}>Nombre de la comida</Label>
          <Input
            id={`meal-name-${value._key}`}
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Desayuno"
            required
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mt-6 h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          disabled={!canRemove}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Eliminar comida</span>
        </Button>
      </div>

      <div className="space-y-3">
        {value.options.map((option, i) => (
          <OptionFields
            key={option._key}
            value={option}
            onChange={(patch) => updateOption(i, patch)}
            onRemove={() => removeOption(i)}
            canRemove={value.options.length > 1}
          />
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addOption}>
        <Plus className="mr-1.5 h-4 w-4" />
        Añadir opción alternativa
      </Button>
    </Card>
  );
}
