import { type SyntheticEvent, useState } from "react";

import type { EducationalMetadata } from "@/core/lib/educational-metadata";

import { type MetadataInput, metadataSchema } from "../lib/metadata-schema";

export function useMetadataForm(initial: EducationalMetadata & { title: string; description?: string; package_theme?: string }, onSave: (data: MetadataInput) => void, onCancel: () => void) {
  const [values, setValues] = useState<MetadataInput>(() => ({
    title: initial.title, description: initial.description ?? "", license: initial.license ?? "CC BY-SA 4.0",
    language: initial.language ?? "es", keywords: initial.keywords ?? [], author: initial.author ?? "",
    educational_level: initial.educational_level ?? "", audience: initial.audience ?? "",
    typical_learning_time: initial.typical_learning_time ?? "",
    package_theme: metadataSchema.shape.package_theme.parse(initial.package_theme ?? "upao"),
  }));
  const [keywords, setKeywords] = useState((initial.keywords ?? []).join(", "));
  const [errors, setErrors] = useState<Partial<Record<keyof MetadataInput, string>>>({});
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    setErrors({});
  };
  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = metadataSchema.safeParse({ ...values, keywords: keywords.split(",").map((word) => word.trim()).filter(Boolean) });
    if (!result.success) {
      setError(result.error.issues[0].message);
      setErrors(Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      document.getElementById(`metadata-${String(result.error.issues[0].path[0])}`)?.focus();
      return;
    }
    setError(null);
    setErrors({});
    onSave(result.data);
  };
  return { values, keywords, errors, error, onChange, handleSubmit, discardOpen, setDiscardOpen, requestCancel };
}
