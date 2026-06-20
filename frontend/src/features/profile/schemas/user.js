import { z } from 'zod'

const phone = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine(
    (v) => !v || /^\d+$/.test(v.replace(/[\s+-]/g, '')),
    'El teléfono solo debe contener dígitos y el signo +.',
  )

export const userEditSchema = z.object({
  full_name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  email: z.string().trim().email('Ingresa un correo electrónico válido.'),
  university_id: z.string().optional().or(z.literal('')),
  gender: z.string(),
  phone_number: phone,
})

// Perfil propio (ProfilePage): mismas reglas, email también requerido.
export const profileSchema = z.object({
  full_name: z.string().trim().min(3, 'El nombre completo debe tener al menos 3 caracteres.'),
  email: z.string().trim().min(1, 'El correo electrónico es requerido.').email('El formato del correo electrónico es inválido.'),
  university_id: z.string().optional().or(z.literal('')),
  gender: z.string(),
  phone_number: phone,
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es requerida.'),
    newPassword: z
      .string()
      .min(8, 'La nueva contraseña debe tener al menos 8 caracteres.')
      .regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'La nueva contraseña debe contener letras y números (alfanumérica).'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'La confirmación no coincide con la nueva contraseña.',
  })
