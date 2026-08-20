# ByteBite

PWA mobile-first para gestionar dietas: subida de un PDF (analizado por IA) o
entrada manual, organización por días/comidas/opciones/ingredientes, checklist
diario y gestión de múltiples dietas por usuario.

## Stack

- **Next.js 14** (App Router), TypeScript, React 18.
- **Prisma** + SQLite (`prisma/data/bytebite.db`).
- **NextAuth v5 (beta)** — Credentials provider, sesión JWT. Login + registro
  propio en `/login` (pestañas).
- **Tailwind CSS** + componentes propios estilo shadcn (CVA + Radix UI:
  accordion, checkbox, dialog, label, progress, tabs) en `components/ui/`.
- **Zod** para validar formularios y bodies de las rutas API.
- **`@google/genai`** (Gemini) para extraer la dieta de un PDF (`lib/gemini.ts`).
- Docker (`Dockerfile` + `docker-compose.yml`) para despliegue.

## Estructura

```
app/
  (app)/            # Rutas protegidas con layout compartido (header + menú lateral)
    layout.tsx       # Auth guard + SideMenu
    dashboard/       # Visor de la dieta activa/seleccionada
    upload/          # Elegir Automático (IA) / Manual → crear dieta
    diets/           # Gestionar dietas (renombrar/eliminar/ver)
    settings/        # Placeholder, aún sin funcionalidad
  login/             # Fuera del grupo (app) — sin header compartido
  api/
    auth/            # NextAuth + registro
    diets/           # create, parse (Gemini), activate, rename/delete ([id])
    diet-days/ meals/ meal-options/ items/   # CRUD granular del árbol de la dieta
components/
  diet/              # Componentes de dominio (viewer, meal-card, forms, diálogos)
  nav/               # SideMenu
  ui/                # Primitivos reutilizables (button, card, dialog, sheet, ...)
lib/
  validation/        # Esquemas zod (auth.ts, diet.ts)
  prisma.ts, gemini.ts, diet.ts (helper de creación), rate-limit.ts, nutrition.ts
prisma/schema.prisma # User → Diet → DietDay → Meal → MealOption → Item (cascade)
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
- **Rate limiting**: limitador en memoria (`lib/rate-limit.ts`), solo aplicado
  hoy a `/api/auth/register`. No persiste entre reinicios ni escala a varias
  instancias — válido para el despliegue actual de un único contenedor.

## Comandos

```bash
npm run dev              # servidor de desarrollo
npm run build             # prisma generate + next build
npm run prisma:migrate    # nueva migración en desarrollo
npm run prisma:studio     # explorar la base de datos
npx prisma db seed        # crea los 2 usuarios de prueba (ver .env.example)
```

Variables de entorno necesarias: ver `.env.example` (`GEMINI_API_KEY`,
`AUTH_SECRET`, `NEXTAUTH_URL`, credenciales de los usuarios semilla).

## Más detalle

- `docs/architecture.md` — modelo de datos, flujo de auth, flujo de creación
  de dietas (manual vs. Gemini).
- `docs/decisions.md` — registro breve de features/decisiones por sesión.
