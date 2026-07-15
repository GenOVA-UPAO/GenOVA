# PLANTILLA Informe Técnico (Guía)

### 🎯 Propósito del documento

Este documento que el estudiante entrega **no es la tesis**. Es un *Technical Design & Development Report* (TDDR) que captura todo el proceso de diseño, desarrollo y validación de su solución tecnológica..

### 📐 ESTRUCTURA DEL DOCUMENTO

### SECCIÓN 0 — PORTADA Y METADATOS DEL PROYECTO

| Campo | Descripción |
| --- | --- |
| Tipo de solución | Híbrida (Web + IA Generaría) |
| Dominio de aplicación | Educación |
| Palabras clave | `Generative AI`, `learning objects`, `SCORM 1.2`, `large language models`, `retrieval-augmented generation`, `5E instructional model`, `educational technology`, `automatic content generation` |
| Repositorio del código | https://github.com/GenOVA-UPAO/GenOVA (Público) |
| Dataset | No aplica al proyecto |

### SECCIÓN 1 — PROBLEMA Y MOTIVACIÓN TÉCNICA

**1.1 Descripción del problema real**

- Contexto del dominio donde existe el problema
- Evidencia cuantitativa del problema (estadísticas, reportes, datos reales)
- ¿Por qué las soluciones actuales son insuficientes?

**1.2 Brecha tecnológica identificada**

- ¿Qué gap técnico específico aborda esta solución?
- Justificación de por qué se necesita una solución computacional

**1.3 Pregunta de investigación técnica**

- Formulada como: *¿En qué medida [solución propuesta] permite [resultado esperado] en el contexto de [dominio]?*

**1.4 Objetivo general y objetivos específicos**

- 1 objetivo general orientado al desarrollo
- 3–5 objetivos específicos medibles (cada uno ligado a una sección del documento)

**1.5 Alcance y limitaciones declaradas**

- Qué incluye y qué excluye explícitamente la solución
- Restricciones de hardware, datos, tiempo, acceso al dominio

**1.6 Contribución técnica principal** *(research contribution)*

- Declaración explícita: ¿qué aporta esta solución que no existía antes?
- Puede ser: arquitectura novel, combinación de técnicas, aplicación en dominio no explorado, optimización demostrable

### SECCIÓN 2 — REVISIÓN DE LITERATURA TÉCNICA

*(Equivale a Related Work / Background)*

**2.1 Marco conceptual técnico**

- Definición y fundamento de las tecnologías/paradigmas usados
- Solo conceptos directamente usados en la solución

**2.2 Estado del arte de soluciones similares**

Tabla obligatoria con mínimo 15 trabajos de los últimos 5 años:

| Ref | Año | Tipo de solución | Técnica/Tecnología | Dataset/Contexto | Métrica principal | Limitación reportada |
| --- | --- | --- | --- | --- | --- | --- |
| [1] | 2022 | App ML | CNN | CIFAR-10 | Acc: 94% | Solo imágenes estáticas |

**2.3 Análisis comparativo de gaps**

- Tabla o mapa de calor mostrando qué aspectos NO han sido abordados
- Posicionamiento explícito de la solución propuesta frente al estado del arte

**2.4 Justificación de la elección tecnológica**

- Por qué se eligió esta tecnología/stack y no otro
- Comparativa técnica de alternativas consideradas y descartadas

### SECCIÓN 3 — DISEÑO DE LA SOLUCIÓN TECNOLÓGICA

*(Sección central — equivale a Proposed Method / System Design)*

**3.1 Visión general de la arquitectura**

- Diagrama de arquitectura de alto nivel (obligatorio, exportable como figura vectorial)
- Descripción de cada componente y su responsabilidad

**3.2 Especificación de requerimientos técnicos**

*3.2.1 Requerimientos funcionales*

| ID | Requerimiento | Prioridad | Vinculado a objetivo |
| --- | --- | --- | --- |

*3.2.2 Requerimientos no funcionales*

- Rendimiento, escalabilidad, seguridad, usabilidad, portabilidad

**3.3 Modelado del sistema** *(según tipo de solución)*

Para **soluciones de software (web/móvil)**:

- Diagrama de casos de uso
- Diagrama de clases o entidad-relación
- Diagrama de secuencia de flujos críticos
- Modelo de base de datos (físico)
- Wireframes o mockups de alta fidelidad (mínimo 5 pantallas clave)

Para **modelos IA / ML / DL**:

- Pipeline completo de datos → preprocesamiento → modelo → salida
- Arquitectura del modelo con capas, parámetros y justificación de cada elección
- Función objetivo / función de pérdida con notación matemática
- Pseudocódigo del algoritmo principal

Para **soluciones IoT / Embebidas**:

- Diagrama de hardware (topología de sensores, actuadores, gateway)
- Esquema de comunicación (protocolo, frecuencia, latencia esperada)
- Modelo de datos del dispositivo

**3.4 Stack tecnológico justificado**

| Capa | Tecnología elegida | Versión | Justificación técnica | Alternativa descartada |
| --- | --- | --- | --- | --- |
| Frontend | React 18 | 18.2 | Rendimiento SPA, ecosistema | Vue 3 |
| Backend | FastAPI | 0.100 | Async nativo, tipado | Flask |

**3.5 Decisiones de diseño críticas**

- Mínimo 3 decisiones arquitectónicas documentadas como ADR (Architecture Decision Record) simplificado:
    - Decisión tomada
    - Contexto que la motivó
    - Alternativas evaluadas
    - Consecuencias asumidas

**3.6 Modelo de seguridad y privacidad**

- Mecanismos de autenticación, autorización, cifrado
- Consideraciones de privacidad de datos (especialmente si hay datos personales o sensibles)

### SECCIÓN 4 — DESARROLLO E IMPLEMENTACIÓN

*(Equivale a Implementation)*

**4.1 Metodología de desarrollo aplicada**

- Justificación de la metodología (Scrum, Kanban, DSR, prototipado, etc.)
- Sprints o iteraciones realizadas con entregables por fase

**4.2 Descripción técnica de módulos implementados**

Por cada módulo principal:

- Función técnica del módulo
- Fragmentos de código representativos y comentados *(máximo 20 líneas por fragmento)*
- Diagrama de flujo interno si aplica
- Decisiones de implementación no triviales

**4.3 Gestión de datos**

*4.3.1 Fuentes de datos*

- Origen, volumen, formato, licencia de uso

*4.3.2 Preprocesamiento*

- Pipeline de limpieza, transformación, normalización
- Estadísticas descriptivas del dataset (media, desviación, distribución, valores faltantes)

*4.3.3 Partición de datos (si aplica ML/DL)*

- Train / Validation / Test con proporciones y justificación
- Estrategia de muestreo (random, stratified, temporal, k-fold)

**4.4 Configuración del entorno de desarrollo y producción**

- Especificaciones de hardware usado
- Versiones exactas de dependencias (archivo requirements.txt / package.json referenciado)
- Estrategia de despliegue (local, cloud, edge, contenedores)

**4.5 Control de versiones y trazabilidad**

- Estrategia de branching (GitFlow u otra)
- Número de commits, PRs, releases documentadas

### SECCIÓN 5 — EVALUACIÓN Y VALIDACIÓN

*(equivale a Experiments & Results)*

**5.1 Estrategia de evaluación**

- ¿Qué se evalúa y por qué esas métricas?
- Tipo de validación: técnica, con usuarios, experimental comparativa

**5.2 Métricas de evaluación definidas**

Según tipo de solución:

*Para ML/DL:*

| Métrica | Fórmula | Justificación |
| --- | --- | --- |
| F1-Score | 2·(P·R)/(P+R) | Balance entre precisión y recall en clases desbalanceadas |

*Para aplicaciones web/móvil:*

- Tiempo de respuesta (p50, p90, p99)
- Throughput (req/seg)
- SUS score (System Usability Scale)
- Tasa de error, disponibilidad

*Para IoT:*

- Latencia end-to-end
- Consumo energético
- Tasa de pérdida de paquetes
- Precisión del sensor vs. referencia calibrada

**5.3 Diseño experimental**

- Descripción del ambiente de prueba (hardware, red, condiciones)
- Casos de prueba definidos (funcionales, de rendimiento, de estrés)
- Participantes si hay evaluación con usuarios (perfil, N, criterios de inclusión)

**5.4 Resultados obtenidos**

- Tablas de resultados con media ± desviación estándar
- Gráficas: curvas ROC, matrices de confusión, gráficas de convergencia, benchmarks, etc.
- Resultados por escenario/condición evaluada

**5.5 Comparación con línea base o estado del arte**

| Método | Métrica 1 | Métrica 2 | Fuente |
| --- | --- | --- | --- |
| Método propuesto | **94.3%** | **0.89** | Este trabajo |
| Método A [ref] | 91.2% | 0.85 | [12] |
| Método B [ref] | 89.7% | 0.82 | [8] |

**5.6 Análisis estadístico**

- Prueba de significancia (t-test, Wilcoxon, ANOVA según corresponda)
- Valor p y tamaño del efecto reportados
- Intervalos de confianza

**5.7 Discusión de resultados**

- Interpretación técnica de cada resultado
- ¿Por qué la solución supera/iguala/difiere de las alternativas?
- Casos donde la solución falla o tiene menor rendimiento y explicación técnica

### SECCIÓN 6 — DISCUSIÓN INTEGRADORA

**6.1 Respuesta a la pregunta de investigación**

- Respuesta directa, soportada en los resultados de la Sección 5

**6.2 Contribuciones técnicas verificadas**

- Lista de contribuciones demostradas con referencia a la evidencia

**6.3 Limitaciones del trabajo**

- Honestas y técnicamente fundamentadas
- No disfrazadas como trabajo futuro

**6.4 Amenazas a la validez**

- Validez interna, externa, de constructo y estadística

**6.5 Trabajo futuro**

- Mínimo 3 líneas concretas y técnicamente justificadas

### SECCIÓN 7 — CONCLUSIONES

- Resumen de la solución desarrollada
- Resultados clave con cifras exactas
- Impacto potencial en el dominio de aplicación
- Declaración sobre reproducibilidad (código/datos disponibles)

### SECCIÓN 8 — REFERENCIAS

- Mínimo 20 referencias
- Mínimo 70% de los últimos 5 años
- Mínimo 60% en revistas Q1/Q2 (IEEE, Elsevier, Springer, ACM)
- Formato IEEE o APA 7 según el journal objetivo
- Sin referencias a blogs, Wikipedia o páginas sin peer review

### SECCIÓN 9 — ANEXOS TÉCNICOS *(obligatorios)*

| Anexo | Contenido |
| --- | --- |
| A | Diagrama de arquitectura completo en alta resolución |
| B | Especificación completa de la API (endpoints, parámetros, respuestas) |
| C | Diccionario de datos / esquema de base de datos |
| D | Manual de instalación y reproducibilidad |
| E | Dataset o enlace de acceso con descripción |
| F | Resultados completos de pruebas (incluyendo los negativos) |
| G | Consentimiento informado si hubo participantes humanos |

### 📋 Checklist

Antes de entregar, el estudiante autoevalúa con esta rúbrica:

| Criterio | Insuficiente (0) | Aceptable (1) | Sólido (2) |
| --- | --- | --- | --- |
| Problema con evidencia cuantitativa | Descripción vaga | Datos citados sin fuente primaria | Datos con fuente y análisis |
| Gap tecnológico explícito | No identificado | Mencionado vagamente | Tabla comparativa con literatura |
| Arquitectura documentada | Solo descripción | Diagrama básico | Diagrama + ADRs justificados |
| Stack justificado técnicamente | Solo listado | Con razones generales | Comparativa con alternativas |
| Métricas apropiadas al tipo de solución | Métricas genéricas | 2–3 métricas estándar | ≥4 métricas con justificación estadística |
| Comparación con estado del arte | Ausente | 1 trabajo comparado | Tabla ≥5 trabajos con análisis |
| Análisis estadístico | Ausente | Solo medias | Test de significancia + p-value |
| Reproducibilidad | Sin código ni datos | Código parcial | Repositorio + instrucciones completas |
| Referencias Q1 (≥60%) | <40% | 40–60% | >60% |
| Limitaciones y amenazas | Ausentes | Superficiales | Detalladas y honestas |