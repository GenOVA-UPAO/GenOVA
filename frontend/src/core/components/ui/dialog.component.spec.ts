import { render, screen } from "@testing-library/angular/zoneless";

import { DialogComponent } from "./dialog.component";

describe("DialogComponent", () => {
  it("does not render content when closed", async () => {
    await render(`<gn-dialog [open]="false"><p>Contenido secreto</p></gn-dialog>`, {
      imports: [DialogComponent],
    });
    expect(screen.queryByText("Contenido secreto")).toBeNull();
  });

  it("renders content in the CDK overlay when open", async () => {
    await render(`<gn-dialog [open]="true"><p>Hola mundo</p></gn-dialog>`, {
      imports: [DialogComponent],
    });
    expect(screen.getByText("Hola mundo")).toBeTruthy();
  });

  it("emits openChange(false) on Escape unless disableClose is set", async () => {
    const openChange = vi.fn();
    await render(
      `<gn-dialog [open]="true" (openChange)="openChange($event)"><p>Editable</p></gn-dialog>`,
      { imports: [DialogComponent], wrapperProperties: { openChange } },
    );

    screen
      .getByText("Editable")
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(openChange).toHaveBeenCalledWith(false);
  });
});
