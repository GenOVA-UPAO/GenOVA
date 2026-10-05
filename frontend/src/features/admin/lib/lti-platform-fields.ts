import type { LtiPlatformField } from "./lti-platform-form";

export interface LtiFieldSpec {
  field: LtiPlatformField;
  label: string;
  /** Nombre del campo en la pantalla del LMS (Moodle: «Detalles de configuración»). */
  help: string;
  multiline?: boolean;
  type?: "text" | "url";
}

export const LTI_FIELDS: readonly LtiFieldSpec[] = [
  { field: "name", label: "Nombre", help: "Para reconocerla aquí, por ejemplo «Moodle UPAO»." },
  { field: "issuer", label: "Issuer", help: "En Moodle: «ID de la plataforma».", type: "url" },
  { field: "client_id", label: "Client ID", help: "En Moodle: «ID de cliente»." },
  {
    field: "deployment_ids",
    label: "Deployment IDs",
    help: "En Moodle: «ID de despliegue». Uno por línea si hay varios.",
    multiline: true,
  },
  {
    field: "auth_login_url",
    label: "URL de autenticación",
    help: "En Moodle: «URL de solicitud de autenticación».",
    type: "url",
  },
  {
    field: "auth_token_url",
    label: "URL del token de acceso",
    help: "En Moodle: «URL del token de acceso».",
    type: "url",
  },
  {
    field: "jwks_url",
    label: "URL del conjunto de claves públicas",
    help: "En Moodle: «URL del conjunto de claves públicas».",
    type: "url",
  },
];
