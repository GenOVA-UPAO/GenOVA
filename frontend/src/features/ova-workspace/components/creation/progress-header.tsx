import { Button } from "@/core/components/ui/button";

interface HeaderProps {
  headline: string;
  done: number;
  total: number;
  pct: number;
  eta: string | null;
  showCancel: boolean;
  onCancel: () => void;
}

export function ProgressHeader(props: Readonly<HeaderProps>) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">{props.headline}</span>
        <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
          {props.done} de {String(props.total)} listos
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full w-full origin-left rounded-full bg-primary transition-transform duration-500"
          style={{ transform: `scaleX(${String(props.pct / 100)})` }}
        />
      </div>
      {(props.eta !== null || props.showCancel) && (
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{props.eta}</span>
          {props.showCancel && (
          <Button
            variant="ghost"
            size="sm"
            className="-mr-2.5 text-muted-foreground max-sm:h-11"
            onClick={props.onCancel}
          >
            Cancelar generación
          </Button>
          )}
        </div>
      )}
    </div>
  );
}
