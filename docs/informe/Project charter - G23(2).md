**CARTA DEL PROYECTO – Taller Integrador 1**  
INFORMACIÓN GENERAL DEL PROYECTO

| NOMBRE DEL PROYECTO |  | GERENTE DE PROYECTO |  | PATROCINADOR DEL PROYECTO |
| ----- | :---: | :---: | :---: | :---: |
| Desarrollo de una Aplicación Web basada en Agentes Multimodales para la creación de OVAs en el curso de Machine Learning en UPAO 2026 |  | Walter Manuel Cueva Chávez |  |  |
| MIEMBROS | ROL | TELÉFONO                                                CORREO |  |  |
| Carranza Jacinto, Juan Diego | Project Manager |  987285992 | jcarranzaj2@upao.edu.pe |  |
| Romero Uriol, Jeffry Anderson | Scrum Master | 927760122 | jromerou2@upao.edu.pe |  |

VISIÓN GENERAL DEL PROYECTO

| PROBLEMA  O PROBLEMA GENERAL | Actualmente, la creación de Objetos Virtuales de Aprendizaje (OVAs) para Machine Learning consume altos recursos y requiere conocimientos pedagógicos avanzados. Las soluciones existentes no aprovechan la IA como agentes autónomos multimodales, poseen interfaces complejas y usualmente no logran estructurar el contenido bajo metodologías pedagógicas comprobadas, lo que afecta severamente la Usabilidad y Experiencia de Usuario (UX), generando frustración al no poder integrarse fácilmente mediante estándares SCORM. |
| :---- | :---- |
| PROPÓSITO  DEL PROYECTO | Desarrollar una aplicación web escalable, mediante la metodología de software Spec-Driven Development, que orqueste agentes multimodales, los cuales serán creados bajo la metodología de desarrollo de agentes Prometheus para la creación automatizada de OVAs. El contenido de estos OVAs se estructurará pedagógicamente bajo el modelo 5E, con el fin último de evaluar la Usabilidad y UX de la herramienta en los estudiantes y docentes, garantizando un funcionamiento fluido en hardware limitado, alta disponibilidad y un entorno seguro para los estudiantes y/o docentes. |
| NEGOCIO  CASO | La implementación de esta aplicación web democratizará el acceso a la creación de contenido interactivo en la UPAO. Al derivar la carga de procesamiento a APIs externas y estandarizar la exportación a SCORM mediante agentes, se optimizará el tiempo técnico de los usuarios y se reducirán las barreras de uso. Medir la Usabilidad garantizará que la herramienta sea adoptada exitosamente en el entorno de la UPAO. |
| OBJETIVOS / MÉTRICAS | OG: Desarrollar y desplegar una aplicación web asistida por IAG multimodal para el curso de Machine Learning, alcanzando una precisión de contenido superior al 88.67% (Métrica de Precisión/Accuracy (88.67%)), con una latencia de 278 ms y un resultado con la herramienta SUS de 90/100 puntos en 2 sprints. OE1 (Sprint 1 \- Solución Tecnológica): Desarrollar la arquitectura base y la interfaz de la aplicación web utilizando la metodología Spec-driven development. Métrica de Rendimiento: Alcanzar una latencia máxima de 278 ms en el tiempo de respuesta promedio de las peticiones del cliente al servidor. OE2 (Sprint 2 \- Agentes e Integración): Integrar agentes multimodales (vía APIs) bajo la metodología Prometheus para generar objetos virtuales de aprendizaje (OVAs) bajo la metodología pedagógica 5E y empaquetarlos bajo el estándar SCORM para integración con LMS, además, se desarrollará un RAG con una base de datos vectorial. Métrica de Calidad de IA: Alcanzar una precisión de contenido (Accuracy) superior al 88.67% en los textos y recursos generados para el curso de Machine Learning, validada mediante la comparación del contenido generado con el de un RAG. Completitud Estructural Pedagógica: El 100% de los OVAs generados deben contener los 5 módulos estructurales completos (Enganchar, Explorar, Explicar, Elaborar, Evaluar) sin interrupciones en el texto o código a medias. Tiempo de Generación (Mean Time to Generate \- MTTG): Tiempo máximo de generación del paquete SCORM completo inferior a 180 segundos (o el tiempo que se considere viable según los LLMs que se usen) desde que se envía el prompt inicial en tu interfaz web. Tasa de Conformidad de Manifiesto (SCORM Conformance Rate): La estructura interna del paquete generado por la aplicación web debe ser validada  según el estándar SCORM 1.2 o 2004\. Teniendo como objetivo el 100% de validación exitosa (cero errores críticos) al pasar el paquete por la herramienta oficial de pruebas SCORM Cloud Rustici (o el validador ADL) OE3 (Tesis \- Evaluación UX): Evaluar la Usabilidad y Experiencia de Usuario (Variable Dependiente) tras el uso de la aplicación. Métrica de Usabilidad: Obtener un resultado igual o superior a 90/100 puntos en la aplicación del cuestionario estandarizado System Usability Scale (SUS) a los usuarios finales. |
| ENTREGABLES ESPERADOS | Código fuente de la Aplicación Web y especificaciones técnicas (Spec-driven) alojadas en GitHub. Endpoints documentados y operando con las APIs de los agentes multimodales. Módulo de empaquetado de archivos en estándar SCORM. Informe estadístico de los resultados de Usabilidad / UX. Documentación técnica (Arquitectura y despliegue). Código fuente del Backend (Python/Node), endpoints documentados conectando con IAG Multimodal (ej. Gemini/OpenAI) y reporte de pruebas de latencia.  OVAs generados de prueba y validados en el entorno de Canvas. Informe de pruebas técnicas (Tiempos, Errores y Compatibilidad). Informe de comparativa de agentes con diferentes modelos de IAG. |

ALCANCE DEL PROYECTO

| DENTRO  ALCANCE | \- Integración de una arquitectura de Agentes Multimodales mediante el consumo de APIs externas (Ej. OpenAI/Gemini) \- Desarrollo del motor de exportación para empaquetar el OVA final en estándar SCORM \- Desarrollo de interfaz web de usuario (Frontend) \- Integración de la interfaz web con los agentes multimodales \- Despliegue del sistema (Frontend y Backend) \- Desarrollo de un RAG \- Integración de una base de datos vectorial |
| :---- | :---- |
| AFUERA  DE ALCANCE | \- Desarrollo y entrenamiento interno desde cero de un modelo fundacional de IA o agentes propios (se usarán APIs). \- Evaluación profunda de la "Calidad Pedagógica" o "Calidad Técnica de Ingeniería del Código" mediante auditorías, ya que la variable dependiente se ajustó hacia la Usabilidad. \- Despliegue masivo en servidores físicos locales (operará en entorno Cloud/Web). \- Integración nativa e interna dentro de los servidores físicos del LMS Canvas (operará como herramienta externa/interoperable). \- Provisión de hardware o conectividad a internet para los usuarios finales. \- La aplicación no será subida a tiendas de aplicaciones móviles; su acceso es estrictamente web. \- No se contempla el escalado del servidor para soportar tráfico masivo (superior a los 60 estudiantes concurrentes de una clase regular). \- No se contempla la implementación de un clúster de base de datos vectorial a escala empresarial para almacenar millones de registros |

CALENDARIO

| HITO CLAVE |  | INICIO | FINAL |
| :---- | :---- | :---: | :---: |
| Semana 4: Sprint 1 Desarrollo Inicial | 1.1. Descubrimiento y Definición de Requisitos (Product Backlog). | 27/04/2026 | 03/05/2026 |
|  | 1.2. Formulación de Especificaciones en Gherkin (Dado-Cuando-Entonces). |  |  |
| Semana 5: Sprint 1 Iteración sobre el Prototipo | 1.3. Configuración de Pruebas Automatizadas (Step definitions). | 04/05/2026 | 10/05/2026 |
|  | 1.4. Implementación del Sistema (Componentes visuales). |  |  |
| Semana 6: Sprint 1  Revisión | 1.5. Refactorización y Validación de Interfaz (Comprobación de estructura base y navegación). | 11/05/2026 | 17/05/2026 |
|  |  |  |  |
| Semana 7: Sprint 1 Retrospectiva | Evaluación de flujos de usuario, revisión de la operabilidad del BDD y ajustes post-validación de la plataforma web funcional. | 18/05/2026 | 24/05/2026 |
|  |  |  |  |
| Semana 8: Sprint 2 Desarrollo Inicial | 2.1. Implementación del motor RAG |  |  |
|  | 2.2. Especificación del Sistema (Fase 1 Prometheus: metas globales y escenarios de uso). | 25/05/2026 | 31/05/2026 |
|  | 2.3. Diseño Arquitectónico (Fase 2 Prometheus: tipos de agentes y protocolos de comunicación). |  |  |
| Semana 9: Sprint 2 Iteración sobre el Prototipo | 2.4. Diseño Detallado (Fase 3 Prometheus: percepciones, patrones, lógica de decisión). | 01/06/2026 | 07/06/2026 |
|  | 2.5. Implementación y Pruebas Unitarias de Agentes en el backend. |  |  |
| Semana 10: Sprint 2 Revisión | 2.6. Integración, Pruebas de Usabilidad Final y creación del empaquetador de OVAs (Conexión del sistema multiagente con la web y generación de OVAs). | 08/06/2026 | 14/06/2026 |
|  |  |  |  |
| Semana 11: Sprint 2 Retrospectiva | Medición de métricas conjuntas, análisis del impacto en usabilidad y consolidación del sistema multiagente para su validación final. | 15/06/2026 | 21/06/2026 |
| Semana 12: Sprint 3 Validación Técnica | 3.1. Ejecución de pruebas de rendimiento del sistema multiagente (latencia y precisión). | 22/06/2026 | 28/06/2026 |
|  | 3.2. Validación de la calidad técnica de los Objetos Virtuales de Aprendizaje (OVAs) generados. |  |  |
| Semana 13: Sprint 3Pruebas de Usuario | 3.3. Evaluación de usabilidad con estudiantes y docentes de Machine Learning de la UPAO. | 29/06/2026 | 05/07/2026 |
|  | 3.4. Recolección de feedback sobre la efectividad pedagógica de la plataforma. |  |  |
| Semana 14: Sprint 3Documentación y Material Multimedia | 3.5. Elaboración de manuales técnicos y de usuario. | 06/07/2026 | 12/07/2026 |
|  | 3.6. Producción de videos demostrativos del funcionamiento de la IA y la interfaz en Angular. |  |  |
| Semana 15: Sprint 3Cierre y Presentación Final | 3.7. Consolidación del informe final de investigación y resultados de las pruebas. | 13/07/2026 | 19/07/2026 |
|  | 3.8. Preparación y ejecución de la defensa/presentación final del proyecto. |  |  |

RECURSOS

| EQUIPO DEL PROYECTO |  2 Desarrolladores (Project Manager y Scrum Master). |
| :---- | :---- |
| RECURSOS DE SOPORTE | Asesor técnico (Walter Manuel Cueva Chávez) Plataformas de control de versiones (GitHub/GitLab). |
| NECESIDADES ESPECIALES | Acceso a APIs de modelos LLM (OpenAI, Gemini, etc.) Servicios de Cloud Computing (AWS, Azure o Google Cloud) para probar la orquestación y disponibilidad Entorno de desarrollo (VSCode o  Zen) Servicio de base de datos vectorial (pgvector o Pinecone) |

COSTOS

| TIPO DE COSTO | NOMBRES DE PROVEEDORES / TRABAJADORES |  | PRECIO UNITARIO | CANTIDAD | IMPORTE |
| :---- | :---- | :---- | ----- | :---: | :---: |
| **Servicio** | Hosting / Cloud Computing (Despliegue 24/7) |  | S/. 25.00 | 4 (meses) | S/. 100.00 |
| **Servicio** | RAG \+ BD Vectorial (PGVector) |  | S/. 0 | 4 (meses) | S/. 0 |
| **Servicio** | Dominio Web |  | S/. 15.00 | 1 (anual) | S/. 15.00 |
| **Servicio** | Acceso API de modelo LLM (IAG) |  | S/. 50.00 | 4 (meses) | S/. 200.00 |
| **Trabajo** | Horas hombre \- Desarrollo de Software |  | S/. 0 | 320 (horas estimadas) | S/. 0 |
| **Equipo** | Laptops (de los tesistas) |  | S/. 2,200.00 | 2 (equipos) | S/. 4,400.00 |
|  |  |   | COSTOS TOTALES |  |  S/. 11,115.00 |

BENEFICIOS Y CLIENTES

| PROPIETARIO DEL PROCESO | Escuela Profesional de Ingeniería de Sistemas e Inteligencia Artificial (UPAO). |
| :---- | :---- |
| PRINCIPALES PARTES INTERESADAS | \- Docentes del curso de Machine Learning \- Estudiantes del curso de Machine Learning. |
| CLIENTE FINAL | \- Estudiantes del 8vo ciclo (aprox.) cursando la asignatura de Machine Learning.\- Estudiantes de la muestra estimada (60 estudiantes aprox.) cursando la asignatura de Machine Learning. |
| BENEFICIOS ESPERADOS | \- Estabilidad del sistema durante horas pico de uso \- Capacidad de estudiar en cualquier equipo informático \- Seguridad en el manejo de credenciales universitarias. \- Alta disponibilidad del sistema en horarios pico \- Accesibilidad multiplataforma \- Protección rigurosa de la identidad digital estudiantil. |

| TIPO DE PRESTACIÓN | BASE DE ESTIMACIÓN |  |  | MONTO ESTIMADO DEL BENEFICIO |
| :---- | :---- | :---- | ----: | ----- |
| **Ahorro de costes específicos** | Ahorro en licenciamiento de plataformas comerciales de laboratorios virtuales de Machine Learning para 50 alumnos (S/. 100 por licencia). |  |  | S/. 5,000.00 |
| **Ingresos mejorados** | Al ser un proyecto netamente académico para uso interno en la universidad, no genera ingresos directos por ventas. |  |  | S/. 0.00 |
| **Mayor productividad (suave)** | Reducción de 15 horas mensuales del docente en diseño de material durante 4 meses. (60 horas totales x S/. 50/hora docente). |  |  | S/. 3,000.00 |
| **Cumplimiento mejorado** | Ahorro en horas de soporte técnico del área de TI al no tener que instalar/mantener software pesado en los laboratorios físicos. |  |  | S/. 800.00 |
| **Mejor toma de decisiones** | Identificación temprana de alumnos en riesgo gracias a la data de los OVAs, previniendo la deserción de al menos 1 alumno (costo de pensión ciclo). |  |  | S/. 2,500.00 |
| **Menos mantenimiento** | Menor desgaste y mantenimiento de las computadoras de laboratorio al derivar la carga de procesamiento (RAM/GPU) a la nube. |  |  | S/. 1,000.00 |
| **Otros costos evitados** | Eliminación de costos de impresión para guías de laboratorio o manuales físicos de programación. |  |  | S/. 200.00 |
|   |   |   | BENEFICIO TOTAL | S/. 12,500.00 |

RIESGOS, LIMITACIONES Y SUPUESTOS

| RIESGOS | Latencia de APIs: Caídas o tiempos de respuesta altos en la API del proveedor del LLM afectando el rendimiento. Sobrecarga del servidor: Picos de uso inesperados que superen la escalabilidad configurada inicialmente. Vulnerabilidades: Exposición accidental de API Keys o ataques de inyección de prompts. |
| :---- | :---- |
| RESTRICCIONES | Presupuesto limitado para costear servidores Cloud de muy altas prestaciones. Límite de "tokens" en las APIs de IAG según el plan contratado. Presupuesto para comprar una base vectorial alojada en la nube de alta capacidad. |
| SUPOSICIONES | Se asume que los modelos base de IAG mantendrán su estabilidad durante todo el ciclo 2026\. El entorno tecnológico Canvas y la conectividad en el campus se mantendrán estables durante el estudio. Se asume que los archivos subidos por los alumnos no serán demasiados pesados para la carga del sistema. |

| PREPARADO POR | TÍTULO | FECHA |
| ----- | ----- | :---: |
| \- Carranza Jacinto, Juan Diego \- Romero Uriol, Jeffry Anderson | Desarrollo de una Aplicación Web basada en Agentes Multimodales para la creación de OVAs en el curso de Machine Learning en UPAO 2026 |  06/04/2026 |

