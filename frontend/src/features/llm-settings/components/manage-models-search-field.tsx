import { useTranslation } from "react-i18next";

import { SearchInput } from "@/core/components/search-input";

interface ManageModelsSearchFieldProps {
  value: string;
  onSearch: (value: string) => void;
}

export function ManageModelsSearchField({
  value,
  onSearch,
}: Readonly<ManageModelsSearchFieldProps>) {
  const { t } = useTranslation("llm-settings");

  return (
    <SearchInput
      className="min-w-0 flex-1"
      value={value}
      onValueChange={onSearch}
      placeholder={t("catalog.searchPlaceholderExtended")}
      ariaLabel={t("catalog.searchModel")}
      inputClassName="h-9 max-sm:h-11 max-sm:text-base"
    />
  );
}

