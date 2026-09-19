import { PROVIDER_META } from "@/core/components/platform-key-meta";
import { cn } from "@/core/lib/cn";

export function UserKeyRowHeader({
  provider,
  configured,
}: Readonly<{ provider: string; configured: boolean }>) {
  const meta = PROVIDER_META[provider] ?? {
    label: provider,
    placeholder: "...",
    desc: "Proveedor",
    compat: false,
  };
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold">{meta.label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{meta.desc}</p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase",
          configured
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
            : "bg-muted text-muted-foreground",
        )}
      >
        {configured ? "Conectado" : "Sin configurar"}
      </span>
    </div>
  );
}
