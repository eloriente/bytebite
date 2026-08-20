const buckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

/**
 * Limitador en memoria por proceso: no persiste entre reinicios ni escala
 * entre varias instancias. Suficiente para el despliegue actual (un único
 * contenedor); si se escala horizontalmente habría que moverlo a un store
 * compartido (p. ej. Redis).
 */
export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (bucket.count >= MAX_ATTEMPTS) {
    return false;
  }

  bucket.count += 1;
  return true;
}
