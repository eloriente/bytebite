# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Unreleased]

### Añadido

- **Sistema de diseño estilo iOS/Apple**, portado desde los tokens de opengym: paleta de
  colores de sistema de Apple (verde/rojo exactos, canvas gris claro/negro con superficies
  blancas/`#1c1c1e` diferenciadas), tipografía SF Pro, escala tipográfica única
  (`.t-large/.t-title/...`), `components/ui/grouped-list.tsx` (listas con hairlines en vez de
  tarjetas individuales, aplicado a "Cuenta" en ajustes), botones con variante `tinted` y
  feedback de pulsación, inputs sin borde con foco como anillo interior.
- **Color de acento personalizable** (Ajustes → Apariencia): 8 colores de sistema de Apple,
  igual que opengym, más un control de tema Claro/Oscuro/Sistema completo (antes solo había un
  toggle claro/oscuro en la cabecera, que se mantiene como acceso rápido). Preferencia por
  dispositivo (localStorage), sin parpadeo al cargar.

- **Revisión mobile-first inspirada en opengym**: barra de navegación inferior fija
  (`components/nav/tab-bar.tsx`) en vez de menú hamburguesa lateral; diálogos convertidos en
  bottom sheets (`components/ui/dialog.tsx`) en vez de modales centrados; variables CSS
  globales `--sat`/`--sab`/`--header-h`/`--tabbar-h` para consistencia de safe-areas; objetivos
  táctiles pequeños (28-32px) subidos a ≥36-40px; `inputMode="decimal"` en campos numéricos;
  zoom (pinch-to-zoom) reactivado (estaba deshabilitado sin motivo); iconos PWA sin cambios
  (192/512 siguen siendo el mismo archivo — pendiente de assets reales).

- Suite de tests (Vitest) para la lógica pura de `lib/` (macros, contexto del chat, rate limit,
  esquemas de validación zod).
- Pipeline de CI (GitHub Actions): formato, lint, typecheck, tests y build en cada push/PR.
- Configuración explícita de ESLint (`next/core-web-vitals` + `eslint-config-prettier`) y
  Prettier (`format`/`format:check`).
- `LICENSE` (AGPL-3.0-or-later), `SECURITY.md`, `CONTRIBUTING.md`, `PROJECT_CONTEXT.md`.
- Dependabot (`npm`, `docker`, `github-actions`), agrupando minor/patch mensualmente.
- `HEALTHCHECK` y labels OCI en el `Dockerfile`.
- Cabeceras de seguridad (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Content-Security-Policy: frame-ancestors 'none'`) vía `next.config.mjs`.
- Protección CSRF (`lib/csrf.ts`) en `middleware.ts` para toda ruta de API que muta estado y no
  es de NextAuth: exige `Sec-Fetch-Site: same-origin`/`none`, o `Origin` coincidente si el
  navegador no envía esa cabecera.
- **Login/registro con passkeys (WebAuthn)**, vía `@simplewebauthn/server`/`browser`
  (`app/api/auth/webauthn/*`), con rate limiting por IP en cada endpoint.
- **Ajustes de cuenta ampliados** (`/settings`, antes solo tenía el objetivo nutricional):
  - Editar nombre; email de solo lectura.
  - **Cerrar sesión en todos los dispositivos** (`User.sessionVersion`).
  - **Gestión de varias passkeys**: añadir una passkey adicional a una cuenta ya autenticada
    (`app/api/users/me/passkeys/*`), eliminarlas (bloqueado si es la última).
  - **Exportar mis datos** (perfil + árbol de dietas en JSON) y **eliminar cuenta**
    (confirmación escribiendo "ELIMINAR", cascada completa).
  - **Notificaciones push**: activar/desactivar, recordatorio diario a una hora, notificación
    de prueba. Nuevo service worker (`public/sw.js`), modelo `PushSubscription`, y
    `POST /api/push/send-reminders` pensado para un cron externo (bytebite no tiene proceso
    de fondo propio) — ver `.env.example` (`VAPID_*`, `CRON_SECRET`).
  - Tip de instalación como PWA (copy según iOS/Android).

### Eliminado (cambio incompatible)

- **Autenticación por contraseña.** Se sustituye por completo por passkeys — ver "Añadido" y
  `docs/decisions.md` (2026-08-29). `User.password`, `/api/auth/register`, `bcryptjs` y el seed
  de usuarios de prueba desaparecen. Sin recuperación de cuenta si se pierde el dispositivo, sin
  usuarios sembrados: cada cuenta se crea desde `/login`.

### Arreglado

- **Login/registro con passkey fallaba de forma intermitente** (`CredentialsSignin`). El
  challenge/token del ceremonial WebAuthn vivía en un `Map` en memoria (`lib/webauthn-store.ts`)
  compartido entre `/options`, `/verify` y `auth.ts` — pero distintos Route Handlers de Next.js
  no comparten de forma fiable el estado de un módulo (cada ruta puede
  recompilarse/reinstanciarse por separado, sobre todo en desarrollo), así que el dato a veces
  ya no estaba cuando se necesitaba. Se movió a una tabla (`PendingAuthAction`, Prisma), que sí
  es compartida de verdad entre rutas.
- **El `session` callback de NextAuth con una consulta Prisma rompía todo el login.** Al añadir
  la comprobación de `sessionVersion` para "cerrar sesión en todos los dispositivos" se llamó a
  Prisma desde ese callback — pero `middleware.ts` ejecuta ese mismo callback en el Edge Runtime
  de Next.js, donde Prisma/SQLite no funciona (`PrismaClient is not configured to run in Edge
Runtime`), así que cualquier página protegida redirigía a `/login` aunque la sesión fuera
  válida. Solución: los callbacks de `auth.ts` ya no tocan Prisma; la comprobación de
  revocación se hizo en `lib/current-user.ts` (Node.js), usado desde el layout de `(app)`.
- **`docker compose up --build` fallaba siempre en `npm run build`** (`AUTH_SECRET no está
definido`). `next build` fuerza `NODE_ENV=production` para el propio build, y el guard de
  `auth.ts` (pensado para runtime) no distinguía eso de servir tráfico de verdad; el build de
  Docker no tiene `.env`, así que el guard saltaba siempre. Bug previo a esta sesión, solo
  detectado ahora al probar un build de Docker limpio.
- **`UntrustedHost` de NextAuth en el primer despliegue real** detrás de un proxy inverso
  propio. `trustHost: true` en `auth.ts` — NextAuth v5 no confía en el `Host` entrante por
  defecto salvo que se le indique explícitamente; la protección CSRF propia
  (`lib/csrf.ts`) sigue intacta.

## [0.1.0] — 2026-08-20

Primera versión funcional.

### Añadido

- PWA mobile-first: subida de dieta en PDF (extracción con Gemini, structured outputs) o entrada
  manual.
- Modelo de datos Prisma/SQLite: `User → Diet → DietDay → Meal → MealOption → Item`.
- Autenticación propia (NextAuth v5, Credentials) con login/registro y rate limit básico en
  registro.
- CRUD completo del árbol de la dieta (días/comidas/opciones/ingredientes) desde el dashboard.
- Gestión de múltiples dietas por usuario (`/diets`), con selector de dieta activa.
- Checklist diario de ingredientes con macros (calorías/proteína/carbohidratos/grasa).
- Asistente de chat (Gemini) en modo consulta y modo edición de la dieta activa.
- Subida de fotos desde la galería del móvil como fuente alternativa al PDF.
- Temas claro/oscuro y menú lateral de navegación.
- Despliegue con Docker (`Dockerfile` multi-stage + `docker-compose.yml`), migraciones
  automáticas al arrancar el contenedor.
