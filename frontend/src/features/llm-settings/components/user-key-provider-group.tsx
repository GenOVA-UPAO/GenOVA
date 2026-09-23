import { UserKeyRow } from "./user-key-row";

interface ProviderGroupProps {
  title: string;
  providers: string[];
  apiKeys: Record<string, string | undefined>;
}

export function UserKeyProviderGroup({ title, providers, apiKeys }: Readonly<ProviderGroupProps>) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {providers.map((id) => (
          <UserKeyRow key={id} provider={id} maskedValue={apiKeys[id]} />
        ))}
      </ul>
    </div>
  );
}
