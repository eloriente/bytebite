# ByteBite

PWA mobile-first para gestionar dietas: subida de un PDF (analizado por IA) o
entrada manual, organización por días/comidas/opciones/ingredientes, checklist
diario, gestión de múltiples dietas por usuario y un asistente de chat (Gemini)
para consultar o editar la dieta activa. Licencia AGPL-3.0-or-later.

## Stack

- **Next.js 14** (App Router), TypeScript, React 18.
- **Prisma** + SQLite (`prisma/data/bytebite.db`).
- **NextAuth v5 (beta)** — sesión JWT emitida por un Credentials provider que
  actúa como transporte (recibe un token de un solo uso, no una contraseña).
  **Autenticación real: passkeys (WebAuthn)** vía `@simplewebauthn/server` +
  `@simplewebauthn/browser`, sin contraseñas ni recuperación. Login + registro
  propio en `/login` (pestañas).
- **Tailwind CSS** + componentes propios estilo shadcn (CVA + Radix UI:
  accordion, checkbox, dialog, label, progress, tabs) en `components/ui/`.
- **Zod** para validar formularios y bodies de las rutas API.
- **`@google/genai`** (Gemini) para extraer la dieta de un PDF (`lib/gemini.ts`).
- Docker (`Dockerfile` + `docker-compose.yml`) para despliegue.

## Estructura

```
app/
  (app)/            # Rutas protegidas con layout compartido (header + tab bar inferior)
    layout.tsx       # Auth guard + header (tema/logout) + TabBar
    dashboard/       # Visor de la dieta activa/seleccionada
    upload/          # Elegir Automático (IA) / Manual → crear dieta
    diets/           # Gestionar dietas (renombrar/eliminar/ver)
    settings/        # Ajustes: cuenta, objetivo, notificaciones, passkeys, datos
    chat/            # Asistente de chat (modo consulta / edición de la dieta activa)
  login/             # Fuera del grupo (app) — sin header compartido
  api/
    auth/            # NextAuth (sesión) + webauthn/ (registro y login con passkey, anónimo)
    diets/           # create, parse (Gemini), activate, rename/delete ([id])
    diet-days/ meals/ meal-options/ items/   # CRUD granular del árbol de la dieta
    chat/            # mensajes del asistente, aplicar/descartar ediciones propuestas
    users/me/        # perfil, passkeys/ (variante autenticada), export, sign-out-everywhere
    push/            # public-key, subscribe, unsubscribe, test, send-reminders (cron)
components/
  diet/              # Componentes de dominio (viewer, meal-card, forms, diálogos)
  chat/              # Vista del chat
  nav/               # tab-bar (navegación principal), sign-out-button
  settings/          # account-section, passkey-manager, notifications-section, data-section
  ui/                # Primitivos reutilizables (button, card, dialog — bottom sheet en móvil, ...)
lib/
  validation/        # Esquemas zod (auth.ts, diet.ts, chat.ts, user.ts, push.ts)
  webauthn-config.ts # rpID/origen (derivados de NEXTAUTH_URL)
  webauthn-store.ts  # challenges y tokens de sesión de un solo uso (tabla PendingAuthAction)
  current-user.ts    # auth() + comprobación de sessionVersion en un único sitio (solo Node.js)
  push.ts            # envío de notificaciones vía web-push/VAPID
  prisma.ts, gemini.ts, diet.ts (helper de creación + contexto de chat), rate-limit.ts, nutrition.ts
prisma/schema.prisma # User → Diet/Conversation/Authenticator[]/PushSubscription[]; Diet → DietDay → Meal → MealOption → Item (cascade)
docs/                # Notas ampliadas (arquitectura, decisiones)
```

## Convenciones clave

- **Comprobación de propiedad en rutas API**: toda ruta que toca un recurso de
  otro nivel (meal, option, item...) hace `auth()` → busca el recurso con
  `include`/`select` hasta llegar a `diet.userId` → compara con
  `session.user.id` → **404** (nunca 403) si no coincide o no existe. Ver
  `app/api/items/[id]/toggle/route.ts` o `app/api/diets/[id]/activate/route.ts`
  como referencia.
- **Validación**: esquemas centralizados en `lib/validation/auth.ts` y
  `lib/validation/diet.ts`, usados tanto en cliente (antes de enviar) como en
  servidor (`safeParse` en la ruta).
- **Reutilizar diálogos genéricos**: `components/diet/entity-form-dialog.tsx`
  (crear/editar con campos declarativos) y
  `components/diet/confirm-delete-button.tsx` (confirmación de borrado) — no
  crear nuevos modales ad hoc para CRUD sencillo.
- **UI en español, mobile-first**: contenedores `max-w-lg`/`max-w-sm`, textos
  de interfaz en español.
- **Estado del cliente**: cuidado con copiar props a `useState` para listas que
  pueden cambiar por `router.refresh()` (bug ya corregido una vez en
  `MealCard` — ver `docs/decisions.md`). Preferir derivar del prop directamente
  y mantener en estado local solo lo estrictamente optimista (p.ej. el
  `checked` de un item mientras se confirma el PATCH).
- **Passkeys, no contraseñas**: `auth.ts` no valida contraseñas — su
  `Credentials` provider solo canjea un token de un solo uso (emitido por
  `/api/auth/webauthn/{register,login}-verify` tras comprobar la firma WebAuthn)
  por una sesión NextAuth. Toda la lógica de la ceremonia vive en
  `app/api/auth/webauthn/*` + `lib/webauthn-config.ts` + `lib/webauthn-store.ts`.
  `rpID`/origen se derivan de `NEXTAUTH_URL`: cambiarlo en producción invalida
  las passkeys ya registradas. Sin recuperación de cuenta si se pierde el
  dispositivo (igual que opengym).
- **Rate limiting**: limitador en memoria (`lib/rate-limit.ts`), aplicado a
  las rutas de registro/login por passkey (`/api/auth/webauthn/*`, por IP).
  A diferencia del estado del ceremonial WebAuthn (que sí se movió a la base
  de datos por el bug descrito arriba), este limitador se deja en memoria a
  propósito: un fallo abierto ocasional (limitar de menos) es aceptable,
  mientras que perder el challenge/token de sesión rompía el login por
  completo. No persiste entre reinicios ni escala a varias instancias — válido para el
  despliegue actual de un único contenedor.
- **CSRF**: `middleware.ts` + `lib/csrf.ts` rechazan (403) cualquier mutación a
  `/api/**` que no sea de NextAuth y no confirme same-origin vía
  `Sec-Fetch-Site` (o `Origin` como fallback). Necesario porque las Route
  Handlers normales no tienen la protección CSRF automática de las Server
  Actions.
- **Cabeceras de seguridad**: definidas en `next.config.mjs` (`headers()`), no
  en un proxy — bytebite no corre nginx propio.
- **Color de acento personalizable** (`components/accent-provider.tsx`): 8 acentos (colores de
  sistema de Apple, igual que opengym), aplicados vía `data-accent="..."` en `<html>` y
  overrides CSS en `app/globals.css` que reasignan `--primary`/`--accent`/`--ring`. Preferencia
  solo del dispositivo (localStorage, como el tema — no se guarda en la cuenta). Script
  anti-parpadeo en `app/layout.tsx` (mismo problema que resuelve `next-themes` con el tema
  claro/oscuro). El `theme-color` de la barra de estado sigue al acento + tema activos.
- **Sistema de diseño estilo iOS/Apple** (`app/globals.css`): paleta = colores de sistema de
  Apple (verde/rojo iOS exactos, canvas gris `#f2f2f7`/negro + superficies blancas/`#1c1c1e`
  como `--card`, no `--background`), tipografía SF Pro/-apple-system, escala tipográfica única
  (`.t-large/.t-title/.t-title2/.t-head/.t-foot`), `font-variant-numeric: tabular-nums` global.
  `components/ui/grouped-list.tsx` (`GroupedList`/`GroupedListRow`) es el patrón de "lista
  agrupada con hairlines" (opengym) para listas de ajustes — una superficie con `divide-y`, no
  tarjetas individuales con borde. Inspirado en opengym; ver `docs/decisions.md` (2026-08-29)
  para la comparación completa y qué se dejó fuera (drag-to-dismiss, reestilizar
  diet-viewer/meal-card por completo).
- **Navegación mobile-first**: barra fija inferior (`components/nav/tab-bar.tsx`, 4 destinos),
  no un menú hamburguesa — más alcanzable con el pulgar (inspirado en opengym). Variables CSS
  globales en `app/globals.css` (`--sat`/`--sab` para los safe-areas del notch/home indicator,
  `--header-h`/`--tabbar-h` para las alturas de las barras fijas) evitan repetir `calc()` a
  mano: cualquier página con contenido scrollable bajo la tab bar debe usar
  `pb-[calc(var(--tabbar-h)+1.5rem+var(--sab))]` (ver `app/(app)/dashboard/page.tsx` u otras
  páginas de `(app)/` como referencia), y cualquier `100dvh` debe restar
  `var(--header-h)+var(--sat)+var(--tabbar-h)+var(--sab)` si ocupa toda la pantalla (ver
  `app/(app)/chat/page.tsx`).
- **`components/ui/dialog.tsx` es un bottom sheet, no un modal centrado** — anclado abajo con
  esquinas superiores redondeadas, coherente con ser una app mobile-only (sin layout de
  escritorio). No tiene gesto de arrastrar-para-cerrar (a diferencia de opengym, que sí lo
  implementa a mano); solo el tap en la X o el backdrop cierran.
- **`middleware.ts` no puede usar Prisma.** Corre también en el Edge Runtime de Next.js
  (aparte del proceso Node.js normal de las rutas), donde el motor SQLite de Prisma no
  funciona — intentarlo ahí (comprobar `sessionVersion` en el `session` callback de
  `auth.ts`) rompía el login de toda la app con `PrismaClient is not configured to run in
Edge Runtime`. `auth.ts`'s callbacks `jwt`/`session` por eso solo mueven datos ya
  presentes en el JWT; cualquier comprobación que necesite la BD (revocación de sesión,
  datos frescos del usuario) va en `lib/current-user.ts#getCurrentUser`, usado desde
  Server Components/Route Handlers (Node.js), nunca desde `middleware.ts`.
- **Rutas sin sesión de usuario** (ej. `POST /api/push/send-reminders`, llamada por un
  cron externo): añadir su pathname a las excepciones explícitas en `middleware.ts`
  (`CRON_ROUTE`) para saltar tanto el guard de auth como la comprobación CSRF — un cron no
  es un navegador y no manda `Origin`/`Sec-Fetch-Site`. Su seguridad depende entonces de un
  secreto comprobado dentro de la propia ruta, no del middleware.

## Comandos

```bash
npm run dev              # servidor de desarrollo
npm run build             # prisma generate + next build
npm run lint              # ESLint (next/core-web-vitals + prettier)
npm run format:check      # Prettier (npm run format para aplicar)
npm run typecheck         # tsc --noEmit
npm test                  # Vitest (lib/**/*.test.ts)
npm run test:watch        # Vitest en modo watch
npx vitest run lib/diet.test.ts   # un solo archivo de test
npm run prisma:migrate    # nueva migración en desarrollo
npm run prisma:studio     # explorar la base de datos
```

`.github/workflows/ci.yml` corre format:check + lint + typecheck + test + build en cada push/PR;
es la puerta de calidad canónica. Toda lógica pura no trivial (macros, contexto del chat,
validación) debería llevar test en `lib/` — ver `CONTRIBUTING.md`.

Sin usuarios semilla: no se pueden crear passkeys sin un navegador real, así que cada cuenta se
crea a mano desde `/login` (pestaña "Crear cuenta").

Variables de entorno necesarias: ver `.env.example` (`GEMINI_API_KEY`, `AUTH_SECRET`,
`NEXTAUTH_URL` — esta última también define el `rpID`/origen de las passkeys — y, opcionales,
`VAPID_*`/`CRON_SECRET` para notificaciones push).

## Más detalle

- `docs/architecture.md` — modelo de datos, flujo de auth, flujo de creación
  de dietas (manual vs. Gemini).
- `docs/decisions.md` — registro breve de features/decisiones por sesión.
- `PROJECT_CONTEXT.md` — notas vivas sobre la feature más reciente en desarrollo.
- `CONTRIBUTING.md` — convenciones de contribución y comandos de calidad.
- `SECURITY.md` — alcance de seguridad y cómo reportar vulnerabilidades.
