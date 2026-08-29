import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isSameOriginRequest } from "@/lib/csrf";

const PUBLIC_PREFIXES = ["/api/auth", "/login"];

// Rutas propias de NextAuth (catch-all [...nextauth]): ya llevan su propia protección
// CSRF (double-submit token). /api/auth/register es NUESTRA ruta, no una de estas, y sí
// necesita la comprobación de abajo.
const NEXTAUTH_ROUTE = /^\/api\/auth\/(signin|signout|callback|session|csrf|providers|error)/;

// La llama un cron externo, no un navegador: no hay sesión ni cabeceras Origin/Sec-Fetch-Site
// que comprobar. Su propia autenticación es el secreto compartido (ver la ruta).
const CRON_ROUTE = "/api/push/send-reminders";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (
    pathname !== CRON_ROUTE &&
    !NEXTAUTH_ROUTE.test(pathname) &&
    !isSameOriginRequest(req, req.nextUrl.origin)
  ) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }

  const isPublic = pathname === CRON_ROUTE || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isPublic && !req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons).*)"],
};
