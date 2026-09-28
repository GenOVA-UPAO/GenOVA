import { type UIEvent, useEffect, useId } from "react";

import { Icon } from "@/core/components/icon";

import type { ComboboxState } from "../hooks/use-model-combobox";
import { type ModelOption, NO_FILTERS, optionProviders, type PickerSection } from "../lib/model-search";
import { optionsPricing } from "../lib/options-pricing";
import { ModelComboboxFooter } from "./model-combobox-footer";
import { ModelFilterChips } from "./model-filter-chips";
import { ModelOptionRow } from "./model-option-row";

interface ModelComboboxPanelProps {
  state: ComboboxState;
  options: ModelOption[];
  current: string;
  label: string;
}

/**
 * Buscador, filtros rápidos y lista agrupada de modelos (patrón combobox de
 * ARIA con aria-activedescendant). Solo se pintan las filas cercanas: con
 * cientos de modelos, el resto aparece al bajar.
 */
export function ModelComboboxPanel({ state, options, current, label }: Readonly<ModelComboboxPanelProps>) {
  const listId = useId();
  const optionId = (index: number) => `${listId}-opt-${String(index)}`;
  const activeId = state.flat.length > 0 ? optionId(state.active) : undefined;
  const pricing = optionsPricing(options);

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (el.scrollTop + el.clientHeight > el.scrollHeight - 240) state.showMore();
  };

  return (
    <div className="flex max-h-[min(32rem,var(--radix-popover-content-available-height))] flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3">
        <Icon name="magnifying-glass" size="text-base" className="shrink-0 text-muted-foreground" />
        <input
          type="text"
          role="combobox"
          aria-label={`Buscar: ${label}`}
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          placeholder="Buscar por nombre, proveedor o id…"
          value={state.query}
          onChange={(event) => {
            state.onQuery(event.target.value);
          }}
          onKeyDown={state.onKeyDown}
          className="h-11 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground max-sm:text-base"
        />
      </div>
      {options.length > 0 ? (
        <ModelFilterChips
          className="shrink-0 border-b border-border px-3 py-2"
          filters={state.filters}
          providers={optionProviders(options)}
          onChange={state.setFilters}
          mediaOnly={pricing.mediaOnly}
        />
      ) : null}
      <div
        id={listId}
        role="listbox"
        aria-label={label}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-1"
      >
        <PanelSections state={state} current={current} optionId={optionId} />
      </div>
      <ModelComboboxFooter
        shown={state.flat.length}
        total={state.total}
        query={state.query}
        filtered={state.flat.length < state.total}
        priceNote={pricing.note}
        onClearFilters={() => {
          state.onQuery("");
          state.setFilters(NO_FILTERS);
        }}
      />
    </div>
  );
}

interface PanelSectionsProps {
  state: ComboboxState;
  current: string;
  optionId: (index: number) => string;
}

function PanelSections({ state, current, optionId }: Readonly<PanelSectionsProps>) {
  let offset = 0;
  const groups: { section: PickerSection; start: number }[] = [];
  for (const section of state.sections) {
    if (offset >= state.limit) break;
    groups.push({ section, start: offset });
    offset += section.options.length;
  }
  return groups.map(({ section, start }) => (
    <div key={section.key} role="group" aria-labelledby={`${optionId(start)}-group`}>
      <div
        id={`${optionId(start)}-group`}
        className="sticky top-0 z-10 flex items-baseline gap-1.5 bg-popover px-2.5 pt-2.5 pb-1 text-xs font-medium text-muted-foreground"
      >
        {section.label}
        <span className="font-normal tabular-nums">{section.options.length}</span>
      </div>
      {section.options.slice(0, Math.max(state.limit - start, 0)).map((option, i) => {
        const index = start + i;
        return (
          <ModelOptionRow
            key={option.value}
            id={optionId(index)}
            option={option}
            selected={option.value === current}
            active={index === state.active}
            onHover={() => {
              if (index !== state.active) state.setActive(index);
            }}
            onPick={() => {
              state.pick(option.value);
            }}
          />
        );
      })}
    </div>
  ));
}
