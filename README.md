# ByteBite

PWA mobile-first para subir el PDF de una dieta, extraer su contenido con Gemini
(Structured Outputs) y visualizarla por días/comidas con checkboxes interactivos. Incluye un
asistente de chat (Gemini) para consultar la dieta activa o proponer ediciones sobre ella.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui (Radix primitives)
- Prisma ORM + SQLite (archivo único en `prisma/data/bytebite.db`)
- NextAuth.js v5 (Credentials como transporte) + **passkeys (WebAuthn)** vía
  `@simplewebauthn/server`/`browser` — sin contraseñas, sin recuperación si se pierde el
  dispositivo. Ver "Autenticación con passkeys" más abajo.
- `@google/genai` para extracción estructurada del PDF y el chat de IA

## Desarrollo local

1. Copia `.env.example` a `.env` y rellena `GEMINI_API_KEY` y `AUTH_SECRET`
   (genera este último con `openssl rand -base64 32`).
2. Instala dependencias: `npm install`.
3. Crea la base de datos y aplica el esquema:
   ```bash
   npx prisma migrate dev
   ```
4. Arranca el servidor de desarrollo:
   ```bash
   npm run dev
   ```
5. Entra en `http://localhost:3000/login`, pestaña "Crear cuenta", y registra tu passkey
   (huella, Face ID, Windows Hello o una llave de seguridad). No hay usuarios sembrados: cada
   quien crea su cuenta la primera vez.

## Autenticación con passkeys

ByteBite **no gestiona contraseñas**. El login/registro es WebAuthn puro (como opengym):

- `RP_ID` y el origen esperado se derivan de `NEXTAUTH_URL` (hostname y origen completo,
  respectivamente) — no hay variables nuevas que configurar.
- **WebAuthn exige HTTPS**, con una única excepción: `http://localhost`. Una IP LAN
  (`http://192.168.x.x`) nunca funcionará. Si despliegas ByteBite accesible desde fuera de tu
  máquina, necesitas un dominio real con TLS delante (ver `SECURITY.md`).
- **Una cuenta puede tener varias passkeys** (a diferencia de opengym), pero **no hay
  recuperación de cuenta**: si pierdes el único dispositivo con tu passkey, la cuenta queda
  inaccesible salvo edición manual de la base de datos.
- Cambiar el hostname de `NEXTAUTH_URL` en producción invalida todas las passkeys ya
  registradas (quedan atadas al `RP_ID` con el que se crearon).

## Ajustes de cuenta

Desde `/settings` (además del objetivo nutricional, ya existente):

- **Cuenta**: cambiar el nombre, y "cerrar sesión en todos los dispositivos" (revoca todas las
  sesiones activas; ver limitación en `SECURITY.md` — las rutas de API no comprueban la
  revocación en cada petición, solo la navegación entre páginas).
- **Notificaciones**: activar/desactivar notificaciones push del navegador y un recordatorio
  diario a una hora concreta. Requiere `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` configuradas (ver
  `.env.example`) y, para que el recordatorio realmente se envíe, un cron externo — ByteBite no
  tiene un proceso de fondo propio (ver `.env.example` → `CRON_SECRET`).
- **Passkeys**: añadir una passkey adicional (otro dispositivo) o eliminar una existente — no se
  permite quedarte sin ninguna.
- **Tus datos**: exportar todos tus datos en JSON, o eliminar la cuenta por completo
  (irreversible, borra dietas/conversación/passkeys en cascada).

## Comandos de desarrollo

```bash
npm run format:check   # Prettier
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm test               # Vitest
npm run build           # build de producción
```

Estos mismos pasos corren en CI en cada push/PR (`.github/workflows/ci.yml`). Ver
[`CONTRIBUTING.md`](CONTRIBUTING.md) para más detalle.

## Iconos PWA

Añade tus propios iconos en `public/icons/icon-192.png` y `public/icons/icon-512.png`
(referenciados desde `public/manifest.json` y `app/layout.tsx`).

## Despliegue con Docker

```bash
cp .env.example .env   # rellena las variables

# El contenedor corre como usuario no-root (uid 1001). Como el volumen es un
# bind mount, hay que crear la carpeta con permisos de escritura ANTES del
# primer arranque, o Docker la creará como root y Prisma no podrá escribir
# el .db (EACCES / SQLITE_CANTOPEN).
mkdir -p prisma/data && chmod 777 prisma/data

docker compose up -d --build
```

El volumen `./prisma/data` persiste la base de datos SQLite y los PDFs subidos
entre reinicios del contenedor. El contenedor ejecuta `prisma migrate deploy`
automáticamente al arrancar, aplicando las migraciones versionadas en
`prisma/migrations/` (por eso esa carpeta debe estar commiteada en git).

## Más información

- [`CONTRIBUTING.md`](CONTRIBUTING.md) — cómo contribuir, convenciones, comandos.
- [`SECURITY.md`](SECURITY.md) — política de seguridad y cómo reportar vulnerabilidades.
- [`CHANGELOG.md`](CHANGELOG.md) — historial de cambios.
- [`docs/architecture.md`](docs/architecture.md) y [`docs/decisions.md`](docs/decisions.md) —
  modelo de datos, flujos y decisiones de diseño.
- Licencia: [AGPL-3.0-or-later](LICENSE).
