# HU-003: Visualizar completa 5E

## Historia de Usuario
Como **estudiante del curso de ML de UPAO**,
quiero ver una vista previa de las 5 fases del modelo pedagógico 5E (Enganche, Exploración, Explicación, Elaboración, Evaluación),
para revisar el contenido generado por la IA y verificar su coherencia antes de exportar el OVA.

## Objetivo funcional
Mostrar el output principal del OVA generado como una vista previa navegable y estructurada en las 5 fases del modelo 5E, permitiendo auditar el contenido pedagógico antes de empaquetarlo como SCORM.

## Alcance

### Incluye
- Vista previa de las 5 fases del modelo 5E completas, sin truncamiento.
- Navegación por pestañas (una pestaña por fase E).
- Renderizado de contenido enriquecido por sección:
  - Encabezados (`heading`)
  - Párrafos (`paragraph`)
  - Listas ordenadas y desordenadas (`list`)
  - Bloques de código con etiqueta de lenguaje (`code`)
  - Imágenes con pie de foto (`image`)
- Indicador visual de fase activa (color diferenciado por fase).
- Botón "Editar" por fase, presente pero deshabilitado (placeholder para Sprint 2).
- La vista aparece automáticamente al completarse la generación del OVA (progreso 100%).
- Se reinicia (desaparece) al iniciar una nueva generación.

### No incluye
- Edición real del contenido de las fases (queda para Sprint 2).
- Persistencia del contenido en base de datos (datos en memoria por sesión).
- Exportación directa desde esta vista (corresponde a HU-004).
- Soporte de video embebido como tipo de sección.

## Dependencias
- **HU-002**: El flujo de generación debe completarse exitosamente y devolver `ova_content` en la respuesta de progreso.
- **SP-002**: El modelo pedagógico 5E define las fases obligatorias y su orden: Enganche → Exploración → Explicación → Elaboración → Evaluación.

## Reglas de negocio
1. Las 5 fases deben mostrarse siempre en el orden fijo definido por SP-002.
2. Todo el contenido de cada fase debe ser visible sin truncamiento en la interfaz.
3. La vista previa solo se muestra cuando `ova_content` está disponible (generación exitosa).
4. Cada pestaña activa muestra el contenido completo de su fase sin paginación interna.
5. El botón "Editar" debe estar presente en cada fase pero deshabilitado con mensaje accesible ("Disponible en Sprint 2").
6. Si la respuesta de generación no incluye `ova_content`, la vista previa no se muestra (no se renderiza el componente).
7. Las secciones de tipo desconocido se ignoran silenciosamente (sin error).

## Criterios de aceptación
1. El 100% de los módulos de cada fase son visibles sin truncamiento en la interfaz.
2. La estructura visual de las 5 fases está presente y distinguible.
3. La navegación por pestañas permite cambiar de fase con un clic.
4. Cada fase tiene su pestaña rotulada con el nombre correspondiente.
5. La fase activa se destaca visualmente (color de acento diferenciado).
6. El contenido renderiza correctamente texto enriquecido (encabezados, párrafos).
7. El contenido renderiza correctamente listas ordenadas y desordenadas.
8. El contenido renderiza correctamente bloques de código con indicador de lenguaje.
9. Cada fase muestra un botón "Editar" deshabilitado y con atributo `title` indicando disponibilidad en Sprint 2.
10. La vista aparece automáticamente al finalizar la generación del OVA.
11. Al iniciar una nueva generación, la vista previa anterior desaparece.

## Requisitos no funcionales asociados
- RN-UX-01: La vista previa debe renderizarse en menos de 300 ms tras recibir `ova_content`.
- RN-ACC-01: Los botones de pestaña deben tener `role="tab"`, `aria-selected` y `aria-controls` correctamente definidos.
- RN-ACC-02: El botón "Editar" deshabilitado debe incluir `aria-label` con el nombre de la fase y la razón de deshabilitación.

## Escenarios BDD (Gherkin)

```gherkin
Feature: Visualizar completa 5E

  Scenario: Vista previa aparece tras generación exitosa
    Given el estudiante ha completado el formulario de generación de OVA
    When el proceso de generación alcanza el 100% y devuelve ova_content
    Then el sistema muestra la sección "Vista previa del OVA — Modelo 5E"
    And presenta 5 pestañas: Enganche, Exploración, Explicación, Elaboración, Evaluación
    And la primera pestaña (Enganche) aparece activa por defecto

  Scenario: Navegación entre fases por pestañas
    Given la vista previa del OVA está visible con las 5 pestañas
    When el estudiante hace clic en la pestaña "Explicación"
    Then el contenido de la fase Explicación se muestra completo
    And las demás pestañas quedan inactivas visualmente
    And no hay truncamiento del contenido en pantalla

  Scenario: Renderizado de contenido enriquecido
    Given la vista previa muestra la fase activa con contenido generado
    Then los encabezados se renderizan con jerarquía visual correcta
    And los párrafos se muestran con texto completo sin corte
    And las listas ordenadas muestran numeración y las desordenadas viñetas
    And los bloques de código muestran el lenguaje y formato monoespaciado

  Scenario: Botón Editar deshabilitado por fase
    Given la vista previa del OVA está visible
    When el estudiante visualiza cualquier fase
    Then cada fase muestra un botón "Editar"
    And el botón está deshabilitado con mensaje "Disponible en Sprint 2"
    And no es posible hacer clic en él

  Scenario: Vista previa se reinicia al generar un nuevo OVA
    Given la vista previa del OVA generado está visible
    When el estudiante modifica el prompt y presiona "Generar OVA" nuevamente
    Then la vista previa anterior desaparece inmediatamente
    And se muestra el indicador de progreso de la nueva generación
    And al completarse la nueva generación aparece la vista previa actualizada

  Scenario: Sin contenido generado no se muestra la vista
    Given el estudiante acaba de abrir la página "Crear OVA"
    And no ha completado ninguna generación
    Then la sección de vista previa 5E no está visible en la interfaz
```

## Mockup ASCII

```text
+--------------------------------------------------------------+
|  Vista previa del OVA — Modelo 5E                            |
|  Árboles de decisión para clasificación supervisada          |
+--------------------------------------------------------------+
| [Enganche] [Exploración] [Explicación] [Elaboración] [Evaluación] |
+--------------------------------------------------------------+
|  Fase 1 — Enganche                              [Editar 🔒]  |
|                                                              |
|  ¿Por qué importa este tema?                                 |
|                                                              |
|  Los árboles de decisión son uno de los algoritmos más       |
|  intuitivos del aprendizaje automático...                    |
|                                                              |
|  • Comprenderás la intuición detrás de los árboles          |
|  • Verás cómo se aplican en problemas reales                |
|  • Explorarás sus ventajas y limitaciones                   |
|                                                              |
|  Reflexiona: ¿cómo tomarías la decisión de aprobar...?      |
+--------------------------------------------------------------+

+--------------------------------------------------------------+
|  Vista previa del OVA — Modelo 5E                            |
|  Árboles de decisión para clasificación supervisada          |
+--------------------------------------------------------------+
| [Enganche] [Exploración] [Explicación★] [Elaboración] [Evaluación] |
+--------------------------------------------------------------+
|  Fase 3 — Explicación                           [Editar 🔒]  |
|                                                              |
|  Conceptos fundamentales                                     |
|                                                              |
|  Un árbol de decisión divide recursivamente el conjunto...   |
|                                                              |
|  1. Impureza Gini: mide la probabilidad de clasificar...    |
|  2. Ganancia de información: diferencia de entropía...      |
|  3. Poda (Pruning): técnica para evitar sobreajuste...      |
|                                                              |
|  python                                                      |
|  ┌──────────────────────────────────────────────────────┐   |
|  │ clf = DecisionTreeClassifier(max_depth=3)            │   |
|  │ clf.fit(X_train, y_train)                            │   |
|  └──────────────────────────────────────────────────────┘   |
+--------------------------------------------------------------+
```
