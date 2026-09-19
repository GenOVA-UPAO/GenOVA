import type { GroupBy, SortKey } from "../lib/catalog-sort";
import { GROUP_OPTIONS, SORT_OPTIONS } from "../lib/catalog-sort";
import { CATEGORY_LABELS, TYPE_LABELS } from "../lib/llm-settings-labels";
import { ManageModelsSearchField } from "./manage-models-search-field";
import { ManageModelsSelect } from "./manage-models-select";

interface ManageModelsToolbarProps {
  localSearch: string;
  categoryFilter: string;
  categories: string[];
  typeFilter: string;
  types: string[];
  sortKey: SortKey;
  groupBy: GroupBy;
  onSearch: (value: string) => void;
  onCategory: (value: string) => void;
  onType: (value: string) => void;
  onSort: (value: SortKey) => void;
  onGroup: (value: GroupBy) => void;
}

export function ManageModelsToolbar(props: Readonly<ManageModelsToolbarProps>) {
  return (
    <div className="flex items-center gap-2 border-b border-border/40 bg-background px-4 py-3">
      <ManageModelsSearchField value={props.localSearch} onSearch={props.onSearch} />
      <ManageModelsSelect
        value={orAll(props.typeFilter)}
        title="Filtrar por tipo de modelo"
        className="max-w-[130px]"
        onChange={props.onType}
      >
        {props.types.map((type) => (
          <option key={type} value={type}>
            {TYPE_LABELS[type] ?? type}
          </option>
        ))}
      </ManageModelsSelect>
      <ManageModelsSelect value={orAll(props.categoryFilter)} onChange={props.onCategory}>
        {props.categories.map((cat) => (
          <option key={cat} value={cat}>
            {CATEGORY_LABELS[cat] ?? cat}
          </option>
        ))}
      </ManageModelsSelect>
      <ManageModelsSelect
        value={props.sortKey}
        title="Ordenar"
        onChange={(value) => {
          props.onSort(value as SortKey);
        }}
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </ManageModelsSelect>
      <ManageModelsSelect
        value={props.groupBy}
        title="Agrupar"
        onChange={(value) => {
          props.onGroup(value as GroupBy);
        }}
      >
        {GROUP_OPTIONS.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </ManageModelsSelect>
    </div>
  );
}

function orAll(value: string): string {
  return value.length > 0 ? value : "all";
}
