"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCENTS, useAccent } from "@/components/accent-provider";

const THEME_OPTIONS = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Sistema" },
] as const;

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();
  const [mounted, setMounted] = useState(false);

  // Evita el desajuste de hidratación: el tema/acento reales solo se conocen tras leer
  // localStorage en el cliente (igual que el resto de la app hace con next-themes).
  useEffect(() => setMounted(true), []);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-xs text-muted-foreground">Tema</p>
        <div className="flex gap-1 rounded-xl bg-secondary p-1">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-sm font-medium transition-[background-color,box-shadow] duration-150 ease-apple",
                mounted && theme === opt.value
                  ? "bg-card text-foreground shadow"
                  : "text-muted-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs text-muted-foreground">Color de acento</p>
        <div className="grid grid-cols-4 gap-3">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-label={a.label}
              onClick={() => setAccent(a.id)}
              className="flex flex-col items-center gap-1"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: a.light }}
              >
                {mounted && accent === a.id && <Check className="h-4 w-4 text-white" />}
              </span>
              <span className="text-[0.6875rem] text-muted-foreground">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
