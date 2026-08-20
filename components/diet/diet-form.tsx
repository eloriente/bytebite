"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createDietSchema } from "@/lib/validation/diet";
import { DayFields } from "./diet-form/day-fields";
import { emptyDay, toParsedDiet, type DraftDay } from "./diet-form/types";

export function DietForm({ onSubmitted }: { onSubmitted: (dietId: string) => void }) {
  const [title, setTitle] = useState("");
  const [days, setDays] = useState<DraftDay[]>([emptyDay("Lunes")]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateDay(index: number, patch: Partial<DraftDay>) {
    setDays((prev) => prev.map((day, i) => (i === index ? { ...day, ...patch } : day)));
  }

  function addDay() {
    setDays((prev) => [...prev, emptyDay("Lunes")]);
  }

  function removeDay(index: number) {
    setDays((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = toParsedDiet(title, days);
    const parsed = createDietSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos introducidos.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/diets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar la dieta.");
      return;
    }

    onSubmitted(data.diet.id);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="diet-title">Título de la dieta</Label>
        <Input
          id="diet-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Mi dieta"
          required
        />
      </div>

      <div className="space-y-3">
        {days.map((day, i) => (
          <DayFields
            key={day._key}
            value={day}
            onChange={(patch) => updateDay(i, patch)}
            onRemove={() => removeDay(i)}
            canRemove={days.length > 1}
          />
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" className="w-full" onClick={addDay}>
        <Plus className="mr-1.5 h-4 w-4" />
        Añadir día
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Guardando…" : "Guardar dieta"}
      </Button>
    </form>
  );
}
