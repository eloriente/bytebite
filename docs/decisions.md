# Decisiones y features (registro breve)

## 2026-08-29 — Sistema de diseño estilo iOS/Apple, portado desde opengym

- Petición explícita: "copiar el UI de opengym" con estética Apple. Como opengym es Vite/CSS
  plano y bytebite es Next/Tailwind, la adaptación se hizo a nivel de **tokens de diseño**, no
  copiando componentes — se extrajeron los valores exactos de `frontend/src/index.css` de
  opengym (colores de sistema de Apple en hex, escala tipográfica, radios, patrón de lista
  agrupada) y se tradujeron a las variables CSS/Tailwind que bytebite ya usaba, así que el
  cambio se propaga solo a casi toda la app (los componentes ya usaban clases semánticas como
  `bg-primary`/`text-muted-foreground`/`rounded-md` en vez de colores sueltos).
- **Cambio de fondo más visible**: `--background` pasa de blanco a gris (`#f2f2f7`/negro, canvas
  de iOS) y `--card` (antes igual que `--background`) pasa a ser la superficie blanca/`#1c1c1e`
  — esto es lo que hace que las tarjetas "floten" sobre el fondo en vez de fundirse con él.
- `--primary` (verde) usa ahora el verde de sistema real de iOS (`#34c759`/`#30d158`), con
  `--primary-foreground` en **negro**, no blanco — texto blanco sobre ese verde no llega a
  3:1 de contraste (motivo documentado en el propio CSS de opengym); negro sí.
- Escala tipográfica (`.t-large/.t-title/...`) aplicada a los títulos principales de cada
  página. `components/ui/grouped-list.tsx` nuevo, aplicado a la sección "Cuenta" de ajustes
  como ejemplo — filas separadas por hairlines dentro de una sola superficie en vez de bordes
  individuales.
- Botones: variante `tinted` nueva (fondo verde translúcido + texto verde, como los botones
  secundarios de opengym); feedback de "pulsación" (`active:scale-[0.975]`) en vez de solo
  `hover:` (que no existe en touch). Inputs sin borde visible, con fondo `--secondary` y foco
  como anillo interior — mismo criterio que el `.field` de opengym.
- **Encontrado de paso**: `app/login/page.tsx`, `components/settings/notifications-section.tsx`
  y `components/diet/diet-form/day-fields.tsx` tenían `<input>`/`<select>` con el estilo viejo
  escrito a mano en vez de reutilizar `components/ui/input.tsx` — no heredaban el cambio de
  tokens automáticamente. Corregido.
- **No se hizo** (fuera de alcance, para no arriesgar regresiones en lógica compleja): reescribir
  la estructura de `diet-viewer.tsx`/`meal-card.tsx` o las burbujas del chat al patrón de lista
  agrupada — se quedan como tarjetas (`Card`), pero heredan todos los tokens nuevos (color,
  radio, tipografía) igualmente. Si se quiere ese acabado también ahí, es un encargo aparte.
- Verificado con lint/typecheck/53 tests/build y con el servidor de dev real: login + las 5
  páginas principales cargando, `settings` confirmado con las clases del grouped-list y la
  escala tipográfica presentes en el HTML. Sin verificación visual por captura de pantalla — el
  entorno no tiene navegador disponible.

## 2026-08-29 — Revisión mobile-first (navegación y touch targets), inspirada en opengym

- Comparación punto por punto con opengym (navegación, safe-areas, touch targets, sheets,
  teclado, PWA). Diferencia estructural con más impacto: opengym usa una barra de navegación
  inferior fija (alcanzable con el pulgar), bytebite solo tenía un menú hamburguesa arriba a la
  izquierda.
- Cambios: `components/nav/tab-bar.tsx` (barra inferior, 4 destinos) sustituye al
  hamburguesa+drawer lateral (`components/nav/side-menu.tsx` y `components/ui/sheet.tsx`
  eliminados, sin otros usos); `components/ui/dialog.tsx` pasó de modal centrado a bottom sheet
  (sin gesto de arrastre, eso no se implementó); variables CSS `--sat`/`--sab`/`--header-h`/
  `--tabbar-h` en `app/globals.css` centralizan los safe-areas (antes cada sitio escribía su
  propio `calc(...)`); botones táctiles de 28-32px subidos a ≥36-40px; `inputMode="decimal"` en
  los campos numéricos de macros; se reactivó el pinch-to-zoom (`maximumScale`/`userScalable`
  deshabilitaban el zoom sin motivo documentado — un anti-patrón de accesibilidad).
- **No se hizo** (fuera de alcance de esta ronda): drag-to-dismiss en los bottom sheets
  (opengym lo implementa a mano con eventos touch; más riesgo/esfuerzo del que pedía el
  alcance), y regenerar los iconos PWA con tamaños reales (192/512 siguen siendo el mismo
  archivo — requiere assets de diseño, no solo código).
- Verificado con el servidor de dev real: login + carga de las 5 páginas principales
  (dashboard, dietas, ajustes, subir, chat) con la tab bar nueva visible y sin rastro del menú
  antiguo.

## 2026-08-29 — Ajustes de cuenta ampliados + segundo bug real (Edge Runtime + Prisma)

- `/settings` pasó de tener solo el selector de objetivo a un conjunto completo inspirado en
  opengym: cuenta (nombre editable, cerrar sesión en todos los dispositivos), gestión de varias
  passkeys, notificaciones push con recordatorio diario, exportar/eliminar cuenta, tip de
  instalación PWA. Alcance decidido explícitamente con el usuario (incluyendo push y
  sign-out-everywhere en esta misma ronda, no como roadmap).
- **Segundo bug real encontrado durante la implementación** (el primero fue el de los `Map` en
  memoria de passkeys, ver más abajo): al añadir la comprobación de `sessionVersion` en el
  `session` callback de NextAuth (para "cerrar sesión en todos los dispositivos"), **toda la
  navegación de páginas protegidas empezó a redirigir a `/login`** aunque la sesión fuera
  válida. Causa: `middleware.ts` ejecuta los callbacks de `auth.ts` en el **Edge Runtime** de
  Next.js (no en el proceso Node.js normal), y Prisma con el motor SQLite no puede correr ahí
  (`PrismaClient is not configured to run in Edge Runtime`) — el error quedaba silenciado dentro
  de NextAuth y solo se veía en el log del servidor, nunca en la respuesta HTTP.
  - **Fix**: los callbacks `jwt`/`session` de `auth.ts` dejaron de tocar Prisma por completo
    (solo mueven `id`/`sessionVersion` ya presentes en el JWT). La comprobación real de
    revocación se centralizó en `lib/current-user.ts#getCurrentUser` (Node.js), usada desde
    `app/(app)/layout.tsx` — cubre toda la navegación de páginas de un solo golpe.
  - **Alcance aceptado, no un descuido**: las rutas de API (`app/api/**`) siguen sin comprobar
    `sessionVersion` en cada petición — solo confían en la validez normal del JWT. Retrofit-ar
    ~15 route handlers para repetir la consulta no se hizo por ahora; documentado en
    `SECURITY.md`.
- **Lección para el futuro** (anotada también en `CLAUDE.md`): cualquier lógica nueva en los
  callbacks de `auth.ts` hay que asumir que también corre en Edge, en `middleware.ts` — nada de
  Prisma ahí. Rutas que necesiten saltarse el middleware por completo (ej. un endpoint llamado
  por un cron externo, sin sesión de navegador) necesitan una excepción explícita ahí mismo,
  como se hizo para `POST /api/push/send-reminders`.
- Verificado end-to-end con el servidor de dev real (login vía token, `/settings`, cambio de
  nombre, cerrar sesión en todos los dispositivos y confirmación de que la sesión anterior queda
  revocada, alta/baja de passkeys con el bloqueo de "última passkey", exportar datos,
  eliminar cuenta con verificación de cascada, y las rutas de push incluida la excepción de
  CSRF del cron). Lo único no verificable sin navegador real es la firma criptográfica de un
  autenticador WebAuthn de verdad.

## 2026-08-29 — Bug real de passkeys: el Map en memoria no se compartía entre rutas

- Primer usuario probando el registro con passkey reportó `CredentialsSignin` al crear cuenta.
  Diagnóstico con endpoints temporales (`app/api/auth/debugput`/`debugtake`, borrados tras el
  fix): un token escrito por una ruta con `putPostAuthToken` no siempre era visible al leerlo
  desde otra ruta con `takePostAuthToken` — fallaba de forma **intermitente**, no siempre.
- Causa: `lib/webauthn-store.ts` guardaba los challenges/tokens en `Map`s a nivel de módulo.
  Cada Route Handler de Next.js puede compilarse/instanciarse por separado (más aún en `next
dev`, donde Next recicla módulos inactivos), así que el mismo archivo importado desde dos
  rutas distintas no garantiza compartir el mismo objeto en memoria — coincide con por qué
  `lib/prisma.ts` ya usaba el patrón `globalThis.prisma` (evitar múltiples `PrismaClient` por
  el mismo motivo, un gotcha conocido de Next.js + Prisma).
- **Fix**: se movió todo el estado de `lib/webauthn-store.ts` a una tabla nueva
  (`PendingAuthAction`, migración `webauthn_pending_action`) en vez de intentar el mismo truco
  de `globalThis` — la base de datos sí es compartida de verdad entre rutas, sobrevive a
  reinicios del proceso, y no depende de asunciones sobre cómo Next.js empaqueta cada ruta.
  De paso se corrigió un bug real en `auth.ts`: `takePostAuthToken(token)` se llamaba sin
  `await` (arrastrado desde cuando la función era síncrona), así que `userId` siempre era una
  Promise truthy — nunca fallaba por esto en la práctica porque el fallo del Map ocurría antes,
  pero era un bug latente.
- Verificado end-to-end tras el fix: `login-options`/`login-verify` consistente en 5 pasadas
  seguidas (antes fallaba ~1 de cada 3), y una sesión completa emitida correctamente insertando
  un token válido directamente en la tabla y completando el intercambio con el `Credentials`
  provider real de NextAuth vía curl.
- **`lib/rate-limit.ts` se deja en memoria a propósito**, pese a tener el mismo riesgo teórico:
  un fallo abierto ocasional (limitar de menos) es aceptable; perder el challenge de login no
  lo era.

## 2026-08-29 — Passkeys (WebAuthn), fin de las contraseñas

- Se eliminó por completo el login/registro con contraseña (bcrypt, `User.password`,
  `/api/auth/register`) y se sustituyó por passkeys, siguiendo el modelo de opengym
  (proyecto de referencia auditado esta misma sesión) pero permitiendo varias passkeys por
  cuenta en vez de una sola.
- Nuevo modelo `Authenticator` en Prisma; migración `passkey_auth` reconstruye `User` sin
  `password`. **Decisión explícita y deliberada**: sin recuperación de cuenta si se pierde el
  dispositivo — coherente con "sin contraseñas, sin email de reset".
- El `Credentials` provider de NextAuth se mantiene, pero cambia de rol: ya no valida
  contraseñas, solo canjea un token de un solo uso (emitido tras verificar la firma WebAuthn)
  por una sesión — ver `lib/webauthn-store.ts` y `auth.ts`. Se evitó así reimplementar el
  cookie de sesión a mano (que es lo que hace opengym al no usar un framework de auth).
- `rpID`/origen de WebAuthn se derivan de `NEXTAUTH_URL` en vez de pedir variables nuevas
  (`lib/webauthn-config.ts`). Implica que WebAuthn no funcionará si se despliega detrás de
  una IP LAN sin HTTPS — ya documentado en README/SECURITY.md.
- Se eliminó `prisma/seed.ts` (no se puede scriptar la creación de una passkey sin un
  navegador real) y el paso de seed en el `CMD` del Dockerfile. Cada cuenta se crea a mano
  desde `/login`.
- **Pendiente de verificación manual**: el ceremonial WebAuthn en sí (creación/verificación de
  passkey en un navegador real) no se pudo probar de extremo a extremo en este entorno sin
  navegador — sí se verificaron por separado: generación de opciones, rate limiting, CSRF,
  caducidad de challenges/tokens, y los caminos de error (email duplicado, passkey no
  reconocida, sesión expirada).

## 2026-08-20 — Login/registro + auditoría de seguridad

- Pantalla `/login` con pestañas (Iniciar sesión / Crear cuenta) en vez de dos
  páginas separadas; registro con `zod` (esquemas en `lib/validation/auth.ts`)
  y auto-login tras crear la cuenta.
- Auditoría del código existente: se corrigieron una vulnerabilidad crítica en
  `next-auth` (bump de versión), se añadió un guard de `AUTH_SECRET` en
  producción y un rate limit básico en `/api/auth/register`. `next` en sí
  quedó con vulnerabilidades conocidas pero el fix exige salto de versión
  mayor (14→16), fuera de alcance por ahora.

## 2026-08-20 — CRUD de comidas + selector de dietas + entrada manual/IA revisable

- CRUD completo del árbol de la dieta (días/comidas/opciones/items) desde el
  dashboard, con modo edición por comida (reutilizando
  `EntityFormDialog`/`ConfirmDeleteButton`).
- Selector rápido de dieta en el dashboard (`DietSwitcher`) + activar como
  dieta por defecto.
- Flujo de subida rediseñado: pantalla de elección Automático (IA) / Manual;
  automático crea la dieta directo (sin paso de revisión); si Gemini falla se
  ofrece pasar a manual con el mismo formulario.
- **Bug corregido**: `MealCard` guardaba una copia de `meal.options` en
  `useState` que no se resincronizaba tras un `router.refresh()` — borrar una
  opción o un ingrediente no se reflejaba en pantalla aunque el borrado en BD
  funcionara. Solución: renderizar siempre desde las props, con estado local
  solo para el `checked` optimista de los items.
- El borrar/añadir día y comida quedó oculto detrás de un toggle "Editar
  días" (antes estaba siempre visible, sin relación con ningún modo edición).

## 2026-08-20 — Menú lateral, gestión de dietas y memoria del proyecto

- Layout compartido `app/(app)/layout.tsx` para todas las rutas protegidas
  (dashboard, upload, diets, settings), con cabecera fija y menú lateral
  (`components/nav/side-menu.tsx`, construido sobre un nuevo
  `components/ui/sheet.tsx`).
- Menú: cambio de tema, enlaces a Dashboard/Gestionar dietas/Ajustes, y
  "Cerrar sesión" (no existía ningún punto de logout en la app hasta ahora).
- Nueva página `/diets`: lista completa de dietas del usuario con renombrar,
  eliminar y ver.
- `/settings` como placeholder ("Próximamente"), a desarrollar más adelante.
- Este `CLAUDE.md` + `docs/` para dar continuidad entre sesiones/dispositivos.

## 2026-08-20 — El selector de dietas se traslada a "Gestionar dietas"

- Se retiró `DietSwitcher` (desplegable + "Usar esta dieta") del dashboard.
  El dashboard sigue soportando `?diet=<id>` para ver una dieta concreta, pero
  ya no ofrece la UI para cambiarla in situ.
- `/diets` (`components/diet/diet-list-item.tsx`) pasa a ser el único sitio
  para cambiar cuál es la dieta activa: cada fila que no es la activa muestra
  un botón "Usar esta dieta" (mismo `PATCH /api/diets/[id]/activate`).
