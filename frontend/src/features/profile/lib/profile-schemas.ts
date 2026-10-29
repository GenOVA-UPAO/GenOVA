import { t } from "i18next";
import { z } from "zod";

export const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, { error: () => t("profile:validation.fullNameRequired") })
    .min(3, { error: () => t("profile:validation.fullNameMin") }),
  email: z.email({ error: () => t("profile:validation.emailInvalid") }),
  university_id: z
    .string()
    .refine((value) => /^\d*$/.test(value.trim()), {
      error: () => t("profile:validation.universityIdDigits"),
    })
    .refine((value) => value.trim() === "" || Number(value) >= 1, {
      error: () => t("profile:validation.universityIdMin"),
    }),
  gender: z.string(),
  phone_number: z.string().refine((value) => value === "" || /^\+?\d+$/.test(value), {
    error: () => t("profile:validation.phoneFormat"),
  }),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: () => t("profile:validation.currentPasswordRequired") }),
    newPassword: z
      .string()
      .min(1, { error: () => t("profile:validation.newPasswordRequired") })
      .min(8, { error: () => t("profile:validation.passwordMin") })
      .regex(/^(?=.*[A-Za-z])(?=.*\d)/, {
        error: () => t("profile:validation.passwordFormat"),
      }),
    confirmPassword: z.string().min(1, { error: () => t("profile:validation.confirmRequired") }),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    error: () => t("profile:validation.passwordMismatch"),
    path: ["confirmPassword"],
  });

export const deleteAccountSchema = z.object({
  password: z.string().min(1, { error: () => t("profile:validation.deletePasswordRequired") }),
});

export type ProfileSchemaValues = z.infer<typeof profileSchema>;
export type PasswordSchemaValues = z.infer<typeof passwordSchema>;
