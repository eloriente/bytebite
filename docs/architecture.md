# Arquitectura

## Modelo de datos (Prisma)

```
User (email único, role sin uso real todavía; sin password — ver Autenticación;
      sessionVersion, reminderEnabled, reminderHour — ver Ajustes de cuenta)
 ├─ Authenticator[] (credentialId, publicKey, counter, transports) — Cascade desde User
 ├─ PushSubscription[] (endpoint único, p256dh, auth)               — Cascade desde User
 └─ Diet (title, isActive, pdfPath?)         — onDelete: Cascade desde User
     └─ DietDay (dayOfWeek)                  — Cascade desde Diet
         └─ Meal (name, order)               — Cascade desde DietDay
             └─ MealOption (name, description?)  — Cascade desde Meal
                 └─ Item (ingredient, amount, checked, calories?/protein?/carbs?/fat?)
                                              — Cascade desde MealOption
```

Todos los campos de macros en `Item` son opcionales (`Int?`/`Float?`): la
entrada manual puede dejarlos vacíos sin problema, y el esquema no necesitó
migración para soportarlo.

Solo puede haber una `Diet` con `isActive: true` por usuario, pero esto se
garantiza a nivel de aplicación (transacción que desactiva las demás antes de
activar una), no con una constraint de base de datos.

## Autenticación (passkeys, sin contraseñas)

Sin contraseñas: el único método de login/registro es WebAuthn (passkeys), como opengym. El
flujo tiene dos partes que no se solapan:

1. **Ceremonial WebAuthn** (`app/api/auth/webauthn/*`, usa `@simplewebauthn/server`):
   - `register-options` (input: name+email) genera un `userID` opaco de un solo uso y las
     opciones de `navigator.credentials.create()` (`residentKey: "required"` para permitir
     login sin usuario después), y guarda el challenge + name/email pendientes en
     `lib/webauthn-store.ts` (tabla `PendingAuthAction`, TTL 5 min, un solo uso) bajo un `cid`
     opaco. **No es un Map en memoria a propósito**: los distintos Route Handlers de Next.js
     no comparten de forma fiable el estado de un módulo (cada ruta puede
     recompilarse/reinstanciarse por separado, sobre todo en dev) — un Map entre
     `register-options`/`login-options` y `*-verify`/`auth.ts` perdía datos de forma
     intermitente en la práctica.
   - `register-verify` (input: cid + respuesta del navegador) verifica la firma contra ese
     challenge, y solo si es válida crea el `User` + su primer `Authenticator` en una
     transacción Prisma.
   - `login-options`/`login-verify` son el equivalente para iniciar sesión: sin
     `allowCredentials` (login "sin usuario" — el navegador elige la passkey guardada para
     este `rpID`), busca el `Authenticator` por `credentialId` y actualiza su `counter`
     (detección de clonado, la hace la propia librería).
   - `rpID`/origen esperados se derivan de `NEXTAUTH_URL` (`lib/webauthn-config.ts`), no hay
     variables nuevas. Cambiar el hostname en producción invalida las passkeys existentes.
2. **Emisión de sesión** (`auth.ts`): tras un `*-verify` exitoso, se emite un token de un solo
   uso (`putPostAuthToken`, TTL 60s) y el cliente llama a `signIn("credentials", { token })`.
   El `Credentials` provider de NextAuth **no valida contraseñas** — solo canjea ese token por
   el `User` correspondiente y deja que NextAuth emita la sesión JWT de siempre. Así toda la
   emisión de sesión (cookies, JWT) sigue pasando por un único sitio, sin reimplementarla.

`middleware.ts` protege todo excepto `/login`, `/api/auth/{signin,signout,callback,session,csrf,
providers,error}` (las rutas propias de NextAuth) y assets estáticos — cualquier ruta nueva bajo
el grupo `(app)` queda protegida automáticamente. Las rutas `/api/auth/webauthn/*` **sí** pasan
por la comprobación CSRF de `middleware.ts` (no son de NextAuth).

Sin recuperación de cuenta: perder el único dispositivo con la passkey dejaría la cuenta
inaccesible (aunque una cuenta puede tener varias `Authenticator`, a diferencia de opengym).

El "cerrar sesión" vive en el header (`components/nav/sign-out-button.tsx`, usa `signOut` de
`next-auth/react`); la navegación principal es la tab bar inferior
(`components/nav/tab-bar.tsx`), no un menú lateral — ver "UI mobile-first" más abajo.

## Ajustes de cuenta (`/settings`)

- **Cerrar sesión en todos los dispositivos**: `User.sessionVersion` se incrementa en
  `POST /api/users/me/sign-out-everywhere`. El JWT lleva el valor con el que se emitió
  (`auth.ts`, callback `jwt`); en cada carga de página, `lib/current-user.ts#getCurrentUser`
  releé el valor actual en Prisma y, si no coincide, trata la sesión como revocada (sin
  `user`). **Importante**: esta comprobación vive fuera de `auth.ts`'s `session` callback a
  propósito — ese callback corre también dentro de `middleware.ts`, que Next.js ejecuta en el
  Edge Runtime, donde Prisma (SQLite) no funciona; ponerlo ahí rompía el login de toda la app
  (ver `docs/decisions.md`, 2026-08-29). Por eso el `session` callback solo mueve datos ya
  presentes en el JWT, y la comprobación real vive en `app/(app)/layout.tsx` vía
  `getCurrentUser` — cubre toda la navegación de páginas, pero no cada ruta de API por
  separado (ver alcance documentado en `SECURITY.md`).
- **Passkeys adicionales**: `app/api/users/me/passkeys/register-{options,verify}/route.ts` son
  la variante _autenticada_ del ceremonial anónimo de `app/api/auth/webauthn/register-*`: usan
  `session.user.id` en vez de un body con name/email, añaden `excludeCredentials` con las
  passkeys ya registradas (evita duplicar la misma llave), y crean un `Authenticator` sobre el
  usuario ya existente en vez de un `User` nuevo. `DELETE /api/users/me/passkeys/[id]` bloquea
  quedarte sin ninguna.
- **Exportar/eliminar cuenta**: `GET /api/users/me/export` sirve el perfil + árbol de dietas
  como descarga JSON; `DELETE /api/users/me` borra el usuario (las cascadas de
  `prisma/schema.prisma` se encargan del resto).
- **Notificaciones push**: `public/sw.js` (mínimo, solo `push`/`notificationclick`) +
  `components/push-registration.tsx` (registro en el layout de `(app)`). `lib/push.ts` envuelve
  `web-push`/VAPID. `POST /api/push/send-reminders` no tiene sesión — la llama un cron externo
  (bytebite no tiene proceso de fondo propio), protegida por `CRON_SECRET` y explícitamente
  exenta del guard de sesión/CSRF en `middleware.ts` (ver comentario ahí). Compara
  `User.reminderHour` contra la hora local del proceso, sin gestión de zona horaria por
  usuario.

## Flujo de creación de una dieta

Dos caminos que convergen en el mismo endpoint de creación:

1. **Automático (IA)**: el usuario sube un PDF en `/upload` →
   `POST /api/diets/parse` llama a `extractDietFromPdf` (`lib/gemini.ts`,
   modelo Gemini con structured output) y devuelve el JSON parseado **sin
   persistir nada** → si tiene éxito, se envía directo a
   `POST /api/diets` (crea la dieta) y el usuario aterriza en el dashboard.
   Si Gemini falla (timeout, saturación...), se ofrece reintentar o pasar a
   manual.
2. **Manual**: el usuario rellena `components/diet/diet-form.tsx` (días →
   comidas → opciones → ingredientes, con macros opcionales) y al enviar
   también llama a `POST /api/diets`.

`POST /api/diets` valida el body completo con `createDietSchema`
(`lib/validation/diet.ts`, espeja la forma `ParsedDiet` de `lib/gemini.ts`) y
usa `lib/diet.ts#createDietForUser` (transacción: desactiva la dieta activa
anterior + crea la nueva con todo el árbol anidado).

Tras la creación, el usuario puede seguir editando el árbol pieza a pieza desde
el dashboard (modo edición por comida, con diálogos reutilizables) o borrar
días/comidas/opciones/items sueltos — son rutas API independientes bajo
`app/api/diet-days/`, `app/api/meals/`, `app/api/meal-options/`,
`app/api/items/`, todas siguiendo el mismo patrón de comprobación de
propiedad descrito en `CLAUDE.md`.

## Multi-dieta

Un usuario puede tener varias `Diet`. El dashboard (`app/(app)/dashboard/page.tsx`)
resuelve qué dieta mostrar así: `?diet=<id>` en la URL si es válido y del
usuario → si no, la que tenga `isActive: true` → si no, la primera. El
`DietSwitcher` (desplegable rápido) solo cambia la vista (parámetro de URL,
sin mutar nada); un botón aparte ("Usar esta dieta") marca esa dieta como
activa vía `PATCH /api/diets/[id]/activate`. La página `/diets` (accesible
desde la tab bar) es la gestión completa: renombrar, eliminar, ver.

## UI mobile-first

- **Navegación**: tab bar fija inferior (`components/nav/tab-bar.tsx`, 4 destinos: Hoy/Dietas/
  Chat/Ajustes) en vez de menú hamburguesa — más alcanzable con el pulgar en uso a una mano.
  Inspirada en opengym; comparación completa en `docs/decisions.md` (2026-08-29).
- **Safe-areas**: `--sat`/`--sab` (env safe-area-inset-\*) y `--header-h`/`--tabbar-h` como
  variables CSS globales en `app/globals.css`, en vez de `calc()` repetido por archivo. Toda
  página con contenido bajo la tab bar usa `pb-[calc(var(--tabbar-h)+1.5rem+var(--sab))]`.
- **`components/ui/dialog.tsx`** es un bottom sheet (anclado abajo, esquinas superiores
  redondeadas), no un modal centrado — coherente con ser una app solo-móvil. Sin
  drag-to-dismiss (a diferencia de opengym).
