import { PROVIDER_META } from "@/core/components/platform-key-meta";

import { ownKeyErrorText, type OwnKeyView } from "../lib/own-catalog-status";
import { UserKeyState } from "./user-key-state";

export function UserKeyRowHeader({
  provider,
  view,
}: Readonly<{ provider: string; view: OwnKeyView }>) {
  const meta = PROVIDER_META[provider] ?? {
    label: provider,
    placeholder: "...",
    desc: "Proveedor",
    compat: false,
  };
  return (
    <div className="min-w-0 flex-1">
      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
        <span className="text-sm font-medium">{meta.label}</span>
        <UserKeyState view={view} />
      </p>
      {view.kind === "error" ? (
        <p
          className={
            view.code === "invalid_key"
              ? "mt-0.5 text-xs text-destructive"
              : "mt-0.5 text-xs text-muted-foreground"
          }
        >
          {ownKeyErrorText(view.code)}
        </p>
      ) : (
        <p className="mt-0.5 text-xs text-muted-foreground">{meta.desc}</p>
      )}
    </div>
  );
}
