import { z } from "zod";

export const GOALS = ["perder_peso", "ganar_musculo", "mantenimiento", "comer_mejor"] as const;

export const GOAL_LABELS: Record<(typeof GOALS)[number], string> = {
  perder_peso: "Perder peso",
  ganar_musculo: "Ganar músculo",
  mantenimiento: "Mantenimiento",
  comer_mejor: "Comer mejor en general",
};

export const goalUpdateSchema = z.object({
  goal: z.enum(GOALS),
});

export const chatTextSchema = z.string().trim().max(2000);
