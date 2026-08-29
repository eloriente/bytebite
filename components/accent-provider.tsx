"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";

export const ACCENTS = [
  { id: "lime", label: "Verde", light: "#34c759", dark: "#30d158" },
  { id: "sky", label: "Azul", light: "#007aff", dark: "#0a84ff" },
  { id: "orange", label: "Naranja", light: "#ff9500", dark: "#ff9f0a" },
  { id: "violet", label: "Violeta", light: "#af52de", dark: "#bf5af2" },
  { id: "pink", label: "Rosa", light: "#ff2d55", dark: "#ff375f" },
  { id: "red", label: "Rojo", light: "#ff3b30", dark: "#ff453a" },
  { id: "teal", label: "Turquesa", light: "#30b0c7", dark: "#40c8e0" },
  { id: "gold", label: "Dorado", light: "#ffcc00", dark: "#ffd60a" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

const STORAGE_KEY = "bytebite:accent";
const DEFAULT_ACCENT: AccentId = "lime";

function isAccentId(value: string | null): value is AccentId {
  return ACCENTS.some((a) => a.id === value);
}

function accentHex(id: AccentId, dark: boolean): string {
  const entry = ACCENTS.find((a) => a.id === id)!;
  return dark ? entry.dark : entry.light;
}

/** El script que evita el parpadeo (ver `app/layout.tsx`) ya deja `data-accent` correcto en
 * el `<html>` antes de que React hidrate — este provider solo mantiene el estado en React
 * sincronizado con eso y con localStorage al cambiarlo. Preferencia solo de este dispositivo,
 * igual que el tema (next-themes): no se guarda en la cuenta del usuario. */
const AccentContext = createContext<{
  accent: AccentId;
  setAccent: (next: AccentId) => void;
} | null>(null);

export function AccentProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState<AccentId>(DEFAULT_ACCENT);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isAccentId(stored)) setAccentState(stored);
  }, []);

  // El color de la barra de estado/navegador sigue al acento, como en opengym: cambia con el
  // acento elegido y con el tema claro/oscuro, no un verde fijo.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", accentHex(accent, resolvedTheme === "dark"));
  }, [accent, resolvedTheme]);

  function setAccent(next: AccentId) {
    setAccentState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.setAttribute("data-accent", next);
  }

  return <AccentContext.Provider value={{ accent, setAccent }}>{children}</AccentContext.Provider>;
}

export function useAccent() {
  const ctx = useContext(AccentContext);
  if (!ctx) throw new Error("useAccent debe usarse dentro de <AccentProvider>.");
  return ctx;
}
