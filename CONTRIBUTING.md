# Contribuir a ByteBite

Gracias por el interés en el proyecto. Esta guía cubre lo mínimo para ponerte en marcha y las
convenciones que se esperan en un cambio.

## Estructura del proyecto

```
app/          Next.js App Router: rutas, layouts y endpoints de API (app/api/**)
components/   Componentes de dominio (diet/, chat/, nav/, settings/) y primitivos (ui/)
lib/          Lógica de negocio pura, validación (zod), Prisma, Gemini, rate limit, WebAuthn
prisma/       schema.prisma y migraciones
docs/         architecture.md (cómo funciona), decisions.md (por qué se decidió así)
```

Ver `CLAUDE.md` para las convenciones detalladas de código (comprobación de propiedad en rutas
API, reutilización de diálogos genéricos, patrón de estado del cliente, etc.) y
`docs/architecture.md` para el modelo de datos y los flujos principales.

## Poner en marcha el entorno

```bash
cp .env.example .env   # rellena GEMINI_API_KEY y genera AUTH_SECRET
npm install
npx prisma migrate dev
npm run dev
```

No hay usuarios semilla (no se puede crear una passkey sin un navegador real): entra en
`/login` → "Crear cuenta" y registra tu propia passkey.

## Comandos antes de abrir un PR

```bash
npm run format:check   # Prettier
npm run lint           # ESLint (next/core-web-vitals)
npm run typecheck      # tsc --noEmit
npm test               # Vitest
npm run build          # build de producción (prisma generate + next build)
```

Estos mismos pasos corren en CI (`.github/workflows/ci.yml`) en cada push y pull request.

## Convenciones

- **Toda lógica de decisión no trivial** (cálculo de macros, construcción de contexto para el
  chat, reglas de validación) va en `lib/` como función pura, con un test (`*.test.ts`) al lado.
  No es solo estilo: ya hubo un bug de sincronización de estado en `MealCard` que un test habría
  detectado (ver `docs/decisions.md`).
- **Comprobación de propiedad**: cualquier ruta API que toca un recurso anidado (comida, opción,
  item) debe resolver la cadena hasta `diet.userId` y devolver **404** (nunca 403) si no
  pertenece al usuario autenticado.
- **Validación centralizada**: los esquemas zod viven en `lib/validation/` y se reutilizan en
  cliente y servidor — no dupliques reglas de validación en un componente.
- **UI en español, mobile-first**: mantén los textos de interfaz en español y los contenedores
  pensados para pantalla de móvil (`max-w-lg`/`max-w-sm`).
- **Reutiliza los diálogos genéricos** (`components/diet/entity-form-dialog.tsx`,
  `components/diet/confirm-delete-button.tsx`) para CRUD sencillo en vez de crear modales ad hoc.

## Registrar cambios

Actualiza `CHANGELOG.md` (sección `[Unreleased]`) cuando el cambio sea visible para quien
despliega o usa la app. Cambios internos sin impacto (refactors, tooling) no necesitan entrada.

## Reportar bugs o proponer features

Abre un issue en GitHub describiendo el comportamiento esperado vs. el actual (o la
funcionalidad propuesta) y, si aplica, pasos para reproducir. Para vulnerabilidades de
seguridad, sigue el proceso de [`SECURITY.md`](SECURITY.md) en vez de un issue público.
