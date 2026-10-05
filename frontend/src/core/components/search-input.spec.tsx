import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "i18next";
import { useState } from "react";

import { SearchInput } from "./search-input";

function Harness({
  initial = "",
  onChange,
}: Readonly<{ initial?: string; onChange?: (v: string) => void }>) {
  const [value, setValue] = useState(initial);
  return (
    <SearchInput
      value={value}
      ariaLabel="Buscar OVAs"
      onValueChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe("SearchInput", () => {
  it("actualiza los nombres accesibles sin desmontar al cambiar de idioma", async () => {
    render(<SearchInput value="react" onValueChange={vi.fn()} />);
    expect(screen.getByRole("searchbox", { name: "Buscar" })).toHaveAttribute("placeholder", "Buscar…");
    await act(() => i18n.changeLanguage("en"));
    expect(screen.getByRole("searchbox", { name: "Search" })).toHaveAttribute("placeholder", "Search…");
    expect(screen.getByRole("button", { name: "Clear search" })).toBeInTheDocument();
  });
  it("uses the given aria-label and default placeholder", () => {
    render(<Harness />);
    const input = screen.getByRole("searchbox", { name: "Buscar OVAs" });
    expect(input).toHaveAttribute("placeholder", "Buscar…");
  });

  it("emits every change and hides the clear button while empty", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    expect(screen.queryByRole("button", { name: "Limpiar búsqueda" })).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole("searchbox"), "ab");
    expect(onChange).toHaveBeenLastCalledWith("ab");
    expect(screen.getByRole("button", { name: "Limpiar búsqueda" })).toBeInTheDocument();
  });

  it("clears the value with the clear button", async () => {
    render(<Harness initial="react" />);
    await userEvent.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Limpiar búsqueda" })).not.toBeInTheDocument();
  });
});
