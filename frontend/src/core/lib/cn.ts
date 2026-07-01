import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS classes with clsx support.
 * Equivalent to the cn() helper in the React frontend.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
