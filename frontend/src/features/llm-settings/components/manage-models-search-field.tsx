import { SearchInput } from "@/core/components/search-input";

interface ManageModelsSearchFieldProps {
  value: string;
  onSearch: (value: string) => void;
}

export function ManageModelsSearchField({
  value,
  onSearch,
}: Readonly<ManageModelsSearchFieldProps>) {
  return (
    <SearchInput
      className="min-w-0 basis-full sm:basis-auto sm:flex-1"
      value={value}
      onValueChange={onSearch}
      placeholder="Buscar modelo"
      ariaLabel="Buscar modelo"
      inputClassName="h-9 max-sm:h-11"
    />
  );
}
