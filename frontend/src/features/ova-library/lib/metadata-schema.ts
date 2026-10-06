import i18n, { type TFunction } from "i18next";
import { z } from "zod";

import { OVA_LICENSES, parseLearningTime } from "@/core/lib/educational-metadata";

export const createMetadataSchema = (t: TFunction) => z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: () => t("ova-library:el_titulo_es_obligatorio") })
    .max(100, { error: () => t("ova-library:el_titulo_no_puede_superar_100_caracteres") }),
  description: z.string().max(2000, { error: () => t("metadata:validation.description") }).optional().or(z.literal("")),
  license: z.enum(OVA_LICENSES.map((license) => license.value), { error: () => t("metadata:validation.license") }).default("CC BY-SA 4.0"),
  language: z.string().trim().max(35, { error: () => t("metadata:validation.language") }).regex(/^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/, { error: () => t("metadata:validation.language") }).default("es"),
  keywords: z.array(z.string().trim().min(1, { error: () => t("metadata:validation.keyword") }).max(100, { error: () => t("metadata:validation.keyword") })).max(30, { error: () => t("metadata:validation.keywords") }).default([]),
  educational_level: z.string().trim().max(120, { error: () => t("metadata:validation.educationalLevel") }).default(""),
  audience: z.string().trim().max(255, { error: () => t("metadata:validation.audience") }).default(""),
  // El docente escribe minutos u horas («45», «1 h 30 min»); se guarda en ISO 8601.
  typical_learning_time: z.string().trim().max(40, { error: () => t("metadata:validation.learningTime") }).refine((value) => parseLearningTime(value) !== null, { error: () => t("metadata:validation.learningTime") }).transform((value) => parseLearningTime(value) ?? "").default(""),
  author: z.string().trim().max(255, { error: () => t("metadata:validation.author") }).default(""),
  package_theme: z.enum(["original", "upao", "claro", "oscuro", "alto-contraste", "infantil"], { error: () => t("metadata:validation.theme") }).optional(),
});

export const metadataSchema = createMetadataSchema(i18n.t.bind(i18n));

export type MetadataInput = z.infer<typeof metadataSchema>;
