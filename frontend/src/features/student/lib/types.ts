export interface Resource {
  id: string | number;
  tipo?: string;
  emoji?: string;
  interactividad?: string;
  [key: string]: unknown;
}

export interface PreviewResult {
  html_content?: string;
  resource_type?: string;
  concepto?: string;
  emoji?: string;
  tipo?: string;
  duracion?: string;
  interactividad?: string;
}

export interface SharedOva {
  title?: string;
  description?: string;
  owner_name?: string;
  created_at?: string;
}
