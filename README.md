# ByteBite

PWA mobile-first para subir el PDF de una dieta, extraer su contenido con Gemini
(Structured Outputs) y visualizarla por días/comidas con checkboxes interactivos.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui (Radix primitives)
- Prisma ORM + SQLite (archivo único en `prisma/data/bytebite.db`)
- NextAuth.js v5 (Credentials) — 2 usuarios
- `@google/genai` para extracción estructurada del PDF

## Desarrollo local

1. Copia `.env.example` a `.env` y rellena `GEMINI_API_KEY` y `AUTH_SECRET`
   (genera este último con `openssl rand -base64 32`).
2. Instala dependencias: `npm install`.
3. Crea la base de datos y aplica el esquema:
   ```bash
   npx prisma migrate dev --name init
   ```
4. Crea los 2 usuarios iniciales:
   ```bash
   npx prisma db seed
   ```
5. Arranca el servidor de desarrollo:
   ```bash
   npm run dev
   ```
6. Entra en `http://localhost:3000/login` con las credenciales sembradas
   (por defecto `user1@bytebite.app` / `changeme1`, cámbialas en `.env`).

## Iconos PWA

Añade tus propios iconos en `public/icons/icon-192.png` y `public/icons/icon-512.png`
(referenciados desde `public/manifest.json` y `app/layout.tsx`).

## Despliegue con Docker

```bash
cp .env.example .env   # rellena las variables
docker compose up -d --build
```

El volumen `./prisma/data` persiste la base de datos SQLite y los PDFs subidos
entre reinicios del contenedor. El contenedor ejecuta `prisma migrate deploy`
automáticamente al arrancar.
