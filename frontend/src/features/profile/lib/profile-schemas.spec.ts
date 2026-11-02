import { describe, expect, it } from "vitest";

import { profileSchema } from "./profile-schemas";

const valid = {
  full_name: "Ana Torres",
  email: "ana@upao.edu.pe",
  university_id: "",
  gender: "",
  phone_number: "",
};

const universityIdError = (university_id: string) =>
  profileSchema.safeParse({ ...valid, university_id }).error?.issues.find(
    (issue) => issue.path[0] === "university_id",
  )?.message;

describe("profileSchema · código universitario", () => {
  it("rechaza más de 9 dígitos (fuera del INTEGER de la columna)", () => {
    expect(universityIdError("12345678901")).toBe("El código tiene como máximo 9 dígitos.");
  });

  it("acepta un código de 9 dígitos o vacío", () => {
    expect(universityIdError("123456789")).toBeUndefined();
    expect(universityIdError("")).toBeUndefined();
  });
});
