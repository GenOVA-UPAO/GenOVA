import { z } from "zod";

export const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "El nombre completo es requerido.")
    .min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.email({ error: "Ingresa un correo electrónico válido." }),
  university_id: z.string(),
  gender: z.string(),
  phone_number: z.string().refine((value) => value === "" || /^\+?\d+$/.test(value), {
    message: "El teléfono solo debe contener dígitos y el signo +.",
  }),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "La contraseña actual es requerida."),
    newPassword: z
      .string()
      .min(1, "La nueva contraseña es requerida.")
      .min(8, "Debe tener al menos 8 caracteres.")
      .regex(/^(?=.*[A-Za-z])(?=.*\d)/, "Debe contener letras y números."),
    confirmPassword: z.string().min(1, "Confirma tu nueva contraseña."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "La contraseña es requerida para confirmar"),
});

export type ProfileSchemaValues = z.infer<typeof profileSchema>;
export type PasswordSchemaValues = z.infer<typeof passwordSchema>;
