import { t } from "i18next";
import { z } from "zod";

import { emailFormatError, emailValidError } from "./auth-copy";
import {
  FULL_NAME_LETTER_RE,
  FULL_NAME_MAX,
  FULL_NAME_MIN,
  PASSWORD_RE,
} from "./auth-validators";

// Los mensajes son funciones: zod las evalúa al validar, con el idioma activo en ese momento.
const fullNameRange = () => t("auth:validation.fullNameRange");
const passwordRequired = () => t("auth:validation.passwordRequired");

function emailField(message: () => string) {
  return z.string().trim().pipe(z.email({ error: message }));
}

export const loginSchema = z.object({
  email: emailField(emailFormatError),
  password: z.string().min(1, { error: passwordRequired }),
});

export const registerSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, { error: () => t("auth:validation.fullNameRequired") })
    .max(FULL_NAME_MAX, { error: fullNameRange })
    .refine((value) => value.length >= FULL_NAME_MIN, { error: fullNameRange })
    .regex(FULL_NAME_LETTER_RE, { error: () => t("auth:validation.fullNameLetter") }),
  email: emailField(emailFormatError),
  password: z
    .string()
    .min(1, { error: passwordRequired })
    .regex(PASSWORD_RE, { error: () => t("auth:validation.passwordFormat") }),
});

export const forgotPasswordSchema = z.object({
  email: emailField(emailValidError),
});

export const resetPasswordSchema = z
  .object({
    new_password: z
      .string()
      .min(8, { error: () => t("auth:validation.newPasswordMin") })
      .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, { error: () => t("auth:validation.newPasswordMix") }),
    confirm_password: z.string().min(1, { error: () => t("auth:validation.confirmRequired") }),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    error: () => t("auth:validation.passwordMismatch"),
    path: ["confirm_password"],
  });

export const totpSchema = z.object({
  code: z
    .string()
    .min(1, { error: () => t("auth:validation.codeRequired") })
    .regex(/^[\dA-Fa-f\s]{4,8}$/, { error: () => t("auth:validation.codeFormat") }),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type TotpValues = z.infer<typeof totpSchema>;
