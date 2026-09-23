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
    <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-border px-5 py-3 sm:flex sm:flex-wrap sm:items-center">
      <div className="col-span-2 sm:flex-1">
        <ManageModelsSearchField value={props.localSearch} onSearch={props.onSearch} />
      </div>
      <ManageModelsSelect
        value={orAll(props.typeFilter)}
        label="Filtrar por tipo de modelo"
        options={props.types.map((type) => ({ value: type, label: TYPE_LABELS[type] ?? type }))}
        onChange={props.onType}
      />
      <ManageModelsSelect
        value={orAll(props.categoryFilter)}
        label="Filtrar por categoría"
        options={props.categories.map((cat) => ({
          value: cat,
          label: CATEGORY_LABELS[cat] ?? cat,
        }))}
        onChange={props.onCategory}
      />
      <ManageModelsSelect
        value={props.sortKey}
        label="Ordenar"
        options={SORT_OPTIONS.map((opt) => ({ value: opt.key, label: opt.label }))}
        onChange={(value) => {
          props.onSort(value as SortKey);
        }}
      />
      <ManageModelsSelect
        value={props.groupBy}
        label="Agrupar"
        options={GROUP_OPTIONS.map((opt) => ({ value: opt.key, label: opt.label }))}
        onChange={(value) => {
          props.onGroup(value as GroupBy);
        }}
      />
    </div>
  );
}

function orAll(value: string): string {
  return value.length > 0 ? value : "all";
}
