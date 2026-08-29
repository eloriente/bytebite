# Política de seguridad

ByteBite es una app autoalojada (self-hosted): tú corres el contenedor, tú guardas los datos.
Este documento dice qué versiones reciben parches, cómo reportar algo en privado, y qué protege
la app y qué no.

## Versiones soportadas

Solo la **rama `main`/última versión desplegada**. No hay ramas de mantenimiento ni soporte a
largo plazo; un fix llega en el siguiente commit/release a `main`.

## Reportar una vulnerabilidad

El repositorio vive en GitHub. Abre un
[Security Advisory privado](https://github.com/eloriente/bytebite/security/advisories/new) en vez
de un issue público — así solo lo ven los mantenedores hasta que haya un fix. Si prefieres no usar
GitHub, escribe a `eladio.loriente@mimacom.com` indicando versión/commit, pasos para reproducir y
el impacto.

No publiques un exploit funcional en un issue público si puede usarse contra otras instancias.
Un bug que solo se puede reproducir en tu propia instancia (o un aviso de un scanner sin exploit)
sí puede ir como issue normal.

**Sobre tiempos de respuesta:** proyecto personal sin SLA ni bug bounty. Sin urgencia declarada,
espera días en vez de horas.

## Alcance

### Dentro de alcance

- **Rutas API (`app/api/**`)** — saltarse la comprobación de propiedad de un recurso (leer/editar
  la dieta de otro usuario), forjar o reutilizar una sesión de NextAuth, evitar el rate limit de
  `/api/auth/register` o del login para automatizar registros/fuerza bruta, ejecutar una mutación
  cross-site saltándose la comprobación de `lib/csrf.ts`, inyección (SQL vía Prisma, XSS
  almacenado) en cualquier campo de la dieta o el chat.
- **Autenticación (passkeys)** — bypass del ceremonial WebAuthn (falsificar una firma, reutilizar
  un challenge, saltarse la comprobación de `rpID`/origen), escalado de `role` sin pasar por una
  ruta autorizada, robar/reutilizar un token de `/api/auth/webauthn/*-verify` (de un solo uso, vida
  ≤60s — ver `lib/webauthn-store.ts`).
- **Configuración de despliegue** — `Dockerfile`, `docker-compose.yml`: un valor por defecto que
  expone algo que un self-hoster no esperaría (puertos, permisos del volumen, secretos).
- **Ajustes de cuenta** — eliminar/leer la cuenta o los datos de otro usuario vía
  `/api/users/me/*`, saltarse el bloqueo de "no puedes quedarte sin ninguna passkey", usar el
  secreto de `/api/push/send-reminders` para leer/enviar algo que no sea el recordatorio
  genérico, enviar una notificación push a un usuario que no seas tú.

### Fuera de alcance

- **Rate limiting limitado.** `lib/rate-limit.ts` es en memoria y por proceso, aplicado a
  `/api/auth/webauthn/*`; no persiste entre reinicios ni escala a varias instancias. Es una
  limitación conocida y documentada (ver `CLAUDE.md`), no una vulnerabilidad — si despliegas
  ByteBite expuesto a internet sin un proxy con rate limiting propio, hazlo bajo tu
  responsabilidad.
- **Sin recuperación de cuenta.** Perder el único dispositivo con la passkey deja la cuenta
  inaccesible — mismo modelo que opengym, elegido deliberadamente (sin contraseñas, sin email de
  reset). No es un bug a reportar.
- **Passkey-only sobre HTTP/IP LAN no funciona.** WebAuthn exige HTTPS salvo en
  `http://localhost`; una instancia servida por IP sin TLS delante nunca podrá crear ni verificar
  passkeys. No es un fallo de la app.
- **`next@14.2.15` con CVEs conocidos** (DoS/SSRF en Server Actions y el optimizador de imágenes,
  ver `docs/decisions.md`). El fix requiere un salto de versión mayor (14 → 16) que aún no se ha
  hecho por el esfuerzo de migración; seguido en Dependabot/Renovate, no es una vulnerabilidad sin
  reportar.
- **Un usuario autenticado leyendo/modificando sus propios datos**, incluso de forma "abusiva"
  (ej. crear cientos de dietas). Comportamiento esperado de la app, no un fallo de seguridad.
- **Ataques que requieren acceso al host o al volumen `prisma/data`.** El operador del contenedor
  es confiable por diseño: si alguien tiene acceso al filesystem del host, ya tiene la base de
  datos SQLite completa y `AUTH_SECRET`.
- **Falta de cabeceras de seguridad avanzadas (CSP, HSTS).** TLS y proxy inverso son
  responsabilidad de quien despliega, tal y como se documenta para Docker en el README.
- **Hallazgos de `npm audit` en devDependencies** que nunca llegan al bundle de producción (p.ej.
  herramientas de test o lint).
- **"Cerrar sesión en todos los dispositivos" no es instantáneo para la API.** La revocación
  (`User.sessionVersion`) solo se comprueba contra la base de datos en el layout de páginas
  protegidas (`app/(app)/layout.tsx` → `lib/current-user.ts`), no en cada ruta de API — un JWT
  robado antes de la revocación sigue funcionando contra `app/api/**` hasta que expire por su
  cuenta (duración por defecto de la sesión de NextAuth), aunque ya no cargue ninguna página.
  **Motivo técnico, no un descuido**: `middleware.ts` corre en el Edge Runtime de Next.js, donde
  Prisma (motor SQLite) no funciona — de hecho, intentarlo ahí rompía el login de toda la app
  (ver `docs/decisions.md`, 2026-08-29). Comprobarlo en cada ruta de API exigiría repetir la
  consulta en ~15 handlers; se prefirió mantenerlo centralizado y aceptar esta ventana.
- **El recordatorio diario no gestiona zonas horarias por usuario.** `send-reminders` compara
  `User.reminderHour` contra la hora local del proceso del servidor. Igual que la limitación de
  unidades que documenta opengym: una simplificación deliberada, no un bug.

## Modelo de seguridad (resumen)

- **Sin contraseñas.** El único método de autenticación son las passkeys (WebAuthn), verificadas
  con `@simplewebauthn/server` (`app/api/auth/webauthn/*`). `expectedOrigin`/`expectedRPID` se
  derivan de `NEXTAUTH_URL` (`lib/webauthn-config.ts`) y se comprueban en cada registro/login;
  `requireUserVerification: false` (como opengym) — una passkey liberada sin biometría/PIN sigue
  siendo válida. Una cuenta puede tener varias passkeys (`Authenticator[]` en Prisma), pero
  **no hay recuperación** si se pierden todas.
- **Sesión**: tras verificar la firma WebAuthn, el endpoint de verify emite un token de un solo
  uso (`lib/webauthn-store.ts`, TTL 60s) que el `Credentials` provider de NextAuth v5 canjea por
  una sesión JWT — es el único rol de ese provider, no valida contraseñas. `auth.ts` falla al
  arrancar en producción si falta `AUTH_SECRET`.
- **Autorización por recurso**: toda ruta que toca un recurso anidado (comida, opción, item)
  resuelve la cadena hasta `diet.userId` y compara con `session.user.id`; si no coincide devuelve
  **404** (nunca 403) para no confirmar la existencia del recurso a otro usuario — ver
  `CLAUDE.md`.
- **PDFs subidos**: se guardan en el volumen `prisma/data`, no se ejecutan ni se sirven
  directamente; solo se leen para extraer texto vía Gemini.
- **Gemini (`GEMINI_API_KEY`)**: la clave vive solo en el servidor (`lib/gemini.ts`), nunca se
  expone al cliente.
- **`POST /api/push/send-reminders`** no usa sesión ni cookie: la llama un cron externo (ver
  `.env.example` → `CRON_SECRET`). Está explícitamente exenta en `middleware.ts` de la
  comprobación de origen (`lib/csrf.ts`) y del guard de sesión — su única protección es el
  secreto compartido en la cabecera `x-cron-secret`. Sin `CRON_SECRET` configurado, la ruta
  rechaza toda petición.
- **Exportar/eliminar cuenta** (`/api/users/me/export`, `DELETE /api/users/me`) están
  limitadas por `checkRateLimit` (por `userId`) y exigen sesión válida; el borrado usa las
  cascadas ya definidas en `prisma/schema.prisma` (dietas, conversación, passkeys, suscripciones
  push).
