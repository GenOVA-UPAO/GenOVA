import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Button } from "./button";

describe("Button", () => {
  it("renders its content", () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Entrar</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("disables the native button when disabled", () => {
    const { rerender } = render(<Button>Enviar</Button>);
    expect(screen.getByRole("button", { name: "Enviar" })).toBeEnabled();
    rerender(<Button disabled>Enviar</Button>);
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
  });

  it("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>Abrir</Button>);
    expect(screen.getByRole("button", { name: "Abrir" })).toHaveAttribute("type", "button");
  });

  it("forwards type=submit to the native button so forms actually submit", () => {
    render(<Button type="submit">Guardar</Button>);
    expect(screen.getByRole("button", { name: "Guardar" })).toHaveAttribute("type", "submit");
  });

  it("is disabled and busy while loading", () => {
    render(<Button loading>Guardar</Button>);
    const btn = screen.getByRole("button", { name: "Guardar" });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
  });
});
