"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, parseErrorBody } from "@/lib/utils";
import { GOALS, GOAL_LABELS } from "@/lib/validation/chat";

export function GoalForm({ initialGoal }: { initialGoal: string | null }) {
  const [goal, setGoal] = useState(initialGoal);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function selectGoal(next: string) {
    if (next === goal) return;
    setGoal(next);
    setSaving(true);
    setSaved(false);
    setError(null);

    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: next }),
    });

    setSaving(false);
    if (!res.ok) {
      setError(await parseErrorBody(res, "No se pudo guardar el objetivo."));
      return;
    }
    setSaved(true);
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {GOALS.map((value) => (
          <Button
            key={value}
            type="button"
            variant={goal === value ? "default" : "outline"}
            size="sm"
            className="h-auto justify-start gap-2 whitespace-normal py-2 text-left"
            onClick={() => selectGoal(value)}
          >
            {goal === value && <Check className="h-3.5 w-3.5 shrink-0" />}
            {GOAL_LABELS[value]}
          </Button>
        ))}
      </div>
      {saving && <p className="text-xs text-muted-foreground">Guardando…</p>}
      {saved && !saving && <p className="text-xs text-primary">Guardado.</p>}
      {error && <p className={cn("text-xs text-destructive")}>{error}</p>}
    </div>
  );
}
