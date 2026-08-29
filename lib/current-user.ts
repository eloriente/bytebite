import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/**
 * Sesión + comprobación de revocación ("cerrar sesión en todos los dispositivos") en un
 * único sitio. Debe llamarse desde Node.js (Server Components / Route Handlers), nunca desde
 * middleware.ts — ver el comentario en auth.ts sobre por qué esos callbacks no pueden tocar
 * Prisma (corren también en el Edge Runtime).
 *
 * Nota de alcance: solo el layout de `(app)` (y por tanto toda la navegación de páginas) usa
 * esto hoy. Las rutas de API siguen confiando únicamente en la validez normal del JWT — no
 * comprueban `sessionVersion` en cada petición — así que un token robado sigue funcionando
 * contra la API hasta que expire (por defecto, la sesión de NextAuth) aunque el usuario haya
 * pulsado "cerrar sesión en todos los dispositivos". Documentado también en SECURITY.md.
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return null;
  if (user.sessionVersion !== session.user.sessionVersion) return null;

  return user;
}
