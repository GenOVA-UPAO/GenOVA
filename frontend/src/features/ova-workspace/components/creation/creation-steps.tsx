import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

interface Props {
  describeDone: boolean;
  resourcesDone: boolean;
  generateReady: boolean;
}

type StepState = "done" | "current" | "upcoming";

const STEPS = ["Describe", "Elige recursos", "Genera"] as const;

/** El paso actual es el primero sin cumplir; «Genera» pasa a actual cuando lo demás está listo. */
function stepStates(describeDone: boolean, resourcesDone: boolean): StepState[] {
  const done = [describeDone, resourcesDone, false];
  const current = done.findIndex((value) => !value);
  return done.map((value, index) => {
    if (value) return "done";
    return index === current ? "current" : "upcoming";
  });
}

function circleClass(state: StepState): string {
  const base = "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-200";
  if (state === "done") return cn(base, "border-primary bg-primary text-primary-foreground");
  if (state === "current") return cn(base, "border-primary bg-background text-primary ring-3 ring-primary/15");
  return cn(base, "border-border bg-background text-muted-foreground");
}

function stepMarker(state: StepState, index: number) {
  return (
    <span className={circleClass(state)} aria-hidden="true">
      {state === "done" ? <Icon name="check" weight="bold" className="size-3.5" /> : index + 1}
    </span>
  );
}

/** Progreso de la creación en tres pasos; el número vive solo en el círculo. */
export function CreationSteps({ describeDone, resourcesDone, generateReady }: Readonly<Props>) {
  const states = stepStates(describeDone, resourcesDone);
  return (
    <ol aria-label="Pasos para crear un OVA" className="flex items-center gap-2 sm:gap-3">
      {STEPS.map((label, index) => {
        const state = states[index];
        return (
          <li
            key={label}
            aria-current={state === "current" ? "step" : undefined}
            className="flex min-w-0 items-center gap-2 sm:gap-3 [&:not(:last-child)]:flex-1"
          >
            {stepMarker(state, index)}
            <span
              className={cn(
                "shrink-0 whitespace-nowrap text-sm",
                state === "upcoming" ? "text-muted-foreground" : "font-medium text-foreground",
                index === 2 && generateReady && "text-primary",
              )}
            >
              {label}
              {state === "done" && <span className="sr-only"> (completado)</span>}
            </span>
            {index < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={cn("h-px min-w-2 flex-1", state === "done" ? "bg-primary/50" : "bg-border")}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
