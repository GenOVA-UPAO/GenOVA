import { render, screen } from "@testing-library/angular/zoneless";

import { ButtonComponent } from "./button.component";

describe("ButtonComponent", () => {
  it("renders projected content", async () => {
    await render(`<gn-button>Guardar</gn-button>`, { imports: [ButtonComponent] });
    expect(screen.getByRole("button", { name: "Guardar" })).toBeTruthy();
  });

  it("emits onClick when clicked", async () => {
    const onClick = vi.fn();
    await render(`<gn-button (onClick)="onClick()">Entrar</gn-button>`, {
      imports: [ButtonComponent],
      wrapperProperties: { onClick },
    });

    screen.getByRole("button", { name: "Entrar" }).click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("disables the native button when disabled", async () => {
    const { fixture } = await render(`<gn-button [disabled]="disabled">Enviar</gn-button>`, {
      imports: [ButtonComponent],
      wrapperProperties: { disabled: false },
    });
    const btn = () => screen.getByRole<HTMLButtonElement>("button", { name: "Enviar" });
    expect(btn().disabled).toBe(false);

    (fixture.componentInstance as { disabled: boolean }).disabled = true;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(btn().disabled).toBe(true);
  });

  it("forwards type=submit to the native button so forms actually submit", async () => {
    await render(`<gn-button type="submit">Guardar</gn-button>`, { imports: [ButtonComponent] });
    const btn = screen.getByRole<HTMLButtonElement>("button", { name: "Guardar" });
    expect(btn.getAttribute("type")).toBe("submit");
  });
});
