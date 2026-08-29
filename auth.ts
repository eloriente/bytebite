import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { takePostAuthToken } from "@/lib/webauthn-store";

// `next build` fuerza NODE_ENV=production incluso para el propio build (no solo en runtime),
// y ese build importa este módulo al recolectar datos de cada ruta — sin que exista todavía
// ningún AUTH_SECRET real (en Docker, el build no tiene `.env`). NEXT_PHASE distingue "estoy
// construyendo" de "estoy sirviendo tráfico"; sin este guard, el build de Docker fallaba
// siempre (ver docs/decisions.md).
if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  !process.env.AUTH_SECRET
) {
  throw new Error("AUTH_SECRET no está definido. Configúralo antes de arrancar en producción.");
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Autoalojado detrás de un proxy inverso propio (nginx/Caddy/Cloudflare Tunnel...): sin
  // esto, NextAuth v5 rechaza cualquier Host que no reconozca explícitamente ("UntrustedHost"),
  // incluso siendo el dominio real de NEXTAUTH_URL. Es el mismo dominio ya validado aparte por
  // el CSRF de lib/csrf.ts (Sec-Fetch-Site/Origin) — esto no relaja esa comprobación, solo dice
  // qué Host usar para construir URLs/cookies.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      // No hay contraseña: el "credential" es un token de un solo uso, de vida muy corta,
      // que /api/auth/webauthn/{register,login}-verify emiten después de comprobar la
      // firma de la passkey (ver lib/webauthn-store.ts). Toda la emisión de sesión pasa
      // por aquí, sea cual sea el ceremonial WebAuthn que la precedió.
      credentials: {
        token: { label: "Token", type: "text" },
      },
      authorize: async (credentials) => {
        const token = credentials?.token as string | undefined;
        if (!token) return null;

        const userId = await takePostAuthToken(token);
        if (!userId) return null;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    // `jwt`/`session` corren también en middleware.ts, que Next.js ejecuta en el Edge
    // Runtime — Prisma (motor SQLite) no funciona ahí. Por eso estos callbacks NUNCA tocan
    // Prisma: solo mueven datos ya presentes en el JWT/`user`. La comprobación real de
    // `sessionVersion` (revocación por "cerrar sesión en todos los dispositivos") se hace
    // en Node.js, en `lib/current-user.ts#getCurrentUser`, usado por el layout de `(app)`.
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.sessionVersion = user.sessionVersion;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.sessionVersion = token.sessionVersion;
      }
      return session;
    },
  },
});
