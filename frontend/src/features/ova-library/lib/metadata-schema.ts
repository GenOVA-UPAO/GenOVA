import i18n from "i18next";
import { z } from "zod";

export const metadataSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: () => i18n.t("ova-library:el_titulo_es_obligatorio") })
    .max(100, { error: () => i18n.t("ova-library:el_titulo_no_puede_superar_100_caracteres") }),
  description: z.string().max(2000).optional().or(z.literal("")),
});

export type MetadataInput = z.infer<typeof metadataSchema>;
