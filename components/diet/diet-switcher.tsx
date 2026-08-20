"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface DietSummary {
  id: string;
  title: string;
  isActive: boolean;
}

export function DietSwitcher({
  diets,
  selectedId,
}: {
  diets: DietSummary[];
  selectedId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activating, setActivating] = useState(false);

  if (diets.length <= 1) return null;

  const selected = diets.find((d) => d.id === selectedId);
  const isDefault = selected?.isActive ?? false;

  function handleChange(id: string) {
    startTransition(() => {
      router.push(`/dashboard?diet=${id}`);
    });
  }

  async function handleActivate() {
    setActivating(true);
    await fetch(`/api/diets/${selectedId}/activate`, { method: "PATCH" }).catch(() => {});
    setActivating(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={selectedId}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-md border border-input bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {diets.map((diet) => (
          <option key={diet.id} value={diet.id}>
            {diet.title}
          </option>
        ))}
      </select>
      {!isDefault && (
        <Button variant="ghost" size="sm" disabled={activating} onClick={handleActivate}>
          {activating ? "Guardando…" : "Usar esta dieta"}
        </Button>
      )}
    </div>
  );
}
