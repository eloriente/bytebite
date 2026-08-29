# Contexto del proyecto (notas vivas)

Este archivo complementa `docs/architecture.md` (arquitectura general, estable) y
`docs/decisions.md` (histórico de sesiones): aquí van las notas de la feature más reciente en
desarrollo, para dar continuidad a quien retome el trabajo (humano o IA).

## Feature actual: ajustes de cuenta ampliados

`/settings` pasó de tener solo el objetivo nutricional a: cuenta (nombre editable, cerrar sesión
en todos los dispositivos), gestión de varias passkeys, notificaciones push con recordatorio
diario, exportar/eliminar cuenta, tip de instalación PWA. Ver
`docs/architecture.md#ajustes-de-cuenta-settings` para el detalle de cada pieza y
`docs/decisions.md` (2026-08-29, "Ajustes de cuenta ampliados...") para el porqué y el segundo
bug real de la sesión.

**Segundo bug real encontrado y arreglado**: el `session` callback de `auth.ts` con una consulta
Prisma (para comprobar `sessionVersion`) rompía **todo el login** porque `middleware.ts` ejecuta
esos callbacks en el Edge Runtime de Next.js, donde Prisma/SQLite no funciona. Fix: los
callbacks de `auth.ts` no tocan Prisma; la comprobación real vive en
`lib/current-user.ts#getCurrentUser` (Node.js), usada desde `app/(app)/layout.tsx`. **Si se
toca `auth.ts` en el futuro: cualquier callback nuevo debe asumir que también corre en Edge —
nada de Prisma ahí.**

**Pendiente / a tener en cuenta:**

- La revocación de sesión (`sessionVersion`) solo se comprueba en la navegación de páginas
  (`app/(app)/layout.tsx`), no en cada ruta de API — alcance aceptado explícitamente, ver
  `SECURITY.md`. Si en el futuro se quiere cerrar ese hueco, hay que decidir si vale la pena
  repetir la consulta en ~15 route handlers o buscar otro mecanismo (p.ej. un middleware propio
  en Node.js si Next.js algún día lo soporta en esta versión).
- El recordatorio diario (`reminderHour`) no gestiona zonas horarias por usuario — compara
  contra la hora local del proceso del servidor. Limitación documentada, no un bug.
- Notificaciones push no verificadas de extremo a extremo con un navegador real (mismo motivo
  que las passkeys: sin navegador en el entorno de desarrollo). Sí se verificó: generación de
  VAPID public key, suscripción/desuscripción, el envío real fallando correctamente contra un
  endpoint falso (sin crashear), y la excepción de CSRF/auth para el cron de
  `send-reminders`.
- Ideas de la revisión funcional de opengym que **no se construyeron esta ronda** (roadmap, ver
  sección al final de este archivo): dashboard "hoy" enriquecido, rachas, gráfico de tendencia
  de macros.

## Feature anterior: passkeys (WebAuthn), sin contraseñas

Migración completa de contraseña+bcrypt a passkeys, inspirada en el modelo de opengym (revisado
como proyecto de referencia) pero permitiendo varias passkeys por cuenta. Ver
`docs/architecture.md#autenticación-passkeys-sin-contraseñas` para el flujo completo y
`docs/decisions.md` (2026-08-29) para el porqué.

Piezas nuevas: `app/api/auth/webauthn/{register,login}-{options,verify}/route.ts`,
`lib/webauthn-config.ts` (rpID/origen desde `NEXTAUTH_URL`), `lib/webauthn-store.ts` (challenges
y tokens de sesión de un solo uso, tabla `PendingAuthAction` — **no un Map en memoria**, ver más
abajo por qué), `prisma.Authenticator`. `auth.ts` cambió de rol: su `Credentials` provider ya no
valida contraseñas, solo canjea el token que emite `*-verify`.

**Bug real ya encontrado y arreglado (2026-08-29)**: la primera versión de
`lib/webauthn-store.ts` usaba `Map`s en memoria a nivel de módulo, y el primer intento real de
crear una cuenta falló con `CredentialsSignin` de forma intermitente. Causa: distintos Route
Handlers de Next.js no comparten de forma fiable el estado de un módulo (cada ruta puede
recompilarse/reinstanciarse por separado, sobre todo en `next dev`). Se movió el estado a una
tabla Prisma (`PendingAuthAction`) — ver `docs/decisions.md` (2026-08-29, "Bug real de
passkeys...") para el diagnóstico completo. De paso se corrigió un `await` que faltaba en
`auth.ts` sobre `takePostAuthToken`. **Si se toca `lib/webauthn-store.ts` en el futuro: no
volver a un Map en memoria** sin resolver antes por qué `lib/prisma.ts` necesita el patrón
`globalThis.prisma` — es el mismo problema de fondo.

**Pendiente / a tener en cuenta si se sigue trabajando en esto:**

- El ceremonial WebAuthn en sí (crear/verificar una passkey real en un navegador) **no se probó
  de extremo a extremo con un autenticador real** — el entorno de desarrollo no tenía un
  navegador disponible para automatizarlo. Sí se verificó: generación de opciones (rpID/origen
  correctos, `residentKey: required`, `allowCredentials` vacío en login), rate limiting, CSRF,
  caducidad de challenges/tokens, los caminos de error, y — tras el fix del bug de arriba — la
  emisión de sesión completa insertando un token válido directamente en la tabla y
  completando el intercambio con el `Credentials` provider real de NextAuth. Lo único que
  falta por probar es la propia firma criptográfica de un autenticador real (Touch ID/Windows
  Hello/llave de seguridad) en un navegador. **Recomendado**: probar manualmente el flujo
  completo de registro + login en un navegador real antes de desplegar a producción.
- Sin recuperación de cuenta: perder el único dispositivo con la passkey deja la cuenta
  inaccesible salvo edición manual de la base de datos. Es una decisión deliberada, no un
  descuido — si se quiere cambiar, implica añadir un segundo factor de recuperación (email,
  código de respaldo...), que no existe hoy.
- `rpID`/origen dependen de `NEXTAUTH_URL`: cualquier cambio de hostname en producción invalida
  todas las passkeys ya registradas.
- ~~No hay forma de añadir una segunda passkey a una cuenta existente todavía~~ — resuelto en la
  ronda de "Ajustes de cuenta ampliados" de arriba (`app/api/users/me/passkeys/*`).

## Feature más antigua: asistente de chat con Gemini

Conversación única por usuario (`Conversation` 1–1 con `User`, `Message[]` ordenados por
`createdAt`) con dos modos:

- **`ask`** (consulta): responde preguntas usando `summarizeActiveDietForPrompt` (solo las
  comidas de **hoy** + macros) como contexto. No propone cambios.
- **`edit`** (edición): usa `buildDietEditContext` (semana completa, con ids de
  `mealOption`/`item`) y puede proponer una lista de operaciones
  (`add_item`/`update_item`/`delete_item`, máx. 20 por respuesta, ver
  `lib/validation/diet.ts#dietEditOperationSchema`). El usuario debe **aplicar o descartar**
  explícitamente cada propuesta (`PATCH /api/chat/messages/[id]`, `editStatus:
pending|applied|discarded`) — nunca se escribe en la dieta sin confirmación.

Piezas clave:

- `app/api/chat/messages/route.ts` — `GET` (carga/crea la conversación), `POST` (envía mensaje,
  opcionalmente con imagen JPEG/PNG/WebP ≤8MB guardada en `prisma/data/uploads/chat/`). Rate
  limit: 15 mensajes/minuto por usuario (`checkRateLimit`).
- `app/api/chat/messages/[id]/route.ts` — aplica o descarta las operaciones propuestas.
  Revalida cada `mealOptionId`/`itemId` contra la dieta activa **en el momento de aplicar** (no
  solo al proponer), por si cambió entre medias.
- `lib/gemini.ts` — `askNutritionAssistant` / `proposeDietEdit` (no leídos en detalle aquí; ver
  el archivo si se toca el prompt o el parseo de la respuesta estructurada).
- `components/chat/chat-view.tsx` — UI del chat.

## Cosas a tener en cuenta si se sigue trabajando en esto

- Las operaciones de edición se validan **dos veces**: al generarlas (filtrando ids inválidos
  antes de guardarlas como `pending`) y al aplicarlas (por si la dieta cambió mientras la
  propuesta estaba pendiente). No quitar ninguna de las dos comprobaciones.
- El alcance v1 del modo edit es **solo items** — nunca comidas/opciones/días completos (ver
  comentario en `lib/validation/diet.ts`). Si se amplía, hay que revisar ambos endpoints y el
  prompt de `lib/gemini.ts`.
- README/CLAUDE.md no mencionaban esta feature hasta esta ronda de mejoras (2026-08-29) pese a
  estar en producción — mantenerlos sincronizados cuando cambie el alcance del chat.
- Sin tests todavía para `app/api/chat/**` (requieren mockear Prisma/Gemini); sí los hay para la
  parte pura que consumen (`lib/diet.test.ts`, `lib/validation/diet.test.ts`,
  `lib/validation/chat.test.ts`).

## Rondas de mejora de infraestructura (2026-08-29)

En varias sesiones seguidas, inspiradas en el proyecto de referencia `opengym`:

1. Tests (Vitest), CI (GitHub Actions), ESLint/Prettier explícitos, Dependabot, LICENSE
   (AGPL-3.0-or-later), SECURITY.md, CONTRIBUTING.md, HEALTHCHECK/labels OCI en el Dockerfile y
   `.env.example` documentado por variable.
2. Rate limiting en el login, cabeceras de seguridad (`next.config.mjs`) y protección CSRF
   (`lib/csrf.ts` + `middleware.ts`) para rutas de API que no son de NextAuth.
3. Migración completa a passkeys (ver "Feature anterior" arriba), que sustituye el login/registro
   con contraseña de la ronda 2 apenas un momento después de introducirlo — el rate limiting
   "del login" de la ronda 2 pasó a aplicarse a `/api/auth/webauthn/*` en su lugar.
4. Ajustes de cuenta ampliados (ver "Feature actual" arriba): cuenta, varias passkeys,
   notificaciones push, exportar/eliminar cuenta, tip PWA — y el bug de Edge Runtime + Prisma
   encontrado y arreglado en el camino.

Ver `CHANGELOG.md` para el detalle completo.

## Roadmap (revisión funcional de opengym, no construido esta ronda)

Ideas de UX/features de opengym que se decidió **no** construir todavía, para que quien retome
el trabajo no las redescubra desde cero:

- **Dashboard "hoy" enriquecido**: opengym usa su Home como panel de "qué hacer hoy" (racha,
  progreso, resumen). El dashboard de bytebite ya muestra la dieta activa/checklist, pero podría
  sumar un resumen de calorías/macros restantes hoy y una racha de días completados.
- **Gráfico de tendencia de macros**: opengym tiene un gráfico de peso corporal con línea de
  objetivo y un calendario-heatmap de constancia. El equivalente en bytebite (macros por
  semana) **requeriría un modelo de historial diario que hoy no existe** — `Item.checked` es un
  booleano sin fecha, no hay tabla de "qué se marcó cada día". Es un cambio de modelo de datos,
  no solo de UI.
- **Selector de idioma/unidades**: no aplica — bytebite es solo-español por diseño (ver
  `CLAUDE.md`) y no tiene ambigüedad de unidades (macros ya en g/kcal).
- **Color de acento personalizable**: nice-to-have de bajo impacto, no priorizado.

No hay tareas a medias de esta lista — son ideas descartadas conscientemente para esta ronda,
no trabajo interrumpido.
