import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import type { ModelTestResult } from "../api/model-tools.api";
import { formatLatency, keySourceText, modelTestOutcome } from "../lib/model-test";
import { TONE_STYLE } from "./model-test-tone";

interface ModelTestResultViewProps {
  running: boolean;
  result: ModelTestResult | null;
  /** La petición misma falló (sin permiso, límite de pruebas, sin red). */
  error: string | null;
  onRetry: () => void;
}

/** Contenido del globo de «Probar»: qué respondió el modelo o qué falló y qué hacer. */
export function ModelTestResultView({
  running,
  result,
  error,
  onRetry,
}: Readonly<ModelTestResultViewProps>) {
  const { t } = useTranslation("llm-settings");
  let view: ReactNode = null;
  if (running) view = runningView(t);
  else if (error) view = errorView(error, onRetry, t);
  else if (result) view = outcome(result, onRetry, t);
  return (
    <div role="status" aria-live="polite" className="space-y-3 text-sm">
      {view}
    </div>
  );
}

function runningView(t: (key: string) => string): ReactNode {
  return (
    <p className="flex items-center gap-2 text-muted-foreground">
      <Icon name="spinner" size="text-base" className="animate-spin motion-reduce:animate-none" />
      {t("test.sendingShortRequest")}
    </p>
  );
}

function errorView(error: string, onRetry: () => void, t: (key: string) => string): ReactNode {
  return (
    <>
      <p className="flex items-start gap-2">
        <Icon name="warning" size="text-base" className="mt-0.5 shrink-0 text-accent-brand" />
        <span className="text-foreground">{error}</span>
      </p>
      {retryButton(onRetry, t)}
    </>
  );
}

function outcome(result: ModelTestResult, onRetry: () => void, t: (key: string, opts?: Record<string, unknown>) => string): ReactNode {
  const { tone, title, hint } = modelTestOutcome(result);
  const style = TONE_STYLE[tone];
  const latency = formatLatency(result.latency_ms);
  return (
    <>
      <p className="flex items-start gap-2">
        <Icon name={style.icon} size="text-base" className={`mt-0.5 shrink-0 ${style.className}`} />
        <span className="font-medium text-foreground">{headline(result.ok, title, latency, t)}</span>
      </p>
      {result.ok && result.image ? (
        <img
          src={result.image}
          alt={t("test.sampleImageAlt")}
          width={128}
          height={128}
          loading="lazy"
          className="size-32 rounded-lg border border-border object-cover"
        />
      ) : null}
      {result.ok && result.excerpt ? (
        <blockquote className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-[0.8125rem] break-words text-foreground">
          {result.excerpt}
        </blockquote>
      ) : null}
      {hint ? <p className="text-muted-foreground">{hint}</p> : null}
      <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{footnote(result, t)}</p>
      {result.ok ? null : retryButton(onRetry, t)}
    </>
  );
}

/** «Responde en 812 ms», «Genera imágenes en 6,1 s» o «Clave no válida (tras 180 ms)». */
function headline(ok: boolean, title: string, latency: string | null, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (ok) return latency ? t("test.okLatency", { title, latency }) : title;
  return latency ? t("test.failLatency", { title, latency }) : title;
}

/** Qué modelo y con qué clave se probó. */
function footnote(result: ModelTestResult, t: (key: string) => string): string {
  const parts = [`${result.model_id}.`, keySourceText(result.key_source)];
  if (result.simulated) parts.push(t("test.simulatedResponse"));
  return parts.filter(Boolean).join(" ");
}

function retryButton(onRetry: () => void, t: (key: string) => string): ReactNode {
  return (
    <Button variant="outline" size="sm" className="max-sm:h-11" onClick={onRetry}>
      <Icon name="arrow-clockwise" size="text-sm" />
      {t("test.retryTest")}
    </Button>
  );
}

