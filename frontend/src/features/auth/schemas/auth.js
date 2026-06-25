import { z } from 'zod'

const email = z
  .string()
  .trim()
  .min(1, 'El correo es requerido.')
  .email('Ingresa un correo con formato válido.')

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'La contraseña es requerida.'),
})

export const registerSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(3, 'El nombre completo debe tener al menos 3 caracteres y máximo 100.')
    .max(100, 'El nombre completo debe tener al menos 3 caracteres y máximo 100.')
    .regex(/\p{L}/u, 'El nombre debe contener al menos una letra.'),
  email,
  password: z
    .string()
    .regex(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, 'Mínimo 8 caracteres con letras y números.'),
})
