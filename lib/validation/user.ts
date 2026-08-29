import { z } from "zod";

export const nameUpdateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(100),
});

export const reminderUpdateSchema = z.object({
  reminderEnabled: z.boolean(),
  reminderHour: z.number().int().min(0).max(23).nullable(),
});
