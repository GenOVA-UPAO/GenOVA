import { describe, expect, it } from "vitest";

import { validateUserForm } from "./user-form";

const valid = {
  full_name: "Ana Gómez",
  email: "ana@example.com",
  university_id: "",
  gender: "",
  phone_number: "",
};

describe("validateUserForm", () => {
  it("accepts a valid profile", () => {
    expect(validateUserForm(valid)).toEqual({});
  });

  it("requires at least 3 characters in the name, like the backend", () => {
    expect(validateUserForm({ ...valid, full_name: "ab" }).full_name).toBe(
      "El nombre debe tener al menos 3 caracteres.",
    );
    expect(validateUserForm({ ...valid, full_name: "  " }).full_name).toBe(
      "El nombre completo es requerido.",
    );
  });

  it("rejects a university id lower than 1", () => {
    expect(validateUserForm({ ...valid, university_id: "0" }).university_id).toBe(
      "El código debe ser mayor o igual a 1.",
    );
    expect(validateUserForm({ ...valid, university_id: "12" }).university_id).toBeUndefined();
  });
});
