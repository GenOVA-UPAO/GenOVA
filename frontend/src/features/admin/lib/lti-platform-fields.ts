import type { LtiPlatformField } from "./lti-platform-form";

export interface LtiFieldSpec {
  field: LtiPlatformField;
  labelKey: string;
  /** Nombre del campo en la pantalla del LMS (Moodle: «Detalles de configuración»). */
  helpKey: string;
  multiline?: boolean;
  type?: "text" | "url";
}

export const LTI_FIELDS: readonly LtiFieldSpec[] = [
  { field: "name", labelKey: "lti:fields.name.label", helpKey: "lti:fields.name.help" },
  { field: "issuer", labelKey: "lti:fields.issuer.label", helpKey: "lti:fields.issuer.help", type: "url" },
  { field: "client_id", labelKey: "lti:fields.client_id.label", helpKey: "lti:fields.client_id.help" },
  {
    field: "deployment_ids",
    labelKey: "lti:fields.deployment_ids.label",
    helpKey: "lti:fields.deployment_ids.help",
    multiline: true,
  },
  {
    field: "auth_login_url",
    labelKey: "lti:fields.auth_login_url.label",
    helpKey: "lti:fields.auth_login_url.help",
    type: "url",
  },
  {
    field: "auth_token_url",
    labelKey: "lti:fields.auth_token_url.label",
    helpKey: "lti:fields.auth_token_url.help",
    type: "url",
  },
  {
    field: "jwks_url",
    labelKey: "lti:fields.jwks_url.label",
    helpKey: "lti:fields.jwks_url.help",
    type: "url",
  },
];
