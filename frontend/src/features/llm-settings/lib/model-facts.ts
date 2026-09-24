/**
 * Lo que importa para elegir un modelo, leído del catálogo: precio de entrada y
 * de salida, contexto, si es gratis y qué sabe hacer además de texto.
 *
 * Lógica pura: se prueba en model-facts.spec.ts.
 */

export interface RichModel {
  provider: string;
  model_id: string;
  label?: string;
  pricing?: string | null;
  pricing_detail?: { input?: number | null; output?: number | null } | null;
  context_length?: number | null;
  modality?: string | null;
  category?: string | null;
  curated?: boolean;
  description?: string | null;
}

export type Capability = "vision" | "reasoning" | "code";

export interface ModelFacts {
  free: boolean;
  /** Precio desconocido de antemano (enrutadores como Auto Router). */
  variable: boolean;
  /** USD por millón de tokens; `null` si el catálogo no lo dice. */
  input: number | null;
  output: number | null;
  context: number | null;
  capabilities: Capability[];
  recommended: boolean;
}

export const CAPABILITY_LABELS: Record<Capability, string> = {
  vision: "Visión",
  reasoning: "Razonamiento",
  code: "Código",
};

export const CAPABILITY_HINTS: Record<Capability, string> = {
  vision: "Entiende imágenes además de texto",
  reasoning: "Piensa paso a paso antes de responder",
  code: "Especializado en programar",
};

export const CAPABILITY_ICONS: Record<Capability, string> = {
  vision: "eye",
  reasoning: "brain",
  code: "code",
};

/** Por debajo de esto (salida, USD por millón de tokens) un modelo cuenta como económico. */
export const CHEAP_OUTPUT_MAX = 1;

function num(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function positive(value: number | null): number | null {
  return value !== null && value > 0 ? value : null;
}

/** Tipos que acepta el modelo de entrada («text+image->text» → text, image). */
function inputKinds(modality: string | null | undefined): Set<string> {
  const input = (modality ?? "").split("->")[0] ?? "";
  return new Set(
    input
      .split("+")
      .map((token) => token.trim())
      .filter(Boolean),
  );
}

function capabilitiesOf(model: RichModel): Capability[] {
  const caps: Capability[] = [];
  if (inputKinds(model.modality).has("image")) caps.push("vision");
  if (model.category === "razonamiento") caps.push("reasoning");
  if (model.category === "codigo") caps.push("code");
  return caps;
}

/**
 * Proveedores con plan gratuito cuyo catálogo no trae precio: sin dato de
 * precio, sus modelos cuentan como gratis (así lo mostraba ya el catálogo).
 */
const FREE_TIER_PROVIDERS = new Set(["groq", "huggingface"]);

function isFree(model: RichModel, input: number | null, output: number | null): boolean {
  if (model.pricing === "Gratuito" || (input === 0 && output === 0)) return true;
  return !model.pricing && !model.pricing_detail && FREE_TIER_PROVIDERS.has(model.provider);
}

export function modelFacts(model: RichModel): ModelFacts {
  const input = num(model.pricing_detail?.input);
  const output = num(model.pricing_detail?.output);
  const free = isFree(model, input, output);
  return {
    free,
    variable: model.pricing === "Variable",
    input,
    output,
    context: positive(num(model.context_length)),
    capabilities: capabilitiesOf(model),
    recommended: model.curated === true,
  };
}

export function isCheap(facts: ModelFacts): boolean {
  return facts.free || (facts.output !== null && facts.output <= CHEAP_OUTPUT_MAX);
}

/** «$0.09», «$2.00», «$0.0042»: dos decimales para que las columnas cuadren, sin perder los precios muy bajos. */
export function formatUsd(value: number): string {
  if (value === 0) return "$0";
  if (value < 0.01) return `$${String(Number(value.toPrecision(2)))}`;
  return `$${value.toFixed(2)}`;
}

/** Contexto en tokens, corto: «164k», «1M», «1.5M». */
export function formatContext(tokens: number | null): string | null {
  if (tokens === null || tokens <= 0) return null;
  if (tokens >= 1_000_000) {
    const millions = Math.round(tokens / 100_000) / 10;
    return `${String(millions)}M`;
  }
  if (tokens >= 1000) return `${String(Math.round(tokens / 1000))}k`;
  return String(tokens);
}

/** Precio compacto para listas: «$0.09 / $0.18», «Gratis», «Variable» o `null`. */
export function priceSummary(facts: ModelFacts): string | null {
  if (facts.free) return "Gratis";
  if (facts.variable) return "Variable";
  if (facts.input === null && facts.output === null) return null;
  const input = facts.input === null ? "?" : formatUsd(facts.input);
  const output = facts.output === null ? "?" : formatUsd(facts.output);
  return `${input} / ${output}`;
}

/** Lo mismo, dicho entero para lectores de pantalla y títulos. */
export function priceDescription(facts: ModelFacts): string {
  if (facts.free) return "Gratis";
  if (facts.variable) return "Precio variable según el modelo que elija el enrutador";
  if (facts.input === null && facts.output === null) return "Precio no disponible";
  const input = facts.input === null ? "desconocida" : formatUsd(facts.input);
  const output = facts.output === null ? "desconocida" : formatUsd(facts.output);
  return `Entrada ${input}, salida ${output} por millón de tokens`;
}

/** Quita comas, puntos y espacios del final antes de poner «…». */
function trimPunctuation(text: string): string {
  let end = text.length;
  while (end > 0 && ",;:. ".includes(text[end - 1])) end--;
  return text.slice(0, end);
}

/** Primera frase de al menos 20 caracteres (un punto seguido de espacio; «V3.1» no corta). */
function firstSentence(text: string): string | null {
  for (let i = 19; i < text.length - 1; i++) {
    if (".!?".includes(text[i]) && text[i + 1] === " ") return text.slice(0, i + 1);
  }
  return null;
}

/**
 * Las descripciones del catálogo llegan en inglés y cortadas a 200 caracteres
 * a media palabra. Se queda la primera frase, o se corta limpio en una palabra.
 */
export function shortDescription(text: string | null | undefined, max = 140): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (clean === "") return "";
  const sentence = firstSentence(clean);
  if (sentence && sentence.length <= max) return sentence;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${trimPunctuation(space > max / 2 ? cut.slice(0, space) : cut)}…`;
}

/** El modelo del catálogo con ese proveedor e id, o lo mínimo para nombrarlo si no está. */
export function findModel(
  models: readonly RichModel[],
  provider: string,
  modelId: string,
): RichModel {
  return (
    models.find((model) => model.provider === provider && model.model_id === modelId) ?? {
      provider,
      model_id: modelId,
    }
  );
}
