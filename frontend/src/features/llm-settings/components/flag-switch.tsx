import { Switch } from "@/core/components/ui/switch";

interface FlagSwitchProps {
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
  label: string;
  size?: "sm" | "md";
}

export function FlagSwitch({
  checked,
  disabled = false,
  onToggle,
  label,
  size = "md",
}: Readonly<FlagSwitchProps>) {
  return (
    <Switch
      checked={checked}
      disabled={disabled}
      onCheckedChange={onToggle}
      aria-label={label}
      size={size === "sm" ? "sm" : "default"}
    />
  );
}
