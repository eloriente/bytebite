# Decisiones y features (registro breve)

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
