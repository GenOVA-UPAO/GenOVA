import { useEffect, useRef } from "react";

import { useLlmSettings } from "../hooks/use-llm-settings";
import type { CatalogGroup } from "../lib/catalog-sort";
import { ManageModelRow } from "./manage-model-row";
import { ManageModelsFooter } from "./manage-models-footer";

interface ManageModelsListProps {
  grouped: CatalogGroup[];
}

export function ManageModelsList({ grouped }: Readonly<ManageModelsListProps>) {
  const store = useLlmSettings();
  const sentinel = useRef<HTMLDivElement>(null);
  const scrollRoot = useRef<HTMLDivElement>(null);
  const canLoadMore = store.fullHasMore && !store.loadingMore && !store.loading;

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && canLoadMore) store.loadMore();
      },
      { rootMargin: "200px", root: scrollRoot.current },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [canLoadMore, store]);

  return (
    <div ref={scrollRoot} className="max-h-[560px] min-h-0 flex-1 overflow-y-auto">
      <div className="divide-y divide-border/30">
        {grouped.map((entry) => (
          <div key={entry.key} className="px-3 py-2">
            <p className="mb-1 flex items-center gap-1.5 px-2 text-[9px] font-black tracking-[0.14em] text-muted-foreground/40 uppercase">
              {entry.label}
              {store.groupBy === "provider" && (entry.key === "groq" || entry.key === "huggingface") ? (
                <span className="font-normal tracking-normal text-emerald-500 normal-case">
                  · gratuito
                </span>
              ) : null}
              <span className="font-normal tracking-normal normal-case">· {entry.models.length}</span>
            </p>
            {entry.models.map((model) => {
              const locked = store.isDefaultModel(model.provider, model.model_id);
              return (
                <ManageModelRow
                  key={`${model.provider}:${model.model_id}`}
                  model={model}
                  locked={locked}
                  enabled={store.isModelEnabled(model.provider, model.model_id) || locked}
                  onToggle={store.toggleFavorite}
                />
              );
            })}
          </div>
        ))}
        <div ref={sentinel} className="h-1" />
        <ManageModelsFooter />
      </div>
    </div>
  );
}
