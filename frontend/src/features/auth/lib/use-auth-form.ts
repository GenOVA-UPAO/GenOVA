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

  /**
   * Al enviar un formulario inválido: marca todos los campos para que se vean sus
   * errores y lleva el foco al primero (el botón de envío ya no se deshabilita).
   */
  function revealErrors(formEl?: HTMLFormElement | null) {
    const all = Object.fromEntries(Object.keys(values).map((k) => [k, true]));
    setTouched(all as Partial<Record<keyof T, boolean>>);
    requestAnimationFrame(() => {
      formEl?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    });
  }

  function errorFor(name: keyof T): string | undefined {
    return touched[name] ? errors[name] : undefined;
  }

  function invalid(name: keyof T): true | undefined {
    return errorFor(name) ? true : undefined;
  }

  /**
   * Props del input. `id` es el del campo en `AuthField` (por defecto, el nombre) y
   * `hint` indica si el campo lleva ayuda, para enlazar error o ayuda por aria-describedby.
   */
  function bind(name: keyof T & string, options: { id?: string; hint?: boolean } = {}) {
    const id = options.id ?? name;
    let describedBy: string | undefined;
    if (errorFor(name)) describedBy = `${id}-error`;
    else if (options.hint === true) describedBy = `${id}-hint`;
    return {
      value: values[name],
      "aria-invalid": invalid(name),
      "aria-describedby": describedBy,
      onChange: (event: { target: { value: string } }) => {
        setField(name, event.target.value);
      },
      onBlur: () => {
        touch(name);
      },
    };
  }

  return { values, setField, touch, revealErrors, errorFor, invalid, isValid: parsed.success, bind };
}
