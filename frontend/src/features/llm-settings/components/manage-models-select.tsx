import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import { cn } from "@/core/lib/cn";

export interface ManageModelsOption {
  value: string;
  label: string;
}

interface ManageModelsSelectProps {
  value: string;
  label: string;
  options: ManageModelsOption[];
  className?: string;
  onChange: (value: string) => void;
}

export function ManageModelsSelect({
  value,
  label,
  options,
  className,
  onChange,
}: Readonly<ManageModelsSelectProps>) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        title={label}
        className={cn("h-9 w-full min-w-0 max-sm:h-11", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-72">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
