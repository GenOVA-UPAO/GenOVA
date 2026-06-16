# RN-006: Experiencia visual unificada del frontend

> Metadata (propuesta desde plan de rediseño basado en wireframes):

| Campo | Valor |
|---|---|
| ID | RN-006 |
| Tipo | Req. No Funcional |
| Epica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 2 |
| Status | spec_ready |
| Prioridad | Alta |
| Estimacion | 8 SP |
| Dependencia | HU-010, RN-005 |
| Responsable | - |
| Fase | SDD - Specify |
| Fecha creacion | 2026-06-16 |
| Fecha actualizacion | 2026-06-16 |
| Fecha Fin (info) | - |

## Objetivo

Unificar la experiencia visual del frontend tomando como referencia los
wireframes React existentes (`frontend/src/pages/Wireframe*.jsx`), con una
direccion editorial academica UPAO: shell compacto, sidebar denso, tarjetas
limpias, tipografia Fraunces/Geist, azul UPAO como primary y naranja como acento
puntual.

## Contexto

El frontend actual ya usa React 19, React Router 7, Tailwind CSS 4, shadcn/Radix,
React Query, Sonner y Phosphor. Tambien existe una familia de wireframes dentro
del propio codigo que define el look deseado para navegacion, dashboard, Mis
OVAs, workspace, administracion, modelos, fallback y vinculacion. RN-006 no
agrega funcionalidades nuevas: fija el estandar visual transversal y migra las
pantallas existentes a esa direccion.

## Alcance

### Incluye
- Reemplazo del shell real por el patron de `WireframeShell`: header compacto,
  sidebar seccionado, menu movil y avatar/menu de usuario.
- Rediseño visual de pantallas existentes: Dashboard, Mis OVAs, Crear/Workspace,
  Perfil, Roles, Usuarios, Plataforma y Papelera.
- Uso de tokens CSS actuales y ajustes menores en `index.css` si son necesarios.
- Navegacion responsive basada en permisos y rol efectivo.
- Conservacion temporal de rutas `/wireframe*` como referencia/dev.

### No incluye
- Crear las pantallas reales `/modelos` y `/fallback` (HU-035).
- Crear vinculacion docente/estudiante o permisos nuevos de producto (HU-036).
- Cambiar librerias de UI o instalar dependencias nuevas.
- Cambios al motor de generacion OVA o SCORM.

## Dependencias

- HU-010: layout principal y enrutamiento modular.
- RN-005: responsive transversal.
- Wireframes en `frontend/src/pages/Wireframe*.jsx`.
- Convencion frontend: services -> hooks -> pages, maximo 200 lineas por archivo.

## Reglas de negocio

1. **R1** - La UI real adopta la direccion visual de los wireframes: editorial
   academico UPAO, shell compacto, sidebar denso y tarjetas limpias.
2. **R2** - El shell agrupa navegacion en secciones: Principal, Configuracion y
   Administracion. Administracion solo aparece para usuarios con acceso admin.
3. **R3** - Las pantallas existentes conservan su comportamiento y datos
   actuales; el cambio de RN-006 es visual y ergonomico.
4. **R4** - La UI usa Tailwind CSS 4, shadcn/Radix, React Query, React Router 7,
   Sonner y Phosphor ya instalados. No se agregan dependencias.
5. **R5** - Los botones iconicos usan Phosphor o componentes UI existentes con
   labels accesibles.
6. **R6** - El layout es responsive en 360px, 768px y 1280px sin scroll
   horizontal ni solapamientos.
7. **R7** - Las rutas `/wireframe*` no se usan como navegacion principal de
   producto y quedan aisladas como referencia/dev hasta limpieza final.
8. **R8** - Ningun archivo nuevo o modificado supera 200 lineas salvo excepciones
   ya configuradas.

## Criterios de aceptacion

- El usuario autenticado ve un shell compacto con sidebar, header, menu movil y
  avatar segun el patron de los wireframes. **(R1, R2)**
- Dashboard, Mis OVAs, Perfil, Admin Roles, Admin Usuarios, Admin Plataforma y
  Papelera mantienen sus flujos actuales con la nueva estetica. **(R3)**
- Crear/Workspace conserva la generacion, edicion, preview, historial y descarga
  existentes con layout alineado al wireframe. **(R3)**
- No se instala ninguna dependencia nueva. **(R4)**
- Las vistas pasan verificacion responsive en 360px, 768px y 1280px. **(R6)**
- Las rutas `/wireframe*` no aparecen en la navegacion real. **(R7)**
- `pnpm lint`, `pnpm test:unit` y `./verify.ps1 -Quick` pasan. **(R8)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Experiencia visual unificada del frontend (RN-006)

  Scenario: Navegacion principal redisenada
    Given un usuario autenticado
    When entra al dashboard
    Then ve el shell compacto con sidebar seccionado
    And puede abrir el menu de usuario desde el avatar

  Scenario: Pantallas existentes mantienen comportamiento
    Given un usuario con OVAs existentes
    When abre Mis OVAs
    Then puede buscar, filtrar, editar, duplicar, descargar y mover a papelera
    And la pantalla usa la estetica de los wireframes

  Scenario Outline: Responsive del nuevo shell
    Given una pantalla autenticada del frontend
    When se visualiza a un ancho de <ancho>
    Then no hay scroll horizontal ni solapamientos
    And la navegacion sigue siendo usable

    Examples:
      | ancho  |
      | 360px  |
      | 768px  |
      | 1280px |
```
