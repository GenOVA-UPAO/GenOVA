import type { OwnCatalogStatus } from "../lib/own-catalog-status";
import { UserKeyRow } from "./user-key-row";

interface ProviderGroupProps {
  title: string;
  /** Una línea bajo el título, p. ej. por qué se recomienda. */
  hint?: string;
  providers: string[];
  apiKeys: Record<string, string | undefined>;
  ownStatus?: OwnCatalogStatus | null;
}

export function UserKeyProviderGroup({
  title,
  hint,
  providers,
  apiKeys,
  ownStatus = null,
}: Readonly<ProviderGroupProps>) {
  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {providers.map((id) => (
          <UserKeyRow key={id} provider={id} maskedValue={apiKeys[id]} ownStatus={ownStatus} />
        ))}
      </ul>
    </div>
  );
}
