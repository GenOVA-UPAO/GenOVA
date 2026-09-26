import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CatalogModel } from "../lib/user-llm-settings.types";
import { useCatalogBrowser } from "./use-catalog-browser";

const model = (id: string): CatalogModel => ({ provider: "p", model_id: id, label: id });
const MODELS = [model("alfa"), model("beta"), model("gamma")];

function setup() {
  let favorites = new Set<string>(["gamma"]);
  // Como en la app, cada cambio de favoritos trae una función nueva.
  const hook = renderHook(
    ({ favs }) => useCatalogBrowser(MODELS, (m: CatalogModel) => favs.has(m.model_id)),
    { initialProps: { favs: favorites } },
  );
  const order = () => hook.result.current.results.map((m) => m.model_id);
  // Como la estrella: primero se guarda el sitio y luego cambia el favorito.
  const toggle = (id: string) => {
    act(() => {
      hook.result.current.holdPlace(model(id));
    });
    favorites = new Set(favorites);
    if (favorites.has(id)) favorites.delete(id);
    else favorites.add(id);
    hook.rerender({ favs: favorites });
  };
  return { hook, order, toggle };
}

describe("useCatalogBrowser", () => {
  it("marcar un favorito no mueve su fila mientras el catálogo está abierto", () => {
    const { hook, order, toggle } = setup();
    expect(order()).toEqual(["gamma", "alfa", "beta"]);
    toggle("beta");
    expect(order()).toEqual(["gamma", "alfa", "beta"]);
    expect(hook.result.current.favoritesCount).toBe(2);
    toggle("gamma");
    expect(order()).toEqual(["gamma", "alfa", "beta"]);
  });

  it("reordena al cambiar el orden, los filtros o al reabrir", () => {
    const { hook, order, toggle } = setup();
    toggle("beta");
    act(() => {
      hook.result.current.setFilters({ sort: "recommended" });
    });
    expect(order()).toEqual(["beta", "gamma", "alfa"]);
    toggle("alfa");
    act(() => {
      hook.result.current.reset();
    });
    expect(order()).toEqual(["alfa", "beta", "gamma"]);
  });

  it("con «Favoritos», quitar uno no lo saca de la lista hasta volver a filtrar", () => {
    const { hook, order, toggle } = setup();
    act(() => {
      hook.result.current.setFilters({ favorites: true });
    });
    expect(order()).toEqual(["gamma"]);
    toggle("gamma");
    expect(order()).toEqual(["gamma"]);
    act(() => {
      hook.result.current.clear();
    });
    act(() => {
      hook.result.current.setFilters({ favorites: true });
    });
    expect(order()).toEqual([]);
  });
});
