"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DailySummary } from "@/components/diet/daily-summary";
import { MealCard } from "@/components/diet/meal-card";
import { DAYS_OF_WEEK } from "@/lib/utils";
import type { DietDay } from "@/components/diet/types";

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
        </TabsContent>
      ))}
    </Tabs>
  );
}
