import i18n from "i18next";

/**
 * Nombres y descripciones de los nodos del motor para la pestaña Plataforma.
 * El backend los envía en jerga interna («re-genera con feedback si score
 * bajo», «data URIs») y con los nombres en inglés de las fases; aquí se dicen
 * en el idioma de un docente. Un nodo nuevo sin entrada usa el texto del backend.
 */
export function withNodeCopy<T extends { id: string; name: string; description?: string }>(node: T): T {
  const nameKey = `llm-settings:nodes.${node.id}.name`;
  const descKey = `llm-settings:nodes.${node.id}.description`;
  if (i18n.exists(nameKey)) {
    return {
      ...node,
      name: i18n.t(nameKey),
      description: i18n.exists(descKey) ? i18n.t(descKey) : node.description,
    };
  }
  return node;
}
