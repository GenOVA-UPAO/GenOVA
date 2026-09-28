import { useContext } from "react";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { useFavoriteActions } from "../hooks/use-favorite-actions";
import { LlmSettingsContext } from "../hooks/use-llm-settings";

interface ModelFavoriteToggleProps {
  provider: string;
  modelId: string;
}

/**
 * Marca el modelo elegido como favorito sin salir al catálogo: los favoritos
 * salen primero al elegir modelo. Los modelos base lo son siempre.
 */
export function ModelFavoriteToggle({ provider, modelId }: Readonly<ModelFavoriteToggleProps>) {
  const store = useContext(LlmSettingsContext);
  const favorites = useFavoriteActions();
  if (!store || store.isDefaultModel(provider, modelId)) return null;
  const favorite = store.isModelEnabled(provider, modelId);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-pressed={favorite}
      className="-my-1 -mr-2 shrink-0 text-muted-foreground max-sm:h-11"
      onClick={() => {
        void favorites.toggle(provider, modelId);
      }}
    >
      <Icon
        name="star"
        weight={favorite ? "fill" : "regular"}
        className={favorite ? "text-accent-brand" : undefined}
      />
      {favorite ? "En favoritos" : "Añadir a favoritos"}
    </Button>
  );
}
