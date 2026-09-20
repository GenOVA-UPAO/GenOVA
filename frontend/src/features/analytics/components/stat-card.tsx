import { Icon } from "@/core/components/icon";

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
}

const STAT_ICONS: Record<string, string> = {
  stack: "stack",
  users: "users",
  "graduation-cap": "graduation-cap",
  "chart-bar": "chart-bar",
};

export function StatCard({ icon, label, value }: Readonly<StatCardProps>) {
  const iconName = STAT_ICONS[icon] ?? "squares-four";

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon name={iconName} size="text-xl" className="leading-none" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
