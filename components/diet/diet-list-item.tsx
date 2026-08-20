"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EntityFormDialog } from "@/components/diet/entity-form-dialog";
import { ConfirmDeleteButton } from "@/components/diet/confirm-delete-button";
import { parseErrorBody } from "@/lib/utils";

interface DietSummary {
  id: string;
  title: string;
  isActive: boolean;
  _count: { days: number };
}

export function DietListItem({ diet }: { diet: DietSummary }) {
  const router = useRouter();
  const [activating, setActivating] = useState(false);

  async function handleActivate() {
    setActivating(true);
    await fetch(`/api/diets/${diet.id}/activate`, { method: "PATCH" }).catch(() => {});
    setActivating(false);
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">{diet.title}</p>
          {diet.isActive && <Badge>Activa</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          {diet._count.days} {diet._count.days === 1 ? "día" : "días"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard?diet=${diet.id}`}>Ver</Link>
        </Button>
        {!diet.isActive && (
          <Button type="button" variant="ghost" size="sm" disabled={activating} onClick={handleActivate}>
            {activating ? "Guardando…" : "Usar esta dieta"}
          </Button>
        )}
        <EntityFormDialog
          trigger={
            <Button type="button" variant="ghost" size="sm">
              Renombrar
            </Button>
          }
          title="Renombrar dieta"
          fields={[{ name: "title", label: "Título", defaultValue: diet.title, required: true }]}
          onSubmit={async (values) => {
            const res = await fetch(`/api/diets/${diet.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: values.title }),
            });
            if (!res.ok) return { error: await parseErrorBody(res, "No se pudo renombrar.") };
          }}
        />
        <ConfirmDeleteButton
          description={`Se eliminará la dieta "${diet.title}" y todo su contenido.`}
          onConfirm={async () => {
            const res = await fetch(`/api/diets/${diet.id}`, { method: "DELETE" });
            if (!res.ok) return { error: await parseErrorBody(res, "No se pudo eliminar la dieta.") };
          }}
        />
      </div>
    </Card>
  );
}
