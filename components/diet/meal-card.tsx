"use client";

import { useState, useTransition } from "react";
import { Coffee, Apple, Moon, UtensilsCrossed, Utensils, type LucideIcon } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  const [optionsState, setOptionsState] = useState(meal.options);
  const [, startTransition] = useTransition();

  const totalItems = optionsState.reduce((acc, opt) => acc + opt.items.length, 0);
  const checkedItems = optionsState.reduce(
    (acc, opt) => acc + opt.items.filter((i) => i.checked).length,
    0,
  );
  const mealTotals = sumMacros(optionsState.flatMap((opt) => opt.items));
  const Icon = getMealIcon(meal.name);

  function toggleItem(optionId: string, itemId: string) {
    setOptionsState((prev) =>
      prev.map((opt) =>
        opt.id !== optionId
          ? opt
          : {
              ...opt,
              items: opt.items.map((item) =>
                item.id !== itemId ? item : { ...item, checked: !item.checked },
              ),
            },
      ),
    );

    startTransition(() => {
      fetch(`/api/items/${itemId}/toggle`, { method: "PATCH" }).catch(() => {
        // revert on failure
        setOptionsState((prev) =>
          prev.map((opt) =>
            opt.id !== optionId
              ? opt
              : {
                  ...opt,
                  items: opt.items.map((item) =>
                    item.id !== itemId ? item : { ...item, checked: !item.checked },
                  ),
                },
          ),
        );
      });
    });
  }

  return (
    <Card className="overflow-hidden">
      <Accordion type="single" collapsible>
        <AccordionItem value={meal.id} className="border-b-0">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
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
          <AccordionContent className="px-4">
            <div className="space-y-4">
              {optionsState.map((option) => {
                const optionTotals = sumMacros(option.items);
                return (
                  <div key={option.id}>
                    {(optionsState.length > 1 || option.description) && (
                      <div className="mb-2 flex items-center justify-between">
                        {optionsState.length > 1 && (
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {option.name}
                          </p>
                        )}
                        {optionTotals.hasData && (
                          <span className="text-xs text-muted-foreground">
                            {Math.round(optionTotals.calories)} kcal
                          </span>
                        )}
                      </div>
                    )}
                    {option.description && (
                      <p className="mb-2 text-sm text-muted-foreground">{option.description}</p>
                    )}
                    <ul className="space-y-2">
                      {option.items.map((item) => {
                        const hasMacros =
                          item.calories != null ||
                          item.protein != null ||
                          item.carbs != null ||
                          item.fat != null;
                        return (
                          <li key={item.id} className="flex items-start gap-3 capitalize">
                            <Checkbox
                              id={item.id}
                              checked={item.checked}
                              onCheckedChange={() => toggleItem(option.id, item.id)}
                              className="mt-0.5"
                            />
                            <label
                              htmlFor={item.id}
                              className={cn(
                                "flex flex-1 flex-col gap-1 text-sm",
                                item.checked && "text-muted-foreground line-through",
                              )}
                            >
                              <span className="flex items-baseline justify-between">
                                <span>{item.ingredient}</span>
                                <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                                  {item.amount}
                                </span>
                              </span>
                              {hasMacros && !item.checked && (
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
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
