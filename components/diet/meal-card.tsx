"use client";

import { useState } from "react";
import {
  Coffee,
  Apple,
  Moon,
  UtensilsCrossed,
  Utensils,
  Pencil,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EntityFormDialog } from "@/components/diet/entity-form-dialog";
import { ConfirmDeleteButton } from "@/components/diet/confirm-delete-button";
import { cn, parseErrorBody } from "@/lib/utils";
import { sumMacros } from "@/lib/nutrition";
import type { Meal } from "@/components/diet/types";

const MEAL_ICONS: { keywords: string[]; icon: LucideIcon }[] = [
  { keywords: ["desayuno"], icon: Coffee },
  { keywords: ["almuerzo", "comida", "cena"], icon: UtensilsCrossed },
  { keywords: ["merienda", "snack"], icon: Apple },
  { keywords: ["recena"], icon: Moon },
];

function getMealIcon(name: string): LucideIcon {
  const lower = name.toLowerCase();
  return MEAL_ICONS.find((entry) => entry.keywords.some((kw) => lower.includes(kw)))?.icon ?? Utensils;
}

export function MealCard({ meal }: { meal: Meal }) {
  const [editing, setEditing] = useState(false);
  // Solo el estado de "marcado" se gestiona en el cliente para el toggle
  // optimista; la estructura (opciones/items) siempre viene de `meal` (props),
  // que se refresca vía router.refresh() tras cualquier alta/edición/baja.
  const [checkedOverrides, setCheckedOverrides] = useState<Record<string, boolean>>({});

  const options = meal.options;
  const isChecked = (itemId: string, fallback: boolean) => checkedOverrides[itemId] ?? fallback;

  const totalItems = options.reduce((acc, opt) => acc + opt.items.length, 0);
  const checkedItems = options.reduce(
    (acc, opt) => acc + opt.items.filter((i) => isChecked(i.id, i.checked)).length,
    0,
  );
  const mealTotals = sumMacros(options.flatMap((opt) => opt.items));
  const Icon = getMealIcon(meal.name);

  function toggleItem(itemId: string, current: boolean) {
    setCheckedOverrides((prev) => ({ ...prev, [itemId]: !current }));

    fetch(`/api/items/${itemId}/toggle`, { method: "PATCH" }).catch(() => {
      setCheckedOverrides((prev) => ({ ...prev, [itemId]: current }));
    });
  }

  return (
    <Card className="overflow-hidden">
      <Accordion type="single" collapsible>
        <AccordionItem value={meal.id} className="border-b-0">
          <div className="flex items-center gap-1 pr-2">
            <AccordionTrigger className="flex-1 px-4 py-3 hover:no-underline">
              <div className="flex flex-1 items-center gap-3 pr-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex flex-1 flex-col items-start gap-0.5">
                  <span className="text-sm font-semibold">{meal.name}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {checkedItems}/{totalItems} listo
                    </span>
                    {mealTotals.hasData && (
                      <>
                        <span aria-hidden>·</span>
                        <span>{Math.round(mealTotals.calories)} kcal</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 shrink-0", editing && "bg-accent")}
              onClick={(e) => {
                e.stopPropagation();
                setEditing((v) => !v);
              }}
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Editar comida</span>
            </Button>
          </div>
          <AccordionContent className="px-4">
            {editing && (
              <div className="mb-3 flex items-center gap-2">
                <EntityFormDialog
                  trigger={
                    <Button type="button" variant="outline" size="sm">
                      Renombrar comida
                    </Button>
                  }
                  title="Renombrar comida"
                  fields={[
                    { name: "name", label: "Nombre", defaultValue: meal.name, required: true },
                  ]}
                  onSubmit={async (values) => {
                    const res = await fetch(`/api/meals/${meal.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name: values.name }),
                    });
                    if (!res.ok) return { error: await parseErrorBody(res, "No se pudo renombrar.") };
                  }}
                />
                <ConfirmDeleteButton
                  description={`Se eliminará la comida "${meal.name}" y todo su contenido.`}
                  onConfirm={async () => {
                    const res = await fetch(`/api/meals/${meal.id}`, { method: "DELETE" });
                    if (!res.ok) return { error: await parseErrorBody(res, "No se pudo eliminar la comida.") };
                  }}
                />
              </div>
            )}

            <div className="space-y-3">
              {options.map((option) => {
                const optionTotals = sumMacros(option.items);
                return (
                  <div
                    key={option.id}
                    className={cn(editing && "rounded-lg border bg-secondary/20 p-2.5")}
                  >
                    {(options.length > 1 || option.description || editing) && (
                      <div className="mb-2 flex items-center justify-between gap-2">
                        {(options.length > 1 || editing) && (
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {option.name}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          {optionTotals.hasData && (
                            <span className="text-xs text-muted-foreground">
                              {Math.round(optionTotals.calories)} kcal
                            </span>
                          )}
                          {editing && (
                            <>
                              <EntityFormDialog
                                trigger={
                                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                                    <Pencil className="h-3.5 w-3.5" />
                                    <span className="sr-only">Editar opción</span>
                                  </Button>
                                }
                                title="Editar opción"
                                fields={[
                                  { name: "name", label: "Nombre", defaultValue: option.name, required: true },
                                  {
                                    name: "description",
                                    label: "Descripción",
                                    type: "textarea",
                                    defaultValue: option.description ?? "",
                                  },
                                ]}
                                onSubmit={async (values) => {
                                  const res = await fetch(`/api/meal-options/${option.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      name: values.name,
                                      description: values.description || null,
                                    }),
                                  });
                                  if (!res.ok) return { error: await parseErrorBody(res, "No se pudo editar.") };
                                }}
                              />
                              <ConfirmDeleteButton
                                description={`Se eliminará la opción "${option.name}" y sus ingredientes.`}
                                onConfirm={async () => {
                                  const res = await fetch(`/api/meal-options/${option.id}`, {
                                    method: "DELETE",
                                  });
                                  if (!res.ok) return { error: await parseErrorBody(res, "No se pudo eliminar.") };
                                }}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    {option.description && (
                      <p className="mb-2 text-sm text-muted-foreground">{option.description}</p>
                    )}
                    <ul className="space-y-2">
                      {option.items.map((item) => {
                        const checked = isChecked(item.id, item.checked);
                        const hasMacros =
                          item.calories != null ||
                          item.protein != null ||
                          item.carbs != null ||
                          item.fat != null;
                        return (
                          <li key={item.id} className="flex items-start gap-3 capitalize">
                            <Checkbox
                              id={item.id}
                              checked={checked}
                              onCheckedChange={() => toggleItem(item.id, checked)}
                              className="mt-0.5"
                            />
                            <label
                              htmlFor={item.id}
                              className={cn(
                                "flex flex-1 flex-col gap-1 text-sm",
                                checked && "text-muted-foreground line-through",
                              )}
                            >
                              <span className="flex items-baseline justify-between">
                                <span>{item.ingredient}</span>
                                <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                                  {item.amount}
                                </span>
                              </span>
                              {hasMacros && !checked && (
                                <span className="flex flex-wrap gap-1">
                                  {item.calories != null && (
                                    <Badge variant="outline">{Math.round(item.calories)} kcal</Badge>
                                  )}
                                  {item.protein != null && (
                                    <Badge variant="protein">{Math.round(item.protein)}g P</Badge>
                                  )}
                                  {item.carbs != null && (
                                    <Badge variant="carbs">{Math.round(item.carbs)}g C</Badge>
                                  )}
                                  {item.fat != null && (
                                    <Badge variant="fat">{Math.round(item.fat)}g G</Badge>
                                  )}
                                </span>
                              )}
                            </label>
                            {editing && (
                              <div className="flex shrink-0 items-center gap-1 capitalize-none normal-case">
                                <EntityFormDialog
                                  trigger={
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                                      <Pencil className="h-3.5 w-3.5" />
                                      <span className="sr-only">Editar ingrediente</span>
                                    </Button>
                                  }
                                  title="Editar ingrediente"
                                  fields={[
                                    {
                                      name: "ingredient",
                                      label: "Ingrediente",
                                      defaultValue: item.ingredient,
                                      required: true,
                                    },
                                    { name: "amount", label: "Cantidad", defaultValue: item.amount, required: true },
                                    { name: "calories", label: "Calorías (kcal)", type: "number", defaultValue: item.calories },
                                    { name: "protein", label: "Proteína (g)", type: "number", defaultValue: item.protein },
                                    { name: "carbs", label: "Carbohidratos (g)", type: "number", defaultValue: item.carbs },
                                    { name: "fat", label: "Grasa (g)", type: "number", defaultValue: item.fat },
                                  ]}
                                  onSubmit={async (values) => {
                                    const res = await fetch(`/api/items/${item.id}`, {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        ingredient: values.ingredient,
                                        amount: values.amount,
                                        calories: values.calories === "" ? null : Number(values.calories),
                                        protein: values.protein === "" ? null : Number(values.protein),
                                        carbs: values.carbs === "" ? null : Number(values.carbs),
                                        fat: values.fat === "" ? null : Number(values.fat),
                                      }),
                                    });
                                    if (!res.ok) return { error: await parseErrorBody(res, "No se pudo editar.") };
                                  }}
                                />
                                <ConfirmDeleteButton
                                  description={`Se eliminará "${item.ingredient}".`}
                                  onConfirm={async () => {
                                    const res = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
                                    if (!res.ok) return { error: await parseErrorBody(res, "No se pudo eliminar.") };
                                  }}
                                />
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    {editing && (
                      <EntityFormDialog
                        trigger={
                          <Button type="button" variant="outline" size="sm" className="mt-2">
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Añadir ingrediente
                          </Button>
                        }
                        title="Nuevo ingrediente"
                        fields={[
                          { name: "ingredient", label: "Ingrediente", required: true },
                          { name: "amount", label: "Cantidad", required: true },
                          { name: "calories", label: "Calorías (kcal)", type: "number" },
                          { name: "protein", label: "Proteína (g)", type: "number" },
                          { name: "carbs", label: "Carbohidratos (g)", type: "number" },
                          { name: "fat", label: "Grasa (g)", type: "number" },
                        ]}
                        onSubmit={async (values) => {
                          const res = await fetch(`/api/meal-options/${option.id}/items`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              ingredient: values.ingredient,
                              amount: values.amount,
                              calories: values.calories === "" ? null : Number(values.calories),
                              protein: values.protein === "" ? null : Number(values.protein),
                              carbs: values.carbs === "" ? null : Number(values.carbs),
                              fat: values.fat === "" ? null : Number(values.fat),
                            }),
                          });
                          if (!res.ok) return { error: await parseErrorBody(res, "No se pudo añadir.") };
                        }}
                      />
                    )}
                  </div>
                );
              })}

              {editing && (
                <EntityFormDialog
                  trigger={
                    <Button type="button" variant="outline" size="sm" className="w-full">
                      <Plus className="mr-1.5 h-4 w-4" />
                      Añadir opción
                    </Button>
                  }
                  title="Nueva opción"
                  fields={[
                    { name: "name", label: "Nombre", placeholder: "Opción B", required: true },
                    { name: "description", label: "Descripción", type: "textarea" },
                  ]}
                  onSubmit={async (values) => {
                    const res = await fetch(`/api/meals/${meal.id}/options`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: values.name,
                        description: values.description || null,
                      }),
                    });
                    if (!res.ok) return { error: await parseErrorBody(res, "No se pudo crear la opción.") };
                  }}
                />
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
