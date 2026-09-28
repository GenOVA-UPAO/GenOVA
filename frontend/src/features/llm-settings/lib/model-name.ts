import { firstNonBlank } from "@/core/lib/text";

/**
 * Nombre visible de un modelo. OpenRouter los nombra «Fabricante: Modelo» y
 * muchos repiten al fabricante («DeepSeek: DeepSeek V4.1 Flash»): en listas
 * estrechas el nombre real quedaba cortado. Solo se quita el prefijo cuando el
 * resto lo repite; «Meta: Llama 3.3» se queda como está.
 */
export function modelDisplayName(label: string | null | undefined, modelId: string): string {
  const name = firstNonBlank(label) ?? modelId;
  const colon = name.indexOf(": ");
  if (colon < 2) return name;
  const vendor = name.slice(0, colon).trim().toLowerCase();
  const rest = name.slice(colon + 2).trim();
  return rest.toLowerCase().startsWith(vendor) ? rest : name;
}
