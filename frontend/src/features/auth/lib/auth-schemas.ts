import { z } from "zod";

import { EMAIL_FORMAT_ERROR, EMAIL_VALID_ERROR } from "./auth-copy";
import {
  FULL_NAME_LETTER_RE,
  FULL_NAME_MAX,
  FULL_NAME_MIN,
  PASSWORD_RE,
} from "./auth-validators";

const FULL_NAME_RANGE = "El nombre completo debe tener al menos 3 caracteres y máximo 100.";

function emailField(message: string) {
  return z.string().trim().pipe(z.email({ error: message }));
}

export const loginSchema = z.object({
  email: emailField(EMAIL_FORMAT_ERROR),
  password: z.string().min(1, "La contraseña es requerida."),
});

export const registerSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "El nombre completo es requerido.")
    .max(FULL_NAME_MAX, FULL_NAME_RANGE)
    .refine((value) => value.length >= FULL_NAME_MIN, { message: FULL_NAME_RANGE })
    .regex(FULL_NAME_LETTER_RE, "El nombre debe contener al menos una letra."),
  email: emailField(EMAIL_FORMAT_ERROR),
  password: z
    .string()
    .min(1, "La contraseña es requerida.")
    .regex(PASSWORD_RE, "Mínimo 8 caracteres con letras y números."),
});

export const forgotPasswordSchema = z.object({
  email: emailField(EMAIL_VALID_ERROR),
});

export const resetPasswordSchema = z
  .object({
    new_password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, "Debe contener letras y números"),
    confirm_password: z.string().min(1, "Confirma tu nueva contraseña"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Las contraseñas no coinciden",
    path: ["confirm_password"],
  });

export const totpSchema = z.object({
  code: z
    .string()
    .min(1, "Ingresa el código.")
    .regex(/^[\dA-Fa-f\s]{4,8}$/, "Código inválido."),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type TotpValues = z.infer<typeof totpSchema>;
