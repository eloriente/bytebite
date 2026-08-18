"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MealAccordion } from "@/components/diet/meal-accordion";
import { DAYS_OF_WEEK } from "@/lib/utils";

interface Item {
  id: string;
  ingredient: string;
  amount: string;
  checked: boolean;
}

interface MealOption {
  id: string;
  name: string;
  description: string | null;
  items: Item[];
}

interface Meal {
  id: string;
  name: string;
  order: number;
  options: MealOption[];
}

interface DietDay {
  id: string;
  dayOfWeek: string;
  meals: Meal[];
}

function todayInSpanish() {
  const idx = new Date().getDay(); // 0 = Sunday
  return DAYS_OF_WEEK[(idx + 6) % 7];
}

export function DietViewer({ days }: { days: DietDay[] }) {
  const orderedDays = useMemo(() => {
    const known = DAYS_OF_WEEK.filter((d) => days.some((day) => day.dayOfWeek === d)).map(
      (d) => days.find((day) => day.dayOfWeek === d)!,
    );
    const unknown = days.filter((day) => !DAYS_OF_WEEK.includes(day.dayOfWeek as any));
    return [...known, ...unknown];
  }, [days]);

  const defaultDay =
    orderedDays.find((d) => d.dayOfWeek === todayInSpanish())?.id ?? orderedDays[0]?.id;

  if (orderedDays.length === 0) return null;

  return (
    <Tabs defaultValue={defaultDay} className="w-full">
      <TabsList>
        {orderedDays.map((day) => (
          <TabsTrigger key={day.id} value={day.id}>
            {day.dayOfWeek}
          </TabsTrigger>
        ))}
      </TabsList>

      {orderedDays.map((day) => (
        <TabsContent key={day.id} value={day.id} className="space-y-3">
          {day.meals.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay comidas registradas para este día.
            </p>
          )}
          {day.meals.map((meal) => (
            <MealAccordion key={meal.id} meal={meal} />
          ))}
        </TabsContent>
      ))}
    </Tabs>
  );
}
