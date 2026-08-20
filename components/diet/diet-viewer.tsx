"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { EntityFormDialog } from "@/components/diet/entity-form-dialog";
import { ConfirmDeleteButton } from "@/components/diet/confirm-delete-button";
import { DailySummary } from "@/components/diet/daily-summary";
import { MealCard } from "@/components/diet/meal-card";
import { DAYS_OF_WEEK, DAYS_OF_WEEK_SHORT, cn } from "@/lib/utils";
import type { DietDay } from "@/components/diet/types";

function todayInSpanish() {
  const idx = new Date().getDay(); // 0 = Sunday
  return DAYS_OF_WEEK[(idx + 6) % 7];
}

export function DietViewer({ days, dietId }: { days: DietDay[]; dietId: string }) {
  const [editing, setEditing] = useState(false);
  const orderedDays = useMemo(() => {
    const known = DAYS_OF_WEEK.filter((d) => days.some((day) => day.dayOfWeek === d)).map(
      (d) => days.find((day) => day.dayOfWeek === d)!,
    );
    const unknown = days.filter((day) => !DAYS_OF_WEEK.includes(day.dayOfWeek as any));
    return [...known, ...unknown];
  }, [days]);

  const defaultDay =
    orderedDays.find((d) => d.dayOfWeek === todayInSpanish())?.id ?? orderedDays[0]?.id;
  // Se remonta el Tabs cuando cambia el conjunto de días (cambio de dieta o
  // alta/baja de un día) para evitar quedarse con una pestaña activa que ya
  // no existe (Radix no repinta contenido si el value seleccionado no coincide
  // con ningún TabsTrigger).
  const tabsKey = orderedDays.map((d) => d.id).join(",");

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(editing && "bg-accent")}
          onClick={() => setEditing((v) => !v)}
        >
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          {editing ? "Terminar edición" : "Editar días"}
        </Button>
      </div>

      {orderedDays.length > 0 && (
        <Tabs key={tabsKey} defaultValue={defaultDay} className="w-full">
          <TabsList className="grid grid-cols-7 gap-1">
            {orderedDays.map((day) => (
              <TabsTrigger
                key={day.id}
                value={day.id}
                title={day.dayOfWeek}
                className="px-1 text-xs sm:text-sm"
              >
                {DAYS_OF_WEEK_SHORT[day.dayOfWeek] ?? day.dayOfWeek}
              </TabsTrigger>
            ))}
          </TabsList>

          {orderedDays.map((day) => (
            <TabsContent key={day.id} value={day.id} className="space-y-3">
              {editing && (
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">{day.dayOfWeek}</p>
                  <ConfirmDeleteButton
                    description={`Se eliminará el día "${day.dayOfWeek}" y todas sus comidas.`}
                    onConfirm={async () => {
                      const res = await fetch(`/api/diet-days/${day.id}`, { method: "DELETE" });
                      if (!res.ok) {
                        const body = await res.json().catch(() => ({}));
                        return { error: body.error ?? "No se pudo eliminar el día." };
                      }
                    }}
                  />
                </div>
              )}

              {day.meals.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No hay comidas registradas para este día.
                </p>
              ) : (
                <>
                  <DailySummary meals={day.meals} />
                  {day.meals.map((meal) => (
                    <MealCard key={meal.id} meal={meal} />
                  ))}
                </>
              )}

              {editing && (
                <EntityFormDialog
                  trigger={
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="mr-1.5 h-4 w-4" />
                      Añadir comida
                    </Button>
                  }
                  title="Nueva comida"
                  fields={[
                    { name: "name", label: "Nombre", placeholder: "Desayuno", required: true },
                  ]}
                  onSubmit={async (values) => {
                    const res = await fetch(`/api/diet-days/${day.id}/meals`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name: values.name, order: day.meals.length }),
                    });
                    if (!res.ok) {
                      const body = await res.json().catch(() => ({}));
                      return { error: body.error ?? "No se pudo crear la comida." };
                    }
                  }}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {editing && (
        <EntityFormDialog
          trigger={
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="mr-1.5 h-4 w-4" />
              Añadir día
            </Button>
          }
          title="Nuevo día"
          fields={[
            {
              name: "dayOfWeek",
              label: "Día de la semana",
              placeholder: "Lunes",
              required: true,
            },
          ]}
          onSubmit={async (values) => {
            const res = await fetch("/api/diet-days", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ dietId, dayOfWeek: values.dayOfWeek }),
            });
            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              return { error: body.error ?? "No se pudo crear el día." };
            }
          }}
        />
      )}
    </div>
  );
}
