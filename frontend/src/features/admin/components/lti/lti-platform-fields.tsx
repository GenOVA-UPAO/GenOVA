import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Textarea } from "@/core/components/ui/textarea";

import type { LtiFieldSpec } from "../../lib/lti-platform-fields";
import type {
  LtiPlatformErrors,
  LtiPlatformField,
  LtiPlatformForm,
} from "../../lib/lti-platform-form";

interface LtiPlatformFieldProps {
  spec: LtiFieldSpec;
  form: LtiPlatformForm;
  errors: LtiPlatformErrors;
  disabled: boolean;
  onChange: (field: LtiPlatformField, value: string) => void;
}

export function LtiPlatformFieldInput({
  spec,
  form,
  errors,
  disabled,
  onChange,
}: Readonly<LtiPlatformFieldProps>) {
  const id = `lti-${spec.field}`;
  const error = errors[spec.field];
  const describedBy = error === undefined ? `${id}-help` : `${id}-error`;
  const common = {
    id,
    value: form[spec.field],
    disabled,
    autoComplete: "off",
    spellCheck: false,
    "aria-invalid": error !== undefined || undefined,
    "aria-describedby": describedBy,
  };
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{spec.label}</Label>
      {spec.multiline === true ? (
        <Textarea
          {...common}
          rows={2}
          className="resize-none"
          onChange={(event) => {
            onChange(spec.field, event.target.value);
          }}
        />
      ) : (
        <Input
          {...common}
          type={spec.type ?? "text"}
          inputMode={spec.type === "url" ? "url" : undefined}
          onChange={(event) => {
            onChange(spec.field, event.target.value);
          }}
        />
      )}
      {error === undefined ? (
        <p id={`${id}-help`} className="text-xs text-muted-foreground">
          {spec.help}
        </p>
      ) : (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
