import { useTranslation } from "react-i18next";

import { Button } from "@/core/components/ui/button";

interface ModelComboboxFooterProps {
  shown: number;
  total: number;
  query: string;
  filtered: boolean;
  /** Qué significan los precios de la lista (tokens, imagen o segundo de video). */
  priceNote?: string;
  onClearFilters: () => void;
}

export const TOKEN_PRICE_NOTE = "llm-settings:optionsPricing.tokens";

/** Pie del selector: cuántos modelos hay, qué significan los precios o por qué la lista está vacía. */
export function ModelComboboxFooter({
  shown,
  total,
  query,
  filtered,
  priceNote,
  onClearFilters,
}: Readonly<ModelComboboxFooterProps>) {
  const { t } = useTranslation("llm-settings");
  const effectivePriceNote = priceNote === TOKEN_PRICE_NOTE || !priceNote ? t("optionsPricing.tokens") : priceNote;
  const term = query.trim();
  const countStr = t("catalog.allModelsCount", { count: total });
  let text = `${countStr}. ${effectivePriceNote}`;
  if (total === 0) text = t("combobox.noModelsForTask");
  else if (shown === 0 && term !== "") text = t("combobox.noModelsMatchQuery", { term });
  else if (shown === 0) text = t("combobox.noModelsMatchFilters");
  else if (filtered) text = `${String(shown)} de ${countStr}. ${effectivePriceNote}`;
  return (
    <div className="flex shrink-0 items-center gap-2 border-t border-border px-3 py-2">
      <p role="status" className="min-w-0 flex-1 text-xs text-muted-foreground">
        {text}
      </p>
      {shown === 0 && total > 0 ? (
        <Button variant="ghost" size="xs" className="shrink-0 max-sm:h-9" onClick={onClearFilters}>
          {t("catalog.clearFilters")}
        </Button>
      ) : null}
    </div>
  );
}

