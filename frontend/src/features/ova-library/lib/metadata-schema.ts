import { z } from "zod";

import { OVA_LICENSES } from "@/core/lib/educational-metadata";

export const metadataSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "El título es obligatorio.")
    .max(100, "El título no puede superar 100 caracteres."),
  description: z.string().max(2000).optional().or(z.literal("")),
  license: z.enum(OVA_LICENSES.map((license) => license.value)).default("CC BY-SA 4.0"),
  language: z.string().trim().max(35).regex(/^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/, "Usa un código de idioma como es o es-PE.").default("es"),
  keywords: z.array(z.string().trim().min(1).max(100, "Cada palabra clave admite hasta 100 caracteres.")).max(30, "Usa hasta 30 palabras clave.").default([]),
  educational_level: z.string().trim().max(120, "El nivel educativo admite hasta 120 caracteres.").default(""),
  audience: z.string().trim().max(255, "El público destinatario admite hasta 255 caracteres.").default(""),
  typical_learning_time: z.string().trim().max(40).refine((value) => value === "" || (value !== "PT" && /^PT(\d+H)?(\d+M)?(\d+S)?$/.test(value)), "Usa PT30M para 30 minutos o PT1H30M para una hora y media.").default(""),
  author: z.string().trim().max(255, "El autor admite hasta 255 caracteres.").default(""),
});

export type MetadataInput = z.infer<typeof metadataSchema>;
