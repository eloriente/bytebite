"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ItemFields } from "./item-fields";
import { emptyItem, type DraftOption } from "./types";

export function OptionFields({
  value,
  onChange,
  onRemove,
  canRemove,
}: {
  value: DraftOption;
  onChange: (patch: Partial<DraftOption>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  function updateItem(index: number, patch: Partial<DraftOption["items"][number]>) {
    onChange({
      items: value.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  }

  function addItem() {
    onChange({ items: [...value.items, emptyItem()] });
  }

  function removeItem(index: number) {
    onChange({ items: value.items.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-3 rounded-lg border bg-secondary/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <div className="space-y-1">
            <Label htmlFor={`option-name-${value._key}`}>Nombre de la opción</Label>
            <Input
              id={`option-name-${value._key}`}
              value={value.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Opción única"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`option-desc-${value._key}`}>Descripción (opcional)</Label>
            <Textarea
              id={`option-desc-${value._key}`}
              value={value.description ?? ""}
              onChange={(e) => onChange({ description: e.target.value || null })}
              rows={2}
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
          <span className="sr-only">Eliminar opción</span>
        </Button>
      </div>

      <div className="space-y-2">
        {value.items.map((item, i) => (
          <ItemFields
            key={item._key}
            value={item}
            onChange={(patch) => updateItem(i, patch)}
            onRemove={() => removeItem(i)}
            canRemove={value.items.length > 1}
          />
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="mr-1.5 h-4 w-4" />
        Añadir ingrediente
      </Button>
    </div>
  );
}
