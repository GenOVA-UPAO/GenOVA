import { useState } from "react";
import { z } from "zod";

type StringMap = Record<string, string>;
type FieldErrors<T> = Partial<Record<keyof T, string>>;

function firstFieldErrors<T extends StringMap>(error: z.ZodError): FieldErrors<T> {
  const flattened = z.flattenError(error);
  const fieldErrors = flattened.fieldErrors as Record<string, string[] | undefined>;
  const result: FieldErrors<T> = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    const first = messages?.[0];
    if (first) result[key as keyof T] = first;
  }
  return result;
}

export function useAuthForm<T extends StringMap>(schema: z.ZodType<T>, initial: T) {
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const parsed = schema.safeParse(values);
  const errors: FieldErrors<T> = parsed.success ? {} : firstFieldErrors<T>(parsed.error);

  function setField(name: keyof T & string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function touch(name: keyof T) {
    setTouched((current) => ({ ...current, [name]: true }));
  }

  function errorFor(name: keyof T): string | undefined {
    return touched[name] ? errors[name] : undefined;
  }

  function invalid(name: keyof T): true | undefined {
    return errorFor(name) ? true : undefined;
  }

  function bind(name: keyof T & string) {
    return {
      value: values[name],
      "aria-invalid": invalid(name),
      onChange: (event: { target: { value: string } }) => {
        setField(name, event.target.value);
      },
      onBlur: () => {
        touch(name);
      },
    };
  }

  return { values, setField, touch, errorFor, invalid, isValid: parsed.success, bind };
}
