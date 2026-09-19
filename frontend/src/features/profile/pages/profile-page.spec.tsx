import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useProfile } from "../hooks/use-profile";
import { ProfilePage } from "./profile-page";

const handleSaveProfile = vi.fn().mockResolvedValue(true);

interface MockProfile {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  university_id: number | string | null;
  gender: string | null;
  phone_number: string | null;
  created_at: string;
  totp_enabled: boolean;
}

const PROFILE: MockProfile = {
  id: "u-1",
  full_name: "Docente Uno",
  email: "docente@upao.edu.pe",
  role: "usuario",
  university_id: 257022,
  gender: "otro",
  phone_number: "",
  created_at: "2026-01-15T10:00:00Z",
  totp_enabled: false,
};

function mockProfile(data: MockProfile) {
  vi.mocked(useProfile).mockReturnValue({
    data,
    isLoading: false,
  } as unknown as ReturnType<typeof useProfile>);
}

vi.mock("../hooks/use-profile", () => ({
  profileKeys: { all: ["profile"] },
  useProfile: vi.fn(),
}));

vi.mock("../hooks/use-profile-actions", () => ({
  useProfileActions: () => ({
    handleSaveProfile,
    handleChangePassword: vi.fn(),
    handleDeleteAccount: vi.fn(),
    isSavingProfile: false,
    isChangingPassword: false,
    isDeletingAccount: false,
    deleteError: "",
    resetDeleteError: vi.fn(),
  }),
}));

describe("ProfilePage", () => {
  beforeEach(() => {
    handleSaveProfile.mockClear();
    mockProfile(PROFILE);
  });

  it("permite guardar el perfil con los valores editados", async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    const nameInput = screen.getByLabelText("Nombre Completo");
    await user.clear(nameInput);
    await user.type(nameInput, "Docente Actualizado");

    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));

    await waitFor(() => {
      expect(handleSaveProfile).toHaveBeenCalledTimes(1);
    });
    expect(handleSaveProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: "Docente Actualizado",
        email: "docente@upao.edu.pe",
      }),
    );
  });

  it("normaliza los campos nulos del backend a cadenas vacías", () => {
    mockProfile({
      ...PROFILE,
      full_name: null,
      university_id: null,
      gender: null,
      phone_number: null,
    });

    render(<ProfilePage />);

    expect(screen.getByLabelText("Código Universitario (UPAO)")).toHaveValue("");
    expect(screen.getByLabelText("Teléfono de contacto")).toHaveValue("");
    expect(screen.getByLabelText("Sexo / Género")).toHaveValue("otro");
    expect(screen.queryByDisplayValue("null")).not.toBeInTheDocument();
  });

  it("muestra las pestañas en una fila superior, no como columna lateral", () => {
    render(<ProfilePage />);

    const tabList = screen.getByRole("tablist");
    const tabsRoot = tabList.parentElement;

    expect(tabsRoot).not.toBeNull();
    expect(tabsRoot?.className).toContain("flex-col");
    expect(tabList.className).toContain("overflow-x-auto");
  });
});
