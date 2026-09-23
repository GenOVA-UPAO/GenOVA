import type { ProviderMeta } from "./platform-key-meta";

interface PlatformKeyRowHeaderProps {
  meta: ProviderMeta;
  configured: boolean;
}

export function PlatformKeyRowHeader({ meta, configured }: Readonly<PlatformKeyRowHeaderProps>) {
  return (
    <div className="min-w-0 flex-1">
      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
        <span className="text-sm font-medium">{meta.label}</span>
        {configured ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-success-strong">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
            Conectado
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Sin configurar</span>
        )}
        {meta.compat && (
          <span className="text-xs text-muted-foreground">· Compatible con OpenAI</span>
        )}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{meta.desc}</p>
    </div>
  );
}
