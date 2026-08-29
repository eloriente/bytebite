import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Introduce un email válido.");

export const passkeyRegisterOptionsSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(100),
  email: emailSchema,
});

export type PasskeyRegisterOptionsInput = z.infer<typeof passkeyRegisterOptionsSchema>;
