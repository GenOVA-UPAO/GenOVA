import type { ProfileData, ProfileFormValues } from "./types";

const EMPTY_FORM: ProfileFormValues = {
  full_name: "",
  email: "",
  university_id: "",
  gender: "otro",
  phone_number: "",
};

export function getInitials(fullName?: string | null): string {
  if (fullName === null || fullName === undefined || fullName.trim() === "") return "U";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
}

export function formatDate(isoString?: string | null): string {
  if (isoString === null || isoString === undefined || isoString === "") return "-";
  return new Date(isoString).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function resolveGender(value: string | null | undefined): string {
  if (value !== null && value !== undefined && value !== "") return value;
  return "otro";
}

export function profileToFormValues(profile: ProfileData | null): ProfileFormValues {
  if (profile === null) return EMPTY_FORM;

  return {
    full_name: profile.full_name ?? "",
    email: profile.email ?? "",
    university_id:
      profile.university_id !== undefined && profile.university_id !== null
        ? String(profile.university_id)
        : "",
    gender: resolveGender(profile.gender),
    phone_number: profile.phone_number ?? "",
  };
}
