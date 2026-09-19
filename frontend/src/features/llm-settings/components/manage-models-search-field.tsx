import { Icon } from "@/core/components/icon";

interface ManageModelsSearchFieldProps {
  value: string;
  onSearch: (value: string) => void;
}

export function ManageModelsSearchField({
  value,
  onSearch,
}: Readonly<ManageModelsSearchFieldProps>) {
  return (
    <div className="relative min-w-[120px] flex-1">
      <Icon
        name="magnifying-glass"
        size="text-xs"
        className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground/50"
      />
      <input
        type="text"
        placeholder="Buscar modelo..."
        value={value}
        onChange={(event) => {
          onSearch(event.target.value);
        }}
        className="w-full rounded-lg border border-border/60 bg-muted/30 py-1.5 pr-3 pl-8 text-xs focus:ring-2 focus:ring-primary/20 focus:outline-none"
      />
    </div>
  );
}
