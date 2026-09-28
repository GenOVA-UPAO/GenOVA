import { useState } from "react";
import { z } from "zod";

type FieldErrors<T> = Partial<Record<keyof T, string>>;

function firstFieldErrors<T extends Record<keyof T, string>>(error: z.ZodError): FieldErrors<T> {
  const flattened = z.flattenError(error);
  const fieldErrors = flattened.fieldErrors as Record<string, string[] | undefined>;
  const result: FieldErrors<T> = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    const first = messages?.[0];
    if (first) result[key as keyof T] = first;
  }
  return result;
}

export function useForm<T extends Record<keyof T, string>>(schema: z.ZodType<T>, initial: T) {
  const [values, setValues] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
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

  function bind(name: keyof T & string) {
    return {
      value: values[name],
      "aria-invalid": errorFor(name) ? true : undefined,
      onChange: (event: { target: { value: string } }) => {
        setField(name, event.target.value);
      },
      onBlur: () => {
        touch(name);
      },
    };
  }

  /**
   * Al enviar con errores: los muestra todos y lleva el foco al primer campo
   * inválido (si se pasa el formulario), para no dejarlo en el botón.
   */
  function touchAll(formEl?: HTMLFormElement | null) {
    const all: Partial<Record<keyof T, boolean>> = {};
    for (const key of Object.keys(values) as (keyof T)[]) all[key] = true;
    setTouched(all);
    requestAnimationFrame(() => {
      formEl?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    });
  }

  /** Vuelve a un estado limpio: `next` pasa a ser la referencia de «sin cambios». */
  function reset(next: T) {
    setValues(next);
    setBaseline(next);
    setTouched({});
  }

  const isDirty = (Object.keys(values) as (keyof T)[]).some((key) => values[key] !== baseline[key]);

  return { values, errorFor, isValid: parsed.success, isDirty, bind, reset, setField, touch, touchAll };
}
