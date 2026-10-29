import type { EducationalMetadata } from "@/core/lib/educational-metadata";

export interface OvaListItem extends EducationalMetadata {
  id: string;
  title?: string;
  description?: string;
  package_theme?: string;
  status?: string;
  [key: string]: unknown;
}
