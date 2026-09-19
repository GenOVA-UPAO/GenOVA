import { cn } from "@/core/lib/cn";

interface RoleBadgeProps {
  name: string | undefined;
  className: string;
}

export function RoleBadge({ name, className }: Readonly<RoleBadgeProps>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wider capitalize shadow-sm",
        className,
      )}
    >
      {(name ?? "administrador").toLowerCase()}
    </span>
  );
}
