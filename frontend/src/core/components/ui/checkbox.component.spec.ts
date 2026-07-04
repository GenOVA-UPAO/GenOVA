import { render, screen } from "@testing-library/angular/zoneless";

import { CheckboxComponent } from "./checkbox.component";

describe("CheckboxComponent", () => {
  it("reflects the checked input on the underlying hlm-checkbox", async () => {
    await render(`<gn-checkbox [checked]="true"></gn-checkbox>`, {
      imports: [CheckboxComponent],
    });
    expect(screen.getByRole("checkbox").getAttribute("aria-checked")).toBe("true");
  });

  it("emits checkedChange when toggled", async () => {
    const checkedChange = vi.fn();
    await render(
      `<gn-checkbox [checked]="false" (checkedChange)="checkedChange($event)"></gn-checkbox>`,
      {
        imports: [CheckboxComponent],
        wrapperProperties: { checkedChange },
      },
    );

    screen.getByRole("checkbox").click();
    expect(checkedChange).toHaveBeenCalledWith(true);
  });

  it("disables the checkbox when disabled is true", async () => {
    await render(`<gn-checkbox [disabled]="true"></gn-checkbox>`, {
      imports: [CheckboxComponent],
    });
    const checkbox = screen.getByRole<HTMLButtonElement>("checkbox");
    expect(checkbox.disabled).toBe(true);
    expect(checkbox.getAttribute("data-disabled")).toBe("true");
  });
});
