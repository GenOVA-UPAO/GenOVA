import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

interface Props {
  describeDone: boolean;
  resourcesDone: boolean;
  generateReady: boolean;
  onTour: () => void;
}

const ITEM = "flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center";

/** Círculo numerado del paso: primario cuando está cumplido, pulsante si pulsa. */
function circleClass(active: boolean, pulse = false): string {
  const base = "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold shadow-sm transition-colors";
  if (pulse) return `${base} border-primary bg-primary text-primary-foreground animate-pulse`;
  if (active) return `${base} border-primary bg-primary/10 text-primary`;
  return `${base} border-border bg-muted/50 text-muted-foreground`;
}

function labelClass(active: boolean, pulse = false): string {
  if (pulse) return "text-xs font-semibold text-primary animate-pulse";
  if (active) return "text-xs font-medium text-foreground";
  return "text-xs font-medium text-muted-foreground";
}

function lineClass(active: boolean): string {
  return active ? "mb-5 h-px w-6 shrink-0 bg-primary/50 sm:w-10" : "mb-5 h-px w-6 shrink-0 bg-border sm:w-10";
}

export function CreationSteps({ describeDone, resourcesDone, generateReady, onTour }: Readonly<Props>) {
  return (
    <div className="relative px-1 pt-1">
      <ol aria-label="Pasos para crear un OVA" className="mx-auto flex w-full max-w-md items-center justify-center sm:max-w-lg">
        <li className="flex min-w-0 flex-1 items-center" aria-current={describeDone && !resourcesDone ? "step" : undefined}>
          <div className={ITEM}>
            <span className={circleClass(describeDone)} aria-hidden="true">1</span>
            <span className={labelClass(describeDone)}>1. Describe</span>
          </div>
          <span className={lineClass(describeDone)} aria-hidden="true" />
        </li>
        <li className="flex min-w-0 flex-1 items-center" aria-current={resourcesDone && !generateReady ? "step" : undefined}>
          <div className={ITEM}>
            <span className={circleClass(resourcesDone)} aria-hidden="true">2</span>
            <span className={labelClass(resourcesDone)}>2. Elige recursos</span>
          </div>
          <span className={lineClass(resourcesDone)} aria-hidden="true" />
        </li>
        <li className={ITEM} aria-current={generateReady ? "step" : undefined}>
          <span className={circleClass(generateReady, generateReady)} aria-hidden="true">3</span>
          <span className={labelClass(generateReady, generateReady)}>3. Genera</span>
        </li>
      </ol>
      <Button
        className="absolute top-0 right-0"
        variant="ghost"
        size="icon-sm"
        aria-label="Ver tutorial"
        title="Ver tutorial"
        onClick={onTour}
      >
        <Icon name="question" />
      </Button>
    </div>
  );
}
