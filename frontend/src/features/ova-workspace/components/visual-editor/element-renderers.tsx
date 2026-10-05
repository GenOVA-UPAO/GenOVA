import i18n, { type TFunction } from "i18next";

import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

import { InteractiveQuestion } from "./interactive-question";
import { InteractiveReveal } from "./interactive-reveal";

export function renderHeader(id: string, props: Record<string, unknown>) {
  const eyebrow = typeof props.eyebrow === "string" ? props.eyebrow : "";
  const title = typeof props.title === "string" ? props.title : "";
  const desc = typeof props.description === "string" ? props.description : "";

  return (
    <header key={id} className="border-b border-border/80 pb-4">
      {eyebrow && (
        <span className="inline-block rounded-xs bg-primary/10 px-2 py-0.5 text-xs font-bold tracking-wider text-primary uppercase">
          {eyebrow}
        </span>
      )}
      <h1 className="mt-1 font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h1>
      {desc && <p className="mt-2 text-sm text-muted-foreground">{desc}</p>}
    </header>
  );
}

export function renderParagraph(id: string, props: Record<string, unknown>) {
  const title = typeof props.title === "string" ? props.title : "";
  const text = typeof props.text === "string" ? props.text : "";
  const lead = Boolean(props.lead);

  if (title) {
    return (
      <div key={id} className="rounded-lg border border-border bg-background p-4 shadow-xs">
        <h2 className="font-heading text-base font-bold text-primary">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-foreground">{text}</p>
      </div>
    );
  }
  return (
    <p key={id} className={cn("text-sm leading-relaxed text-foreground", lead && "text-base font-medium")}>
      {text}
    </p>
  );
}

export function renderExample(id: string, props: Record<string, unknown>, t: TFunction = i18n.t) {
  const tag = typeof props.tag === "string" ? props.tag : t("workspace:ejemplo_razonado");
  const title = typeof props.title === "string" ? props.title : t("workspace:ejemplo");
  const content = typeof props.content === "string" ? props.content : "";

  return (
    <div key={id} className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2">
        <span className="rounded-xs bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary uppercase">
          {tag}
        </span>
        <strong className="text-sm font-semibold text-primary">{title}</strong>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-foreground">{content}</p>
    </div>
  );
}

export function renderQuestion(id: string, props: Record<string, unknown>) {
  const prompt = typeof props.prompt === "string" ? props.prompt : "";
  const explanation = typeof props.explanation === "string" ? props.explanation : undefined;
  const rawChoices = Array.isArray(props.choices) ? props.choices : [];
  const choices = rawChoices
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
    .map((c) => ({
      value: typeof c.value === "string" ? c.value : "",
      text: typeof c.text === "string" ? c.text : "",
      correct: Boolean(c.correct),
      feedback: typeof c.feedback === "string" ? c.feedback : undefined,
    }));

  return <InteractiveQuestion key={id} id={id} prompt={prompt} choices={choices} explanation={explanation} />;
}

export function renderReveal(id: string, props: Record<string, unknown>) {
  const label = typeof props.label === "string" ? props.label : undefined;
  const content = typeof props.content === "string" ? props.content : "";
  const prompt = typeof props.prompt === "string" ? props.prompt : undefined;
  return <InteractiveReveal key={id} id={id} label={label} content={content} prompt={prompt} />;
}

export function renderSummary(id: string, props: Record<string, unknown>, t: TFunction = i18n.t) {
  const title = typeof props.title === "string" ? props.title : t("workspace:sintesis_y_cierre");
  const text = typeof props.text === "string" ? props.text : "";

  return (
    <div key={id} className="rounded-lg border border-border bg-muted/40 p-4">
      <div className="flex items-center gap-2 font-semibold text-primary">
        <Icon name="check-circle" className="size-4" />
        <h3 className="font-heading text-sm font-bold uppercase">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-foreground">{text}</p>
    </div>
  );
}

export function renderComicPanel(id: string, props: Record<string, unknown>, t: TFunction = i18n.t) {
  const num = typeof props.number === "number" ? props.number : 1;
  const character = typeof props.character === "string" ? props.character : t("workspace:max");
  const dialogue = typeof props.dialogue === "string" ? props.dialogue : "";
  const imgUrl = typeof props.imageUrl === "string" ? props.imageUrl : undefined;
  const bubbleSide = props.bubbleSide === "right" ? "right" : "left";

  return (
    <div key={id} className="rounded-xl border border-border bg-card p-4 shadow-xs">
      <span className="rounded-xs bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-700 uppercase dark:text-amber-400">
        {t("workspace:vineta")} {num} · {character}
      </span>
      {imgUrl && (
        <div className="mt-3 overflow-hidden rounded-lg border border-border">
          <img src={imgUrl} alt={t("workspace:vineta_value", { p0: String(num) })} className="h-44 w-full object-cover" />
        </div>
      )}
      <div className={cn("mt-3 rounded-lg bg-muted/50 p-3 text-sm italic", bubbleSide === "right" ? "border-r-4 border-primary text-right" : "border-l-4 border-primary")}>
        «{dialogue}»
      </div>
    </div>
  );
}
