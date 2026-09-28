import { firstNonBlank } from "@/core/lib/text";

export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return firstNonBlank(err.message, fallback) ?? fallback;
  return fallback;
}
