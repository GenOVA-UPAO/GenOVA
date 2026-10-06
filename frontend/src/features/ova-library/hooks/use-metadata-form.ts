import { type SyntheticEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { EducationalMetadata } from "@/core/lib/educational-metadata";

import { createMetadataSchema, type MetadataInput, metadataSchema } from "../lib/metadata-schema";

export function useMetadataForm(initial: EducationalMetadata & { title: string; description?: string; package_theme?: string }, onSave: (data: MetadataInput) => void, onCancel: () => void) {
  const { t } = useTranslation();
  const schema = useMemo(() => createMetadataSchema(t), [t]);
  const [values, setValues] = useState<MetadataInput>(() => ({
    title: initial.title, description: initial.description ?? "", license: initial.license ?? "CC BY-SA 4.0",
    language: initial.language ?? "es", keywords: initial.keywords ?? [], author: initial.author ?? "",
    educational_level: initial.educational_level ?? "", audience: initial.audience ?? "",
    typical_learning_time: initial.typical_learning_time ?? "",
    package_theme: metadataSchema.shape.package_theme.parse(initial.package_theme ?? "upao"),
  }));
  const [keywords, setKeywords] = useState((initial.keywords ?? []).join(", "));
  const [validationFailed, setValidationFailed] = useState(false);
  const input = { ...values, keywords: keywords.split(",").map((word) => word.trim()).filter(Boolean) };
  // Recalcular los mensajes al cambiar de idioma, sin perder lo escrito ni el foco.
  const validation = validationFailed ? schema.safeParse(input) : null;
  const issues = validation && !validation.success ? validation.error.issues : [];
  const errors: Partial<Record<keyof MetadataInput, string>> = Object.fromEntries(issues.map((issue) => [String(issue.path[0]), issue.message]));
  const error = issues[0]?.message ?? null;
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const requestCancel = () => {
    if (dirty) setDiscardOpen(true);
    else onCancel();
  };
  const onChange = (name: keyof MetadataInput, value: string) => {
    setDirty(true);
    if (name === "keywords") setKeywords(value);
    else setValues((current) => ({ ...current, [name]: value }));
    setValidationFailed(false);
  };
  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = schema.safeParse(input);
    if (!result.success) {
      setValidationFailed(true);
      document.getElementById(`metadata-${String(result.error.issues[0].path[0])}`)?.focus();
      return;
    }
    setValidationFailed(false);
    onSave(result.data);
  };
  return { values, keywords, errors, error, onChange, handleSubmit, discardOpen, setDiscardOpen, requestCancel };
}
