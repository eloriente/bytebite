# Arquitectura

## Modelo de datos (Prisma)

```
User (email único, password hasheado con bcrypt, role sin uso real todavía)
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

## Autenticación

NextAuth v5 (beta) con `Credentials` provider (`auth.ts`): compara la
contraseña con bcrypt contra `User.password`. Sesión JWT (sin adapter de base
de datos para la sesión). `middleware.ts` protege todo excepto
`/login`, `/api/auth`, y assets estáticos — cualquier ruta nueva bajo el grupo
`(app)` queda protegida automáticamente.

El registro (`/api/auth/register`) es una ruta propia (no forma parte de
NextAuth): valida con zod, aplica un rate limit básico por IP
(`lib/rate-limit.ts`) y crea el usuario con bcrypt. `auth.ts` falla al arrancar
en producción si falta `AUTH_SECRET`.

No hay ningún punto de "cerrar sesión" hasta que se añadió al menú lateral
(`components/nav/side-menu.tsx`, usa `signOut` de `next-auth/react`).

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
desde el menú lateral) es la gestión completa: renombrar, eliminar, ver.
