const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Defensa en profundidad contra CSRF para las rutas de API que no son de NextAuth
 * (esas ya llevan su propia protección). SameSite=Lax detiene peticiones cross-*site*
 * pero no cross-*origin* dentro del mismo site (ej. un subdominio hermano), así que toda
 * mutación exige además que el navegador confirme same-origin vía Sec-Fetch-Site (no
 * falsificable por JS) o, si el navegador no la envía, que el header Origin coincida con
 * el origen de la petición. Sin ninguna de las dos señales, se rechaza: bytebite no tiene
 * clientes legítimos que muten datos sin ser el propio navegador de la app.
 */
export function isSameOriginRequest(request: Request, requestOrigin: string): boolean {
  if (SAFE_METHODS.has(request.method)) return true;

  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite) return secFetchSite === "same-origin" || secFetchSite === "none";

  const origin = request.headers.get("origin");
  if (origin) return origin === requestOrigin;

  return false;
}
