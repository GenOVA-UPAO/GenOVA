---
name: genova-ui
description: Lineamientos de diseño e interfaz de GenOVA (React 19 + Tailwind 4 + shadcn, marca UPAO). Úsala al crear o revisar cualquier componente, página o modal del frontend, y al auditar UI/accesibilidad/motion.
---

# GenOVA UI

Basada en frontend-design (Anthropic), Web Interface Guidelines (Vercel), WCAG 2.2 AA y los
principios de motion de ui-skills.com, adaptados a la marca UPAO de GenOVA.

## Identidad
- Tokens en `frontend/src/styles.css` (OKLCH). Azul UPAO `--primary` (#0A3D91) para acciones
  primarias y foco; naranja `--accent-brand` SOLO para un énfasis por pantalla (CTA principal o
  progreso). Fondo papel cálido `--background`, tinta casi-navy `--foreground`.
- Nunca colores literales (`bg-blue-600`, `#fff`): siempre tokens (`bg-primary`, `text-muted-foreground`).
- Tipografía: `--font-heading` para títulos, Geist para UI. Escala fija 12/14/16/20/24/32/40.
  Títulos `text-balance`, párrafos `text-pretty`, `max-w-[68ch]` en texto largo, `tabular-nums` en cifras.
- Sin eyebrows en MAYÚSCULAS sobre cada título; sin tarjetas idénticas con la misma sombra en
  todo; un radio por jerarquía (`--radius`).

## Layout y espaciado
- Escala de 4/8 px (clases Tailwind estándar). Misma separación entre secciones hermanas.
- Hijos flex con `min-w-0`; texto largo con `truncate`/`line-clamp-*`/`break-words`. Diseña para
  textos cortos, medios y MUY largos (títulos de OVA de 120 caracteres).
- Móvil primero: todo usable a 360 px sin scroll horizontal; objetivos táctiles ≥ 44 px.
- Estados vacíos con una acción (`EmptyState`), errores con reintento (`QueryErrorState`),
  carga con `Skeleton` que respete el layout final (sin saltos).

## Interacción
- Acción = `<button>`; navegación = `<Link>`/`<a>`. Nunca `<div onClick>`.
- Cada control: hover, `focus-visible:ring-2 ring-ring`, active, disabled y loading
  (spinner + texto «Guardando…» y botón deshabilitado). Nunca `outline-none` sin sustituto.
- Formularios: `<label htmlFor>`, `type`/`autocomplete`/`inputMode` correctos, validación
  con zod en línea junto al campo con la SOLUCIÓN («Mínimo 12 caracteres»), foco al primer
  error, no bloquear pegar, `aria-invalid` + `aria-describedby`.
- Modales (Dialog shadcn): título y descripción siempre, foco atrapado, Esc cierra, foco
  vuelve al disparador, acción primaria a la derecha, destructivas en `variant="destructive"`
  con confirmación explícita (escribir el nombre si es irreversible). Avisar si hay cambios sin guardar.
- Estado relevante (pestaña, filtro, paso, OVA abierto) reflejado en la URL.
- Feedback asíncrono (guardado, generación, errores) con toast + `aria-live="polite"`.

## Motion
- 150–250 ms, `ease-out` para entrar, solo `transform`/`opacity`, nunca `transition-all`.
- `motion-safe:` para todo lo decorativo; `prefers-reduced-motion` desactiva loops.
- El movimiento responde a una acción; nada de fade-in en cada sección al cargar.

## Accesibilidad (WCAG 2.2 AA)
- Contraste 4.5:1 texto, 3:1 UI. Correcto/incorrecto nunca solo por color (icono + texto).
- Botones solo-icono con `aria-label`; iconos decorativos `aria-hidden`.
- Jerarquía h1→h6 sin saltos, un h1 por página, skip link al contenido.
- Todo operable con teclado; drag&drop con alternativa de botones.
- Medios con transcripción/subtítulos; nunca `user-scalable=no`.

## Revisión (checklist rápida al tocar UI)
1. ¿Tokens y no literales? 2. ¿Todos los estados (vacío/carga/error/largo)? 3. ¿Foco visible y
teclado? 4. ¿360 px sin overflow? 5. ¿Contraste AA? 6. ¿Motion reducido? 7. ¿Copy en español
claro, con «…» y sin jerga técnica para el docente?
