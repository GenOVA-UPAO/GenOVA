import { preview, type ResourcePreviewInfo } from "./preview-types";

export const ELABORATE_PREVIEWS: Record<string, ResourcePreviewInfo> = {
  "1": preview(
    "Estudio de Caso",
    "Caso real/narrado con análisis y propuesta de solución.",
    "HTML narrativo",
    ["Situación real", "Análisis guiado", "Propuesta de solución"],
    "read",
  ),
  "2": preview(
    "Ejercicio Guiado",
    "Ejercicio paso a paso con pistas y solución revelable.",
    "HTML + JS",
    ["Enunciado claro", "Pasos con pistas", "Solución al final"],
    "form",
  ),
  "3": preview(
    "Mini-Proyecto",
    "Reto de entrega corta aplicando el concepto.",
    "HTML + checklist",
    ["Objetivo del proyecto", "Entregables", "Criterios de éxito"],
    "form",
  ),
  "4": preview(
    "Simulación Aplicada",
    "Simulador de un escenario práctico del dominio.",
    "HTML + JS interactivo",
    ["Escenario realista", "Decisiones del usuario", "Resultado simulado"],
    "lab",
  ),
  "5": preview(
    "Análisis de Datos",
    "Dataset pequeño + preguntas de interpretación.",
    "HTML + tabla/gráfico",
    ["Datos de ejemplo", "Preguntas de análisis", "Conclusión esperada"],
    "lab",
  ),
  "6": preview(
    "Escenario Ramificado",
    "Historia con ramas según las decisiones del estudiante.",
    "HTML + decisiones",
    ["Nodos de decisión", "Caminos alternativos", "Cierre según ruta"],
    "game",
  ),
  "7": preview(
    "Lab de Código",
    "Editor/ejercicio de código con salida esperada.",
    "HTML + JS",
    ["Enunciado técnico", "Área de código", "Validación de salida"],
    "lab",
  ),
  "8": preview(
    "Mapa de Problemas",
    "Mapa para descomponer un problema en partes.",
    "HTML + nodos",
    ["Problema central", "Subproblemas", "Priorización"],
    "map",
  ),
  "9": preview(
    "Juego de Estrategia",
    "Juego de turnos/decisiones estratégicas sobre el tema.",
    "HTML + JS",
    ["Objetivo estratégico", "Turnos o jugadas", "Puntuación / resultado"],
    "game",
  ),
  "10": preview(
    "Reto de Diseño",
    "Brief de diseño con restricciones y rúbrica breve.",
    "HTML + formulario",
    ["Brief del reto", "Restricciones", "Espacio de propuesta"],
    "form",
  ),
};
