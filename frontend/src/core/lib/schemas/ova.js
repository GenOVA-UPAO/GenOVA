import { z } from 'zod'

export const metadataSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'El título es obligatorio.')
    .max(100, 'El título no puede superar 100 caracteres.'),
  description: z.string().max(2000).optional().or(z.literal('')),
})
