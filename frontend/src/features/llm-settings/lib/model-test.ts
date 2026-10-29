import i18n, { t } from "i18next";

import type { ModelTestResult } from "../api/model-tools.api";

/** Qué pasó y qué hacer, para cada código de «Probar». */
export interface TestOutcome {
  tone: "success" | "error" | "warning";
  title: string;
  /** Qué hacer para arreglarlo (vacío si respondió). */
  hint: string;
}

const OUTCOME_TONES: Record<string, "success" | "error" | "warning"> = {
  empty: "warning",
  invalid_key: "error",
  model_not_found: "error",
  no_credit: "error",
  no_key: "error",
  not_testable: "warning",
  rate_limited: "warning",
  timeout: "warning",
  unreachable: "warning",
};

export function modelTestOutcome(result: ModelTestResult): TestOutcome {
  if (result.ok) {
    const title = result.image
      ? t("llm-settings:testOutcome.successImages")
      : t("llm-settings:testOutcome.successResponds");
    return { tone: "success", title, hint: "" };
  }
  const tone = OUTCOME_TONES[result.code] ?? "error";
  const keyBase = `llm-settings:testOutcome.${result.code}`;
  if (i18n.exists(`${keyBase}.title`)) {
    return {
      tone,
      title: t(`${keyBase}.title`),
      hint: t(`${keyBase}.hint`),
    };
  }
  return {
    tone: "error",
    title: t("llm-settings:testOutcome.unknown.title"),
    hint: t("llm-settings:testOutcome.unknown.hint"),
  };
}

/** «812 ms» o «2,4 s». */
export function formatLatency(ms: number | null): string | null {
  if (ms === null) return null;
  if (ms < 1000) return `${String(Math.round(ms))} ms`;
  const locale = i18n.language === "en" ? "en" : "es";
  return `${(ms / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })} s`;
}

export function keySourceText(source: ModelTestResult["key_source"]): string | null {
  switch (source) {
    case "platform":
      return t("llm-settings:testOutcome.keySourcePlatform");
    case "server":
      return t("llm-settings:testOutcome.keySourceServer");
    case "own":
      return t("llm-settings:testOutcome.keySourceOwn");
    default:
      return null;
  }
}
