"use client";

import { useState, useTransition } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

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
  options: MealOption[];
}

export function MealAccordion({ meal }: { meal: Meal }) {
  const [optionsState, setOptionsState] = useState(meal.options);
  const [, startTransition] = useTransition();

  const totalItems = optionsState.reduce((acc, opt) => acc + opt.items.length, 0);
  const checkedItems = optionsState.reduce(
    (acc, opt) => acc + opt.items.filter((i) => i.checked).length,
    0,
  );

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
    <Accordion type="single" collapsible className="rounded-lg border bg-card px-4">
      <AccordionItem value={meal.id}>
        <AccordionTrigger>
          <div className="flex flex-1 items-center justify-between pr-2">
            <span>{meal.name}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {checkedItems}/{totalItems}
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            {optionsState.map((option) => (
              <div key={option.id}>
                {optionsState.length > 1 && (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {option.name}
                  </p>
                )}
                {option.description && (
                  <p className="mb-2 text-sm text-muted-foreground">{option.description}</p>
                )}
                <ul className="space-y-2">
                  {option.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-3">
                      <Checkbox
                        id={item.id}
                        checked={item.checked}
                        onCheckedChange={() => toggleItem(option.id, item.id)}
                      />
                      <label
                        htmlFor={item.id}
                        className={cn(
                          "flex flex-1 items-baseline justify-between text-sm",
                          item.checked && "text-muted-foreground line-through",
                        )}
                      >
                        <span>{item.ingredient}</span>
                        <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                          {item.amount}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
