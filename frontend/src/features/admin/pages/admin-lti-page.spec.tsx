import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LtiPlatform } from "../api/admin-lti.api";
import { AdminLtiPage } from "./admin-lti-page";

const saveMutate = vi.fn();
const deleteMutate = vi.fn();

const platformsQuery = {
  data: [] as LtiPlatform[],
  isLoading: false,
  error: null as Error | null,
  refetch: vi.fn(),
};

vi.mock("../hooks/use-admin-lti", () => ({
  useLtiTool: () => ({
    data: {
      tool_url: "https://api.genova.test",
      login_url: "https://api.genova.test/lti/login",
      launch_url: "https://api.genova.test/lti/launch",
      deep_link_url: "https://api.genova.test/lti/launch",
      jwks_url: "https://api.genova.test/lti/jwks",
      kid: "k1",
      tool_url_configured: true,
    },
    isLoading: false,
    error: null,
  }),
  useLtiPlatforms: () => platformsQuery,
  useSaveLtiPlatform: () => ({ mutate: saveMutate, isPending: false, error: null, reset: vi.fn() }),
  useDeleteLtiPlatform: () => ({ mutate: deleteMutate, isPending: false }),
}));

const moodle: LtiPlatform = {
  id: "p1",
  name: "Moodle UPAO",
  issuer: "https://moodle.upao.test",
  client_id: "abc",
  deployment_ids: ["1"],
  auth_login_url: "https://moodle.upao.test/mod/lti/auth.php",
  auth_token_url: "https://moodle.upao.test/mod/lti/token.php",
  jwks_url: "https://moodle.upao.test/mod/lti/certs.php",
  is_active: true,
};

describe("AdminLtiPage", () => {
  beforeEach(() => {
    saveMutate.mockClear();
    deleteMutate.mockClear();
    platformsQuery.data = [];
  });

  it("muestra las URLs de GenOVA que se pegan en el LMS", () => {
    render(<AdminLtiPage />);
    expect(screen.getByText("https://api.genova.test/lti/login")).toBeInTheDocument();
    expect(screen.getByText("https://api.genova.test/lti/jwks")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copiar URL de inicio de sesión" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Aún no hay plataformas")).toBeInTheDocument();
  });

  it("valida el formulario y enfoca el primer campo con error", async () => {
    const user = userEvent.setup();
    render(<AdminLtiPage />);
    await user.click(screen.getAllByRole("button", { name: /Registrar plataforma/ })[0]);
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Registrar plataforma" }));
    expect(saveMutate).not.toHaveBeenCalled();
    expect(within(dialog).getByLabelText("Nombre")).toHaveFocus();
    expect(within(dialog).getByText("Indica al menos un Deployment ID.")).toBeInTheDocument();
    await act(() => i18n.changeLanguage("en"));
    expect(screen.getByRole("dialog", { name: "Register LTI platform" })).toBeVisible();
    expect(within(dialog).getByLabelText("Name")).toHaveFocus();
    expect(within(dialog).getByText("Enter at least one Deployment ID.")).toBeVisible();
    await user.type(within(dialog).getByLabelText("Issuer"), "https://moodle.upao.test");
    expect(within(dialog).getByText("In Moodle: “Platform ID”.")).toBeVisible();
  });

  it("registra una plataforma con los datos normalizados", async () => {
    const user = userEvent.setup();
    render(<AdminLtiPage />);
    await user.click(screen.getAllByRole("button", { name: /Registrar plataforma/ })[0]);
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Nombre"), "Moodle UPAO");
    await user.type(within(dialog).getByLabelText("Issuer"), moodle.issuer);
    await user.type(within(dialog).getByLabelText("Client ID"), "abc");
    await user.type(within(dialog).getByLabelText("Deployment IDs"), "1, 2");
    await user.type(within(dialog).getByLabelText("URL de autenticación"), moodle.auth_login_url);
    await user.type(
      within(dialog).getByLabelText("URL del token de acceso"),
      moodle.auth_token_url,
    );
    await user.type(
      within(dialog).getByLabelText("URL del conjunto de claves públicas"),
      moodle.jwks_url,
    );
    await user.click(within(dialog).getByRole("button", { name: "Registrar plataforma" }));
    expect(saveMutate).toHaveBeenCalledWith(
      { id: null, payload: { ...moodle, id: undefined, deployment_ids: ["1", "2"] } },
      expect.anything(),
    );
  });

  it("lista las plataformas y edita con los datos cargados", async () => {
    platformsQuery.data = [moodle];
    const user = userEvent.setup();
    render(<AdminLtiPage />);
    const row = screen.getByTestId("lti-platform-row");
    expect(within(row).getByText("Activa")).toBeInTheDocument();
    await user.click(within(row).getByRole("button", { name: /Editar/ }));
    expect(screen.getByLabelText("Client ID")).toHaveValue("abc");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(saveMutate.mock.calls[0][0]).toMatchObject({ id: "p1" });
  });

  it("traduce pantalla, contador y confirmación sin cambiar el nombre de la plataforma", async () => {
    platformsQuery.data = [{ ...moodle, deployment_ids: ["1", "2"] }];
    const user = userEvent.setup();
    render(<AdminLtiPage />);
    expect(screen.getByText(/2 despliegues/)).toBeVisible();
    await act(() => i18n.changeLanguage("en"));
    expect(screen.getByRole("heading", { name: "LTI integration" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Copy Login URL" })).toBeVisible();
    expect(screen.getByText(/2 deployments/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Delete Moodle UPAO" }));
    expect(screen.getByRole("alertdialog", { name: "Delete “Moodle UPAO”?" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Delete platform" })).toBeDisabled();
  });
});
