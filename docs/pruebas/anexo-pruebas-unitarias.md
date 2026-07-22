# Anexo — Casos de prueba unitarios y BDD (código y salida)

> Complemento del *Reporte de Pruebas Unitarias y BDD*. Recoge **una ficha por caso de prueba** con su escenario, el código que lo implementa y la salida obtenida en la corrida del 22/07/2026. Las tres suites se ejecutaron con reporteros en formato máquina (`json` de Vitest, `message` de Cucumber y `--junitxml` de pytest), de modo que la salida de cada ficha procede del ejecutor, no de una transcripción manual.

## Suite 1 — Pruebas de componente (Vitest + Testing Library)

Ejecutadas con `pnpm --filter frontend test` sobre 49 archivos de especificación: **140 de 140 casos en verde**. Cada caso monta el componente real en un DOM de pruebas (happy-dom) sin navegador ni backend.

### `frontend/src/app/app.spec.ts`

#### CU-001 · should create the app

**Escenario:** AppComponent

**Código:**

```ts
it("should create the app", () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
```

**Salida obtenida:** `PASSED` en 116 ms

### `frontend/src/core/components/ui/button.component.spec.ts`

#### CU-002 · renders projected content

**Escenario:** ButtonComponent

**Código:**

```ts
it("renders projected content", async () => {
    await render(`<gn-button>Guardar</gn-button>`, { imports: [ButtonComponent] });
    expect(screen.getByRole("button", { name: "Guardar" })).toBeTruthy();
  });
```

**Salida obtenida:** `PASSED` en 137 ms

#### CU-003 · emits onClick when clicked

**Escenario:** ButtonComponent

**Código:**

```ts
it("emits onClick when clicked", async () => {
    const onClick = vi.fn();
    await render(`<gn-button (onClick)="onClick()">Entrar</gn-button>`, {
      imports: [ButtonComponent],
      wrapperProperties: { onClick },
    });

    screen.getByRole("button", { name: "Entrar" }).click();
    expect(onClick).toHaveBeenCalledOnce();
  });
```

**Salida obtenida:** `PASSED` en 37 ms

#### CU-004 · disables the native button when disabled

**Escenario:** ButtonComponent

**Código:**

```ts
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
```

**Salida obtenida:** `PASSED` en 28 ms

#### CU-005 · forwards type=submit to the native button so forms actually submit

**Escenario:** ButtonComponent

**Código:**

```ts
it("forwards type=submit to the native button so forms actually submit", async () => {
    await render(`<gn-button type="submit">Guardar</gn-button>`, { imports: [ButtonComponent] });
    const btn = screen.getByRole<HTMLButtonElement>("button", { name: "Guardar" });
    expect(btn.getAttribute("type")).toBe("submit");
  });
```

**Salida obtenida:** `PASSED` en 21 ms

### `frontend/src/core/components/ui/checkbox.component.spec.ts`

#### CU-006 · reflects the checked input on the underlying hlm-checkbox

**Escenario:** CheckboxComponent

**Código:**

```ts
it("reflects the checked input on the underlying hlm-checkbox", async () => {
    await render(`<gn-checkbox [checked]="true"></gn-checkbox>`, {
      imports: [CheckboxComponent],
    });
    expect(screen.getByRole("checkbox").getAttribute("aria-checked")).toBe("true");
  });
```

**Salida obtenida:** `PASSED` en 156 ms

#### CU-007 · emits checkedChange when toggled

**Escenario:** CheckboxComponent

**Código:**

```ts
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
```

**Salida obtenida:** `PASSED` en 49 ms

#### CU-008 · disables the checkbox when disabled is true

**Escenario:** CheckboxComponent

**Código:**

```ts
it("disables the checkbox when disabled is true", async () => {
    await render(`<gn-checkbox [disabled]="true"></gn-checkbox>`, {
      imports: [CheckboxComponent],
    });
    const checkbox = screen.getByRole<HTMLButtonElement>("checkbox");
    expect(checkbox.disabled).toBe(true);
    expect(checkbox.getAttribute("data-disabled")).toBe("true");
  });
```

**Salida obtenida:** `PASSED` en 38 ms

### `frontend/src/core/components/ui/dialog.component.spec.ts`

#### CU-009 · does not render content when closed

**Escenario:** DialogComponent

**Código:**

```ts
it("does not render content when closed", async () => {
    await render(`<gn-dialog [open]="false"><p>Contenido secreto</p></gn-dialog>`, {
      imports: [DialogComponent],
    });
    expect(screen.queryByText("Contenido secreto")).toBeNull();
  });
```

**Salida obtenida:** `PASSED` en 135 ms

#### CU-010 · renders content in the CDK overlay when open

**Escenario:** DialogComponent

**Código:**

```ts
it("renders content in the CDK overlay when open", async () => {
    await render(`<gn-dialog [open]="true"><p>Hola mundo</p></gn-dialog>`, {
      imports: [DialogComponent],
    });
    expect(screen.getByText("Hola mundo")).toBeTruthy();
  });
```

**Salida obtenida:** `PASSED` en 128 ms

#### CU-011 · emits openChange(false) on Escape unless disableClose is set

**Escenario:** DialogComponent

**Código:**

```ts
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
```

**Salida obtenida:** `PASSED` en 58 ms

### `frontend/src/core/lib/http.spec.ts`

#### CU-012 · envía credentials y el header X-Requested-With

**Escenario:** apiFetch

**Código:**

```ts
it("envía credentials y el header X-Requested-With", async () => {
    await apiFetch("/api/ovas");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.credentials).toBe("include");
    expect((init.headers as Record<string, string>)["X-Requested-With"]).toBe("XMLHttpRequest");
  });
```

**Salida obtenida:** `PASSED` en 4 ms

#### CU-013 · pone Content-Type JSON solo cuando hay body no-FormData

**Escenario:** apiFetch

**Código:**

```ts
it("pone Content-Type JSON solo cuando hay body no-FormData", async () => {
    await apiFetch("/api/ovas", { method: "POST", body: JSON.stringify({ a: 1 }) });
    await apiFetch("/api/uploads", { method: "POST", body: new FormData() });
    const [, jsonInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [, formInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect((jsonInit.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect((formInit.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });
```

**Salida obtenida:** `PASSED` en 1 ms

#### CU-014 · notifica al AuthExpiredBus en 401 de endpoint protegido

**Escenario:** apiFetch

**Código:**

```ts
it("notifica al AuthExpiredBus en 401 de endpoint protegido", async () => {
    const expired = vi.fn();
    const unsub = AuthExpiredBus.subscribe(expired);
    fetchMock.mockResolvedValue(jsonResponse({}, 401));
    await apiFetch("/api/ovas");
    expect(expired).toHaveBeenCalledTimes(1);
    unsub();
  });
```

**Salida obtenida:** `PASSED` en 1 ms

#### CU-015 · no notifica en 401 de endpoints de auth

**Escenario:** apiFetch

**Código:**

```ts
it("no notifica en 401 de endpoints de auth", async () => {
    const expired = vi.fn();
    const unsub = AuthExpiredBus.subscribe(expired);
    fetchMock.mockResolvedValue(jsonResponse({}, 401));
    await apiFetch("/api/auth/me");
    expect(expired).not.toHaveBeenCalled();
    unsub();
  });
```

**Salida obtenida:** `PASSED` en 1 ms

#### CU-016 · devuelve el body parseado en éxito

**Escenario:** apiJson

**Código:**

```ts
it("devuelve el body parseado en éxito", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await expect(apiJson("/api/ovas")).resolves.toEqual({ ok: true });
  });
```

**Salida obtenida:** `PASSED` en 4 ms

#### CU-017 · devuelve {} cuando la respuesta no trae body JSON

**Escenario:** apiJson

**Código:**

```ts
it("devuelve {} cuando la respuesta no trae body JSON", async () => {
```

**Salida obtenida:** `PASSED` en 1 ms

#### CU-018 · lanza HttpError con message/detail del backend

**Escenario:** apiJson

**Código:**

```ts
it("lanza HttpError con message/detail del backend", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: "OVA no encontrada" }, 404));
    const err = await apiJson("/api/ovas/x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).message).toBe("OVA no encontrada");
    expect((err as HttpError).status).toBe(404);
  });
```

**Salida obtenida:** `PASSED` en 1 ms

#### CU-019 · usa fallbackMsg cuando el error no trae detail ni message

**Escenario:** apiJson

**Código:**

```ts
it("usa fallbackMsg cuando el error no trae detail ni message", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500));
    const err = await apiJson("/api/ovas", {}, { fallbackMsg: "No se pudo cargar." }).catch(
      (e: unknown) => e,
    );
    expect((err as HttpError).message).toBe("No se pudo cargar.");
  });
```

**Salida obtenida:** `PASSED` en 1 ms

#### CU-020 · cae a HTTP <status> sin fallbackMsg ni body

**Escenario:** apiJson

**Código:**

```ts
it("cae a HTTP <status> sin fallbackMsg ni body", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
    const err = await apiJson("/api/ovas").catch((e: unknown) => e);
    expect((err as HttpError).message).toBe("HTTP 503");
    expect((err as HttpError).body).toBeNull();
  });
```

**Salida obtenida:** `PASSED` en 1 ms

### `frontend/src/core/services/modal-stack.service.spec.ts`

#### CU-021 · reports the last pushed id as top

**Escenario:** ModalStackService

**Código:**

```ts
it("reports the last pushed id as top", () => {
    const svc = new ModalStackService();
    const a = svc.push();
    const b = svc.push();

    expect(svc.isTop(a)).toBe(false);
    expect(svc.isTop(b)).toBe(true);
  });
```

**Salida obtenida:** `PASSED` en 1 ms

#### CU-022 · restores the previous top after popping the current one

**Escenario:** ModalStackService

**Código:**

```ts
it("restores the previous top after popping the current one", () => {
    const svc = new ModalStackService();
    const a = svc.push();
    const b = svc.push();

    svc.pop(b);

    expect(svc.isTop(a)).toBe(true);
  });
```

**Salida obtenida:** `PASSED` en 0 ms

#### CU-023 · isTop is false for an empty stack

**Escenario:** ModalStackService

**Código:**

```ts
it("isTop is false for an empty stack", () => {
    const svc = new ModalStackService();
    expect(svc.isTop(0)).toBe(false);
  });
```

**Salida obtenida:** `PASSED` en 0 ms

#### CU-024 · popping an id that is not on the stack is a no-op

**Escenario:** ModalStackService

**Código:**

```ts
it("popping an id that is not on the stack is a no-op", () => {
    const svc = new ModalStackService();
    const a = svc.push();

    svc.pop(9999);

    expect(svc.isTop(a)).toBe(true);
  });
```

**Salida obtenida:** `PASSED` en 0 ms

### `frontend/src/core/theme/theme.service.spec.ts`

#### CU-025 · defaults to 'system' when localStorage has no stored preference

**Escenario:** ThemeService

**Código:**

```ts
it("defaults to 'system' when localStorage has no stored preference", () => {
    const svc = create();
    expect(svc.theme()).toBe("system");
  });
```

**Salida obtenida:** `PASSED` en 13 ms

#### CU-026 · reads a previously stored preference on construction

**Escenario:** ThemeService

**Código:**

```ts
it("reads a previously stored preference on construction", () => {
    localStorage.setItem(STORAGE_KEY, "dark");
    const svc = create();
    expect(svc.theme()).toBe("dark");
  });
```

**Salida obtenida:** `PASSED` en 5 ms

#### CU-027 · setTheme updates the signal and persists to localStorage

**Escenario:** ThemeService

**Código:**

```ts
it("setTheme updates the signal and persists to localStorage", () => {
    const svc = create();
    svc.setTheme("dark");
    expect(svc.theme()).toBe("dark");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");
  });
```

**Salida obtenida:** `PASSED` en 3 ms

#### CU-028 · resolvedTheme mirrors an explicit non-system preference

**Escenario:** ThemeService

**Código:**

```ts
it("resolvedTheme mirrors an explicit non-system preference", () => {
    const svc = create();
    svc.setTheme("light");
    expect(svc.resolvedTheme()).toBe("light");
    svc.setTheme("dark");
    expect(svc.resolvedTheme()).toBe("dark");
  });
```

**Salida obtenida:** `PASSED` en 4 ms

#### CU-029 · applies the 'dark' class to <html> when resolvedTheme is 'dark'

**Escenario:** ThemeService

**Código:**

```ts
it("applies the 'dark' class to <html> when resolvedTheme is 'dark'", () => {
    const svc = create();
    svc.setTheme("dark");
    TestBed.tick();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
```

**Salida obtenida:** `PASSED` en 7 ms

#### CU-030 · removes the 'dark' class from <html> when resolvedTheme is 'light'

**Escenario:** ThemeService

**Código:**

```ts
it("removes the 'dark' class from <html> when resolvedTheme is 'light'", () => {
    const svc = create();
    svc.setTheme("dark");
    TestBed.tick();
    svc.setTheme("light");
    TestBed.tick();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
```

**Salida obtenida:** `PASSED` en 6 ms

#### CU-031 · cycle() moves light -> dark -> system -> light

**Escenario:** ThemeService

**Código:**

```ts
it("cycle() moves light -> dark -> system -> light", () => {
    const svc = create();
    svc.setTheme("light");
    svc.cycle();
    expect(svc.theme()).toBe("dark");
    svc.cycle();
    expect(svc.theme()).toBe("system");
    svc.cycle();
    expect(svc.theme()).toBe("light");
  });
```

**Salida obtenida:** `PASSED` en 8 ms

### `frontend/src/features/llm-settings/components/models-master-detail.component.spec.ts`

#### CU-032 · renders task list and opens catalog

**Escenario:** ModelsMasterDetailComponent

**Código:**

```ts
it("renders task list and opens catalog", async () => {
    const openCatalog = vi.fn();
    await render(ModelsMasterDetailComponent, {
      providers: [{ provide: UserLlmSettingsStore, useValue: stubStore() }],
      importOverrides: overrides,
      bindings: [
        inputBinding("tasks", () => ["texto", "codigo", "imagen"]),
        inputBinding("draft", () => draft),
        inputBinding("adminModels", () => [
          { provider: "groq", model_id: "llama", label: "Llama" },
          { provider: "groq", model_id: "code", label: "Code" },
        ]),
        inputBinding("isAdmin", () => true),
        outputBinding("openCatalog", openCatalog),
      ],
    });

    expect(screen.getByRole("tab", { name: /Texto/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Código/i })).toBeTruthy();
    screen.getByRole("button", { name: /Abrir catálogo/i }).click();
    expect(openCatalog).toHaveBeenCalledOnce();
  });
```

**Salida obtenida:** `PASSED` en 271 ms

#### CU-033 · shows primary+fallbacks pattern for imagen (no media-task-card)

**Escenario:** ModelsMasterDetailComponent

**Código:**

```ts
it("shows primary+fallbacks pattern for imagen (no media-task-card)", async () => {
    const { fixture } = await render(ModelsMasterDetailComponent, {
      providers: [{ provide: UserLlmSettingsStore, useValue: stubStore() }],
      importOverrides: overrides,
      bindings: [
        inputBinding("tasks", () => ["texto", "imagen"]),
        inputBinding("draft", () => draft),
        inputBinding("adminModels", () => [
          { provider: "runware", model_id: "runware:100@1", label: "FLUX", aptitudes: ["imagen"] },
        ]),
        inputBinding("isAdmin", () => true),
      ],
    });

    screen.getByRole("tab", { name: /Imagen/i }).click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(screen.queryByTestId("media-card")).toBeNull();
    expect(screen.getByRole("switch")).toBeTruthy();
    expect(screen.getByText(/Pulsa «Editar cadena»/i)).toBeTruthy();
  });
```

**Salida obtenida:** `PASSED` en 92 ms

#### CU-034 · video switch off by default shows prompts-only message

**Escenario:** ModelsMasterDetailComponent

**Código:**

```ts
it("video switch off by default shows prompts-only message", async () => {
    const { fixture } = await render(ModelsMasterDetailComponent, {
      providers: [{ provide: UserLlmSettingsStore, useValue: stubStore() }],
      importOverrides: overrides,
      bindings: [
        inputBinding("tasks", () => ["video"]),
        inputBinding("draft", () => draft),
        inputBinding("adminModels", () => []),
        inputBinding("isAdmin", () => true),
      ],
    });

    fixture.componentInstance.selectTask("video");
    fixture.detectChanges();
    await fixture.whenStable();
    expect(screen.getByTestId("media-gen-off").textContent).toMatch(/prompts/i);
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
  });
```

**Salida obtenida:** `PASSED` en 79 ms

#### CU-035 · reveals llm-task-row only after Editar cadena

**Escenario:** ModelsMasterDetailComponent

**Código:**

```ts
it("reveals llm-task-row only after Editar cadena", async () => {
    const { fixture } = await render(ModelsMasterDetailComponent, {
      providers: [{ provide: UserLlmSettingsStore, useValue: stubStore() }],
      importOverrides: overrides,
      bindings: [
        inputBinding("tasks", () => ["texto"]),
        inputBinding("draft", () => draft),
        inputBinding("adminModels", () => [
          { provider: "groq", model_id: "llama", label: "Llama" },
        ]),
        inputBinding("isAdmin", () => true),
      ],
    });

    expect(screen.queryByTestId("task-row")).toBeNull();
    expect(screen.getByText(/Pulsa «Editar cadena»/i)).toBeTruthy();

    screen.getByRole("button", { name: /Editar cadena/i }).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(screen.getByTestId("task-row").textContent).toContain("texto");
    expect(screen.getByRole("button", { name: /^Listo$/i })).toBeTruthy();
  });
```

**Salida obtenida:** `PASSED` en 73 ms

### `frontend/src/features/llm-settings/lib/llm-catalog.utils.spec.ts`

#### CU-036 · exposes multimodal embedding audio and video type filters

**Escenario:** HU-034 catalog labels

**Código:**

```ts
it("exposes multimodal embedding audio and video type filters", () => {
    for (const t of ["multimodal", "embedding", "audio", "video", "imagen"]) {
      expect(TYPE_LABELS[t]).toBeTruthy();
    }
  });
```

**Salida obtenida:** `PASSED` en 1 ms

#### CU-037 · labels native image providers

**Escenario:** HU-034 catalog labels

**Código:**

```ts
it("labels native image providers", () => {
    for (const p of ["huggingface", "siliconflow", "runware", "falai", "openrouter"]) {
      expect(CATEGORY_LABELS[p] || PROVIDER_LABELS[p]).toBeTruthy();
      expect(PROVIDER_LABELS[p]).toBeTruthy();
    }
  });
```

**Salida obtenida:** `PASSED` en 1 ms

#### CU-038 · has modality badge for video

**Escenario:** HU-034 catalog labels

**Código:**

```ts
it("has modality badge for video", () => {
    expect(MODALITY_META["video"]?.label).toBe("Video");
  });
```

**Salida obtenida:** `PASSED` en 0 ms

### `frontend/src/features/llm-settings/lib/llmConfigDraft.spec.ts`

#### CU-039 · marks imagen/video as media; video generation defaults off

**Escenario:** llmConfigDraft media

**Código:**

```ts
it("marks imagen/video as media; video generation defaults off", () => {
    expect(isMediaTask("imagen")).toBe(true);
    expect(isMediaTask("video")).toBe(true);
    expect(isMediaTask("texto")).toBe(false);
    expect(defaultGenerationEnabled("video")).toBe(false);
    expect(defaultGenerationEnabled("imagen")).toBe(true);
  });
```

**Salida obtenida:** `PASSED` en 1 ms

#### CU-040 · toDraft/toPayload round-trip generation_enabled

**Escenario:** llmConfigDraft media

**Código:**

```ts
it("toDraft/toPayload round-trip generation_enabled", () => {
    const draft = toDraft(
      {
        defaults: {
          imagen: { provider: "runware", model_id: "runware:100@1" },
        },
        fallbacks: {},
        generation_enabled: { imagen: true, video: false },
      },
      ["imagen", "video", "texto"],
    );
    expect(draft["imagen"].generationEnabled).toBe(true);
    expect(draft["video"].generationEnabled).toBe(false);
    expect(draft["texto"].generationEnabled).toBeUndefined();

    const payload = toPayload(draft, ["imagen", "video", "texto"]);
    expect(payload.generation_enabled).toEqual({ imagen: true, video: false });
    expect(payload.defaults?.["imagen"]?.model_id).toBe("runware:100@1");
  });
```

**Salida obtenida:** `PASSED` en 1 ms

#### CU-041 · filters by aptitudes; multimodal can appear in several tasks

**Escenario:** modelsForTask

**Código:**

```ts
it("filters by aptitudes; multimodal can appear in several tasks", () => {
    expect(modelsForTask(catalog, "imagen").map((m) => m.model_id)).toEqual(["1", "2"]);
    expect(modelsForTask(catalog, "texto").map((m) => m.model_id)).toEqual(["1", "4"]);
    expect(modelsForTask(catalog, "video").map((m) => m.model_id)).toEqual(["3"]);
  });
```

**Salida obtenida:** `PASSED` en 1 ms

#### CU-042 · keeps assigned models even when category filter excludes them

**Escenario:** includeSelectedInPool

**Código:**

```ts
it("keeps assigned models even when category filter excludes them", () => {
    const all = [
      {
        provider: "openrouter",
        model_id: "deepseek/deepseek-v4-flash",
        category: "codigo",
        label: "DeepSeek",
      },
      { provider: "groq", model_id: "llama", category: "texto", label: "Llama" },
    ];
    const pool = modelsForTask(all, "texto");
    expect(pool.map((m) => m.model_id)).toEqual(["llama"]);
    const merged = includeSelectedInPool(pool, all, [
      { provider: "openrouter", model_id: "deepseek/deepseek-v4-flash" },
      { provider: "openrouter", model_id: "other/missing" },
    ]);
    expect(merged.map((m) => m.model_id)).toEqual([
      "llama",
      "deepseek/deepseek-v4-flash",
      "other/missing",
    ]);
  });
```

**Salida obtenida:** `PASSED` en 1 ms

### `frontend/src/features/llm-settings/pages/models-page.component.spec.ts`

#### CU-043 · renders clean header, status strip and three sections for admin

**Escenario:** ModelsPageComponent

**Código:**

```ts
it("renders clean header, status strip and three sections for admin", async () => {
    await renderAdminPage();

    expect(screen.getByRole("heading", { name: "Modelos de IA" })).toBeTruthy();
    expect(screen.queryByText("Configuración")).toBeNull();
    expect(screen.queryByText("Guardar plataforma")).toBeNull();
    expect(screen.getByText("Proveedores conectados")).toBeTruthy();
    expect(screen.getByText("Modelos favoritos")).toBeTruthy();
    expect(screen.getByText("Cambios sin guardar")).toBeTruthy();
    expect(screen.getByRole("tab", { name: /^Modelos$/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /^Credenciales$/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Plataforma/i })).toBeTruthy();
    expect(screen.getByTestId("master-detail")).toBeTruthy();
  });
```

**Salida obtenida:** `PASSED` en 216 ms

#### CU-044 · shows sticky save bar only when dirty

**Escenario:** ModelsPageComponent

**Código:**

```ts
it("shows sticky save bar only when dirty", async () => {
    const { fixture, dirtySig } = await renderAdminPage(false);

    expect(screen.queryByRole("button", { name: "Guardar cambios" })).toBeNull();
    expect(screen.queryByText(/cambios sin guardar en la asignación/i)).toBeNull();

    dirtySig.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeTruthy();
    expect(screen.getByText(/cambios sin guardar en la asignación/i)).toBeTruthy();

    dirtySig.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(screen.queryByRole("button", { name: "Guardar cambios" })).toBeNull();
  });
```

**Salida obtenida:** `PASSED` en 119 ms

#### CU-045 · shows credential subsections for admin

**Escenario:** ModelsPageComponent

**Código:**

```ts
it("shows credential subsections for admin", async () => {
    const { fixture } = await renderAdminPage();

    screen.getByRole("tab", { name: /^Credenciales$/i }).click();
    fixture.detectChanges();
    await fixture.whenStable();

    await waitFor(() => {
      expect(screen.getByText("Tus claves")).toBeTruthy();
      expect(screen.getByText("Claves de la plataforma")).toBeTruthy();
      expect(screen.getByTestId("user-keys")).toBeTruthy();
      expect(screen.getByTestId("platform-keys")).toBeTruthy();
    });
  });
```

**Salida obtenida:** `PASSED` en 64 ms

#### CU-046 · mounts platform nodes card on Plataforma tab (not a metrics chart)

**Escenario:** ModelsPageComponent

**Código:**

```ts
it("mounts platform nodes card on Plataforma tab (not a metrics chart)", async () => {
    const { fixture } = await renderAdminPage();

    screen.getByRole("tab", { name: /Plataforma/i }).click();
    fixture.detectChanges();
    await fixture.whenStable();

    await waitFor(() => {
      expect(screen.getByTestId("platform-nodes")).toBeTruthy();
      expect(screen.getByTestId("platform-capabilities")).toBeTruthy();
      expect(document.querySelector("gn-platform-nodes-card")).toBeTruthy();
      expect(screen.queryByRole("img", { name: /sparkline|métricas|chart/i })).toBeNull();
    });
  });
```

**Salida obtenida:** `PASSED` en 59 ms

### `frontend/src/features/ova-workspace/components/creation/ova-create-form-card.component.spec.ts`

#### CU-047 · EXAMPLE_PROMPT includes tema, objetivos, nivel universitario y machine learning

**Escenario:** OvaCreateFormCardComponent

**Código:**

```ts
it("EXAMPLE_PROMPT includes tema, objetivos, nivel universitario y machine learning", () => {
    expect(EXAMPLE_PROMPT).toMatch(/Tema:/i);
    expect(EXAMPLE_PROMPT).toMatch(/Objetivos:/i);
    expect(EXAMPLE_PROMPT).toMatch(/Nivel educativo:/i);
    expect(EXAMPLE_PROMPT).toMatch(/Universitario/i);
    expect(EXAMPLE_PROMPT).toMatch(
      /machine learning|aprendizaje supervisado|redes neuronales|clasificador/i,
    );
  });
```

**Salida obtenida:** `PASSED` en 6 ms

#### CU-048 · CA-11 / CA-25 shows the three-step guide without optional resources

**Escenario:** OvaCreateFormCardComponent

**Código:**

```ts
it("CA-11 / CA-25 shows the three-step guide without optional resources", async () => {
    await renderForm();
    expect(screen.getByLabelText("Pasos para crear un OVA")).toBeTruthy();
    expect(screen.getByText("1. Describe")).toBeTruthy();
    expect(screen.getByText("2. Elige recursos")).toBeTruthy();
    expect(screen.queryByText(/Configura \(opcional\)/)).toBeNull();
    expect(screen.getByText("3. Genera")).toBeTruthy();
  });
```

**Salida obtenida:** `PASSED` en 254 ms

#### CU-049 · CA-24 help button emits replayTour

**Escenario:** OvaCreateFormCardComponent

**Código:**

```ts
it("CA-24 help button emits replayTour", async () => {
    const replayed: boolean[] = [];
    await renderForm({ onReplayTour: () => replayed.push(true) });

    screen.getByRole("button", { name: "Ver tutorial" }).click();
    expect(replayed).toEqual([true]);
  });
```

**Salida obtenida:** `PASSED` en 76 ms

#### CU-050 · CA-12 useExample emits the first university ML EXAMPLE_PROMPT

**Escenario:** OvaCreateFormCardComponent

**Código:**

```ts
it("CA-12 useExample emits the first university ML EXAMPLE_PROMPT", async () => {
    const emitted: string[] = [];
    await renderForm({ onPromptChange: (v) => emitted.push(v) });

    screen.getByRole("button", { name: "Usar ejemplo de prompt" }).click();
    expect(emitted).toEqual([EXAMPLE_PROMPT]);
    expect(emitted[0]).toMatch(/Universitario/i);
  });
```

**Salida obtenida:** `PASSED` en 66 ms

#### CU-051 · CA-13 toolbar buttons expose aria-labels and sm+ text classes

**Escenario:** OvaCreateFormCardComponent

**Código:**

```ts
it("CA-13 toolbar buttons expose aria-labels and sm+ text classes", async () => {
    const { container } = await renderForm();

    expect(screen.getByRole("button", { name: "Configurar recursos 5E" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Archivos de referencia" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tema visual" })).toBeTruthy();

    const labels = Array.from(container.querySelectorAll('span[class*="sm:inline"]')).map((el) =>
      el.textContent?.trim(),
    );
    expect(labels).toEqual(expect.arrayContaining(["Recursos", "Archivos", "Tema"]));
  });
```

**Salida obtenida:** `PASSED` en 64 ms

#### CU-052 · CA-15 shows missing-characters message and keeps Generar disabled

**Escenario:** OvaCreateFormCardComponent

**Código:**

```ts
it("CA-15 shows missing-characters message and keeps Generar disabled", async () => {
    await renderForm({ prompt: "corto", minChars: 10, canGenerate: false });

    expect(screen.getByText(/Faltan 5 caracteres para generar/)).toBeTruthy();
    const generate = screen.getByRole<HTMLButtonElement>("button", { name: "Generar OVA" });
    expect(generate.disabled).toBe(true);
  });
```

**Salida obtenida:** `PASSED` en 65 ms

#### CU-053 · CA-27 shows missing-phases message when prompt is valid but phases < 2

**Escenario:** OvaCreateFormCardComponent

**Código:**

```ts
it("CA-27 shows missing-phases message when prompt is valid but phases < 2", async () => {
    await renderForm({
      prompt: "prompt suficientemente largo",
      minChars: 10,
      phasesWithResources: 1,
      canGenerate: false,
    });

    expect(screen.getByText(/Selecciona recursos en al menos 2 fases \(falta 1\)/)).toBeTruthy();
    const generate = screen.getByRole<HTMLButtonElement>("button", { name: "Generar OVA" });
    expect(generate.disabled).toBe(true);
  });
```

**Salida obtenida:** `PASSED` en 55 ms

#### CU-054 · CA-16 associates label with the prompt textarea

**Escenario:** OvaCreateFormCardComponent

**Código:**

```ts
it("CA-16 associates label with the prompt textarea", async () => {
    await renderForm();
    const textarea = screen.getByLabelText("Describe el tema del OVA");
    expect(textarea.id).toBe("ova-create-prompt");
    expect(textarea.tagName).toBe("TEXTAREA");
  });
```

**Salida obtenida:** `PASSED` en 46 ms

#### CU-055 · CA-17 prompt has visible focus-visible ring (not ring-0 alone)

**Escenario:** OvaCreateFormCardComponent

**Código:**

```ts
it("CA-17 prompt has visible focus-visible ring (not ring-0 alone)", async () => {
    await renderForm();
    const textarea = screen.getByLabelText("Describe el tema del OVA");
    const cls = textarea.className;
    expect(cls).toContain("focus-visible:ring-2");
    expect(cls).toContain("focus-visible:ring-ring");
    expect(cls.includes("focus-visible:ring-0")).toBe(false);
  });
```

**Salida obtenida:** `PASSED` en 35 ms

#### CU-056 · CA-18 announces errors with role=alert and aria-live=polite

**Escenario:** OvaCreateFormCardComponent

**Código:**

```ts
it("CA-18 announces errors with role=alert and aria-live=polite", async () => {
    await renderForm({ error: "El prompt es obligatorio" });
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("aria-live")).toBe("polite");
    expect(alert.textContent).toContain("El prompt es obligatorio");
  });
```

**Salida obtenida:** `PASSED` en 43 ms

#### CU-057 · CA-19 shows mobile and desktop generate hints with correct visibility classes

**Escenario:** OvaCreateFormCardComponent

**Código:**

```ts
it("CA-19 shows mobile and desktop generate hints with correct visibility classes", async () => {
    const { container } = await renderForm();
    const mobile = Array.from(container.querySelectorAll("p")).find((p) =>
      p.textContent?.includes("Pulsa Generar"),
    );
    const desktop = Array.from(container.querySelectorAll("p")).find((p) =>
      p.textContent?.includes("Ctrl+Enter"),
    );
    expect(mobile?.className).toContain("sm:hidden");
    expect(desktop?.className).toContain("hidden");
    expect(desktop?.className).toContain("sm:block");
  });
```

**Salida obtenida:** `PASSED` en 38 ms

### `frontend/src/features/ova-workspace/components/creation/ova-creation-view.component.spec.ts`

#### CU-058 · al entrar en /crear resetea el flujo (progreso vive en workspace)

**Escenario:** OvaCreationViewComponent

**Código:**

```ts
it("al entrar en /crear resetea el flujo (progreso vive en workspace)", async () => {
    const flow = flowStub();
    await render(OvaCreationViewComponent, {
      providers: [
        { provide: OvaJobService, useValue: jobStub() },
        { provide: OvaCreationFlowService, useValue: flow },
        {
          provide: OvaUploadsService,
          useValue: {
            uploads: () => [],
            activeUploadsCount: () => 0,
            maxUploadFiles: 5,
            isUploadingFiles: () => false,
            uploadError: () => "",
            handleFilesSelected: vi.fn(),
            handleRemoveUpload: vi.fn(),
          },
        },
        {
          provide: CrearOvaTourService,
          useValue: { startIfNeeded: vi.fn(), restart: vi.fn(), destroy: vi.fn() },
        },
      ],
      importOverrides: [
        { replace: OvaCreateFormCardComponent, with: StubFormCard },
        { replace: PhaseSelectModalComponent, with: StubPhaseModal },
      ],
    });

    expect(flow.reset).toHaveBeenCalled();
  });
```

**Salida obtenida:** `PASSED` en 54 ms

### `frontend/src/features/ova-workspace/components/editor/ova-edit-view.component.spec.ts`

#### CU-059 · onEditPhase guarda el contenido de la fase vía el servicio

**Escenario:** OvaEditViewComponent — enlaces del panel OVA

**Código:**

```ts
it("onEditPhase guarda el contenido de la fase vía el servicio", async () => {
    const ws = wsStub();
    const { panel } = await renderView(ws);

    panel.onEditPhase.emit({ content: "<p>editado</p>", phaseId: "fase-1" });

    expect(ws.savePhase).toHaveBeenCalledWith("fase-1", "<p>editado</p>");
  });
```

**Salida obtenida:** `PASSED` en 179 ms

#### CU-060 · onRegenPhase dispara una regeneración acotada a esa fase

**Escenario:** OvaEditViewComponent — enlaces del panel OVA

**Código:**

```ts
it("onRegenPhase dispara una regeneración acotada a esa fase", async () => {
    const ws = wsStub();
    const { panel } = await renderView(ws);

    panel.onRegenPhase.emit({ phaseId: "fase-1", prompt: "más ejemplos" });

    expect(ws.runRegen).toHaveBeenCalledWith({ faseIds: ["fase-1"], prompt: "más ejemplos" });
  });
```

**Salida obtenida:** `PASSED` en 68 ms

#### CU-061 · onDeletePhase elimina la fase vía el servicio

**Escenario:** OvaEditViewComponent — enlaces del panel OVA

**Código:**

```ts
it("onDeletePhase elimina la fase vía el servicio", async () => {
    const ws = wsStub();
    const { panel } = await renderView(ws);

    panel.onDeletePhase.emit("fase-1");

    expect(ws.deletePhase).toHaveBeenCalledWith("fase-1");
  });
```

**Salida obtenida:** `PASSED` en 55 ms

#### CU-062 · onAddPhase añade un recurso con tipo y prompt

**Escenario:** OvaEditViewComponent — enlaces del panel OVA

**Código:**

```ts
it("onAddPhase añade un recurso con tipo y prompt", async () => {
    const ws = wsStub();
    const { panel } = await renderView(ws);

    panel.onAddPhase.emit({ phaseType: "explore", prompt: "una lectura" });

    expect(ws.addPhase).toHaveBeenCalledWith("explore", "una lectura");
  });
```

**Salida obtenida:** `PASSED` en 46 ms

#### CU-063 · onReorder envía la lista reordenada al servicio

**Escenario:** OvaEditViewComponent — enlaces del panel OVA

**Código:**

```ts
it("onReorder envía la lista reordenada al servicio", async () => {
    const ws = wsStub();
    const { panel } = await renderView(ws);
    const reordered = [
      { id: "b", phase_type: "engage" },
      { id: "a", phase_type: "engage" },
    ];

    panel.onReorder.emit(reordered);

    expect(ws.reorderPhases).toHaveBeenCalledWith(reordered);
  });
```

**Salida obtenida:** `PASSED` en 40 ms

### `frontend/src/features/ova-workspace/components/modals/phase-select-modal.component.spec.ts`

#### CU-064 · CA-3 falls back to the first resource of the active phase when nothing is hovered or picked

**Escenario:** PhaseSelectModalComponent — 3a previewResource default

**Código:**

```ts
it("CA-3 falls back to the first resource of the active phase when nothing is hovered or picked", async () => {
    const { fixture } = await renderModal();
    const cmp = fixture.componentInstance;

    expect(cmp.previewResource()).toEqual(ENGAGE_RESOURCES[0]);
  });
```

**Salida obtenida:** `PASSED` en 261 ms

#### CU-065 · CA-4 prefers the hovered resource over the default fallback

**Escenario:** PhaseSelectModalComponent — 3a previewResource default

**Código:**

```ts
it("CA-4 prefers the hovered resource over the default fallback", async () => {
    const { fixture } = await renderModal();
    const cmp = fixture.componentInstance;

    cmp.setHovered(ENGAGE_RESOURCES[1]);
    fixture.detectChanges();

    expect(cmp.previewResource()).toEqual(ENGAGE_RESOURCES[1]);
  });
```

**Salida obtenida:** `PASSED` en 119 ms

#### CU-066 · CA-5 prefers the last pick over the default fallback once hover clears

**Escenario:** PhaseSelectModalComponent — 3a previewResource default

**Código:**

```ts
it("CA-5 prefers the last pick over the default fallback once hover clears", async () => {
    const { fixture } = await renderModal();
    const cmp = fixture.componentInstance;

    cmp.toggleResource(ENGAGE_RESOURCES[1]);
    cmp.setHovered(null);
    fixture.detectChanges();

    expect(cmp.previewResource()).toEqual(ENGAGE_RESOURCES[1]);
  });
```

**Salida obtenida:** `PASSED` en 106 ms

### `frontend/src/features/ova-workspace/components/modals/resource-preview-panel.component.spec.ts`

#### CU-067 · shows the empty-state hint when no resource is given (CA-1)

**Escenario:** ResourcePreviewPanelComponent

**Código:**

```ts
it("shows the empty-state hint when no resource is given (CA-1)", async () => {
    await render(ResourcePreviewPanelComponent, {
      bindings: [inputBinding("resource", () => null), inputBinding("phaseKey", () => "engage")],
    });

    expect(
      screen.getByText("Pasa el cursor o selecciona un recurso para ver qué genera"),
    ).toBeTruthy();
  });
```

**Salida obtenida:** `PASSED` en 71 ms

#### CU-068 · renders the mini-wireframe sketch and the 'returns' description for a known resource (CA-2)

**Escenario:** ResourcePreviewPanelComponent

**Código:**

```ts
it("renders the mini-wireframe sketch and the 'returns' description for a known resource (CA-2)", async () => {
    const { container } = await render(ResourcePreviewPanelComponent, {
      bindings: [
        inputBinding("resource", () => ENGAGE_COMIC),
        inputBinding("phaseKey", () => "engage"),
        inputBinding("phaseColor", () => "#EF4444"),
      ],
    });

    expect(container.querySelector("gn-resource-wireframe")).toBeTruthy();
    expect(
      screen.getByText("Página HTML con viñetas clicables y una pregunta final."),
    ).toBeTruthy();
    // Comic wireframe: single panel + 3-dot carousel nav (not a 2×2 grid).
    expect(container.querySelectorAll(".h-1.w-1.rounded-full").length).toBe(3);
  });
```

**Salida obtenida:** `PASSED` en 43 ms

#### CU-069 · falls back to the unavailable-preview message for a resource with no preview info

**Escenario:** ResourcePreviewPanelComponent

**Código:**

```ts
it("falls back to the unavailable-preview message for a resource with no preview info", async () => {
    await render(ResourcePreviewPanelComponent, {
      bindings: [
        inputBinding("resource", (): Resource => ({ id: "999", tipo: "X" })),
        inputBinding("phaseKey", () => "engage"),
      ],
    });

    expect(screen.getByText("Vista previa no disponible para este recurso.")).toBeTruthy();
  });
```

**Salida obtenida:** `PASSED` en 22 ms

### `frontend/src/features/ova-workspace/components/modals/resource-wireframe.component.spec.ts`

#### CU-070 · renders a sketch for wire kind 'comic' without throwing

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
```

**Salida obtenida:** `PASSED` en 129 ms

#### CU-071 · renders a sketch for wire kind 'storyboard' without throwing

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
```

**Salida obtenida:** `PASSED` en 14 ms

#### CU-072 · renders a sketch for wire kind 'audio' without throwing

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
```

**Salida obtenida:** `PASSED` en 20 ms

#### CU-073 · renders a sketch for wire kind 'chat' without throwing

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
```

**Salida obtenida:** `PASSED` en 26 ms

#### CU-074 · renders a sketch for wire kind 'decisions' without throwing

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
```

**Salida obtenida:** `PASSED` en 15 ms

#### CU-075 · renders a sketch for wire kind 'lab' without throwing

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
```

**Salida obtenida:** `PASSED` en 14 ms

#### CU-076 · renders a sketch for wire kind 'dashboard' without throwing

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
```

**Salida obtenida:** `PASSED` en 13 ms

#### CU-077 · renders a sketch for wire kind 'code' without throwing

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
```

**Salida obtenida:** `PASSED` en 8 ms

#### CU-078 · renders a sketch for wire kind 'demo' without throwing

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
```

**Salida obtenida:** `PASSED` en 15 ms

#### CU-079 · renders a sketch for wire kind 'quiz' without throwing

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
```

**Salida obtenida:** `PASSED` en 12 ms

#### CU-080 · renders a sketch for wire kind 'read' without throwing

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
```

**Salida obtenida:** `PASSED` en 30 ms

#### CU-081 · renders a sketch for wire kind 'graph' without throwing

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
```

**Salida obtenida:** `PASSED` en 21 ms

#### CU-082 · renders a sketch for wire kind 'matching' without throwing

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
```

**Salida obtenida:** `PASSED` en 8 ms

#### CU-083 · renders a sketch for wire kind 'cardGrid' without throwing

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
```

**Salida obtenida:** `PASSED` en 7 ms

#### CU-084 · renders a sketch for wire kind 'dragdrop' without throwing

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
```

**Salida obtenida:** `PASSED` en 13 ms

#### CU-085 · renders a sketch for wire kind 'crossword' without throwing

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
```

**Salida obtenida:** `PASSED` en 14 ms

#### CU-086 · renders a sketch for wire kind 'game' without throwing

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
```

**Salida obtenida:** `PASSED` en 8 ms

#### CU-087 · renders a sketch for wire kind 'timeline' without throwing

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
```

**Salida obtenida:** `PASSED` en 11 ms

#### CU-088 · renders a sketch for wire kind 'form' without throwing

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
```

**Salida obtenida:** `PASSED` en 8 ms

#### CU-089 · renders a sketch for wire kind 'steps' without throwing

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
```

**Salida obtenida:** `PASSED` en 11 ms

#### CU-090 · renders a sketch for wire kind 'accordion' without throwing

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
```

**Salida obtenida:** `PASSED` en 8 ms

#### CU-091 · renders a sketch for wire kind 'table' without throwing

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
```

**Salida obtenida:** `PASSED` en 8 ms

#### CU-092 · renders a sketch for wire kind 'diploma' without throwing

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
```

**Salida obtenida:** `PASSED` en 6 ms

#### CU-093 · renders a sketch for wire kind 'infographic' without throwing

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
```

**Salida obtenida:** `PASSED` en 6 ms

#### CU-094 · paints the accent color from phaseColor on the sketch root

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it("paints the accent color from phaseColor on the sketch root", async () => {
    const { container } = await renderWireframe("storyboard", "#3B82F6");

    const root = container.querySelector<HTMLElement>('[style*="color"]')!;

    // El DOM normaliza todo color inline a `rgb(...)`, así que comparar contra el
    // hex crudo nunca puede pasar. Se normaliza el esperado por la misma vía.
    const expected = document.createElement("div");
    expected.style.color = "#3B82F6";
    expect(root.style.color).toBe(expected.style.color);
  });
```

**Salida obtenida:** `PASSED` en 8 ms

#### CU-095 · comic renders a single panel with nav chrome

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it("comic renders a single panel with nav chrome", async () => {
    const { container } = await renderWireframe("comic");
    expect(container.querySelector(".flex.h-full.w-full.flex-col")).toBeTruthy();
    expect(container.querySelectorAll(".h-1.w-1.rounded-full").length).toBe(3);
  });
```

**Salida obtenida:** `PASSED` en 10 ms

#### CU-096 · storyboard renders stacked frames and a prompt strip

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it("storyboard renders stacked frames and a prompt strip", async () => {
    const { container } = await renderWireframe("storyboard");
    expect(container.querySelector(".border-dashed.border-current\\/50")).toBeTruthy();
    expect(container.querySelectorAll(".w-10.shrink-0").length).toBe(3);
  });
```

**Salida obtenida:** `PASSED` en 16 ms

#### CU-097 · audio renders 8 waveform bars

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it("audio renders 8 waveform bars", async () => {
    const { container } = await renderWireframe("audio");
    expect(container.querySelectorAll(".w-1\\.5.rounded-full:not(.h-1\\.5)").length).toBe(8);
  });
```

**Salida obtenida:** `PASSED` en 20 ms

#### CU-098 · lab fills the canvas with flask svg and control thumbs

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it("lab fills the canvas with flask svg and control thumbs", async () => {
    const { container } = await renderWireframe("lab");
    expect(container.querySelector("svg")).toBeTruthy();
    expect(container.querySelectorAll("svg circle").length).toBe(2);
    expect(
      container.querySelectorAll(".rounded-full.border-2.border-background.bg-current").length,
    ).toBe(2);
  });
```

**Salida obtenida:** `PASSED` en 7 ms

#### CU-099 · decisions renders scenario block and A/B actions

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it("decisions renders scenario block and A/B actions", async () => {
    const { container } = await renderWireframe("decisions");
    expect(container.querySelector(".grid.grid-cols-2")).toBeTruthy();
    expect(container.querySelector(".bg-current")).toBeTruthy();
  });
```

**Salida obtenida:** `PASSED` en 15 ms

#### CU-100 · matching renders two columns

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it("matching renders two columns", async () => {
    const { container } = await renderWireframe("matching");
    expect(container.querySelectorAll(".flex-1.flex-col").length).toBeGreaterThanOrEqual(2);
  });
```

**Salida obtenida:** `PASSED` en 10 ms

#### CU-101 · diploma renders ornamental certificate frame

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it("diploma renders ornamental certificate frame", async () => {
    const { container } = await renderWireframe("diploma");
    expect(container.querySelector(".border-2.border-current\\/50")).toBeTruthy();
  });
```

**Salida obtenida:** `PASSED` en 8 ms

#### CU-102 · crossword renders a 5x5 grid

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it("crossword renders a 5x5 grid", async () => {
    const { container } = await renderWireframe("crossword");
    expect(container.querySelector(".grid-cols-5.grid-rows-5")).toBeTruthy();
    expect(container.querySelectorAll(".grid-cols-5.grid-rows-5 > div").length).toBe(25);
  });
```

**Salida obtenida:** `PASSED` en 9 ms

#### CU-103 · code renders editor lines and run affordance

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it("code renders editor lines and run affordance", async () => {
    const { container } = await renderWireframe("code");
    expect(container.querySelector(".font-mono")).toBeTruthy();
    expect(container.querySelector(".self-end.bg-current")).toBeTruthy();
  });
```

**Salida obtenida:** `PASSED` en 6 ms

#### CU-104 · quiz renders progress, timer cue and 3 choice rows

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it("quiz renders progress, timer cue and 3 choice rows", async () => {
    const { container } = await renderWireframe("quiz");
    expect(container.querySelectorAll(".h-3\\.5.w-3\\.5.shrink-0.rounded-full").length).toBe(3);
    expect(container.querySelector(".border-current\\/60")).toBeTruthy();
  });
```

**Salida obtenida:** `PASSED` en 9 ms

#### CU-105 · timeline renders 4 milestone dots

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it("timeline renders 4 milestone dots", async () => {
    const { container } = await renderWireframe("timeline");
    expect(container.querySelectorAll(".rounded-full.border-2.border-background").length).toBe(4);
  });
```

**Salida obtenida:** `PASSED` en 6 ms

#### CU-106 · game renders a 6-cell board with score chip

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it("game renders a 6-cell board with score chip", async () => {
    const { container } = await renderWireframe("game");
    expect(container.querySelectorAll(".grid-cols-3 > div").length).toBe(6);
  });
```

**Salida obtenida:** `PASSED` en 8 ms

#### CU-107 · graph renders 4 nodes with connecting lines

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it("graph renders 4 nodes with connecting lines", async () => {
    const { container } = await renderWireframe("graph");
    expect(container.querySelectorAll(".rounded-full.border-2.border-background").length).toBe(4);
    expect(container.querySelectorAll("svg line").length).toBe(4);
  });
```

**Salida obtenida:** `PASSED` en 7 ms

#### CU-108 · falls back to the default dashed sketch for an unmapped kind

**Escenario:** ResourceWireframeComponent

**Código:**

```ts
it("falls back to the default dashed sketch for an unmapped kind", async () => {
    const { container } = await renderWireframe("unknown" as WireframeKind);
    expect(container.querySelector(".border-dashed")).toBeTruthy();
  });
```

**Salida obtenida:** `PASSED` en 12 ms

### `frontend/src/features/ova-workspace/lib/previews/preview-wire-remap.spec.ts`

#### CU-109 · maps all 50 resources to a known WireframeKind

**Escenario:** resource preview wire remap

**Código:**

```ts
it("maps all 50 resources to a known WireframeKind", () => {
    const wires: WireframeKind[] = [];
    for (const phase of PHASES) {
      for (let id = 1; id <= 10; id++) {
        const info = getResourcePreview(phase, id);
        expect(info, `${phase}:${id}`).toBeTruthy();
        expect(kindSet.has(info!.wire), `${phase}:${id} → ${info!.wire}`).toBe(true);
        wires.push(info!.wire);
      }
    }
    expect(wires).toHaveLength(50);
  });
```

**Salida obtenida:** `PASSED` en 10 ms

#### CU-110 · uses storyboard for former video resources

**Escenario:** resource preview wire remap

**Código:**

```ts
it("uses storyboard for former video resources", () => {
    expect(getResourcePreview("engage", 2)?.wire).toBe("storyboard");
    expect(getResourcePreview("explore", 4)?.wire).toBe("storyboard");
    expect(getResourcePreview("explain", 1)?.wire).toBe("storyboard");
  });
```

**Salida obtenida:** `PASSED` en 0 ms

#### CU-111 · keeps chat only for Agente Socrático

**Escenario:** resource preview wire remap

**Código:**

```ts
it("keeps chat only for Agente Socrático", () => {
    expect(getResourcePreview("explore", 2)?.wire).toBe("chat");
    expect(getResourcePreview("engage", 7)?.wire).toBe("decisions");
    expect(getResourcePreview("explore", 8)?.wire).toBe("decisions");
  });
```

**Salida obtenida:** `PASSED` en 0 ms

#### CU-112 · splits map/card/game families into specific kinds

**Escenario:** resource preview wire remap

**Código:**

```ts
it("splits map/card/game families into specific kinds", () => {
    expect(getResourcePreview("explore", 9)?.wire).toBe("matching");
    expect(getResourcePreview("explain", 3)?.wire).toBe("graph");
    expect(getResourcePreview("elaborate", 8)?.wire).toBe("cardGrid");
    expect(getResourcePreview("evaluate", 7)?.wire).toBe("crossword");
    expect(getResourcePreview("evaluate", 10)?.wire).toBe("diploma");
    expect(getResourcePreview("elaborate", 7)?.wire).toBe("code");
    expect(getResourcePreview("elaborate", 5)?.wire).toBe("dashboard");
  });
```

**Salida obtenida:** `PASSED` en 0 ms

### `frontend/src/features/ova-workspace/lib/regen-chat.spec.ts`

#### CU-113 · userChatMessage guarda texto y etiquetas de recurso

**Escenario:** regen-chat

**Código:**

```ts
it("userChatMessage guarda texto y etiquetas de recurso", () => {
    const msg = userChatMessage("Mejora el intro", {
      resourceLabels: ["Juego de Gamificación"],
    });
    expect(msg.role).toBe("user");
    expect(msg.text).toBe("Mejora el intro");
    expect(msg.resourceLabels).toEqual(["Juego de Gamificación"]);
  });
```

**Salida obtenida:** `PASSED` en 1 ms

#### CU-114 · labelsForPhaseIds resuelve títulos

**Escenario:** regen-chat

**Código:**

```ts
it("labelsForPhaseIds resuelve títulos", () => {
    expect(
      labelsForPhaseIds(
        [
          { id: "a", phase_type: "engage", title: "Juego" },
          { id: "b", phase_type: "explore", title: "Lab" },
        ],
        ["b"],
      ),
    ).toEqual(["Lab"]);
  });
```

**Salida obtenida:** `PASSED` en 0 ms

#### CU-115 · finishChatPatch nombra el recurso

**Escenario:** regen-chat

**Código:**

```ts
it("finishChatPatch nombra el recurso", () => {
    const user = userChatMessage("hola");
    const asst = {
      id: "asst-1",
      role: "assistant" as const,
      kind: "status" as const,
      text: "…",
      createdAt: 1,
      status: "running" as const,
    };
    const patched = patchChatMessage(
      [user, asst],
      "asst-1",
      finishChatPatch("success", ["Juego de Gamificación"]),
    );
    expect(patched[1].text).toContain("Juego de Gamificación");
  });
```

**Salida obtenida:** `PASSED` en 1 ms

#### CU-116 · formatChatTarget distingue OVA completo y recursos

**Escenario:** regen-chat

**Código:**

```ts
it("formatChatTarget distingue OVA completo y recursos", () => {
    expect(formatChatTarget()).toBe("al OVA completo");
    expect(formatChatTarget(["Lab"])).toBe("a «Lab»");
  });
```

**Salida obtenida:** `PASSED` en 0 ms

#### CU-117 · selection messages reflejan marcar y seleccionar todos

**Escenario:** regen-chat

**Código:**

```ts
it("selection messages reflejan marcar y seleccionar todos", () => {
    expect(selectionToggleMessage("Lab", true).text).toContain("seleccionado");
    expect(selectionAllMessage(["A", "B"], true).text).toContain("todos");
    expect(selectionAllMessage(["A", "B"], false).text).toContain("vació");
  });
```

**Salida obtenida:** `PASSED` en 1 ms

### `frontend/src/features/ova-workspace/lib/resource-label.spec.ts`

#### CU-118 · prioriza el título del recurso

**Escenario:** resourceLabel

**Código:**

```ts
it("prioriza el título del recurso", () => {
    expect(resourceLabel({ id: "1", title: "Juego de Gamificación", phase_type: "engage" })).toBe(
      "Juego de Gamificación",
    );
  });
```

**Salida obtenida:** `PASSED` en 0 ms

#### CU-119 · usa el tipo humanizado si no hay título

**Escenario:** resourceLabel

**Código:**

```ts
it("usa el tipo humanizado si no hay título", () => {
    expect(
      resourceLabel({ id: "1", phase_type: "explore", resource_type: "simulador_virtual" }),
    ).toBe("Simulador Virtual");
  });
```

**Salida obtenida:** `PASSED` en 1 ms

#### CU-120 · cae a la fase 5E en español

**Escenario:** resourceLabel

**Código:**

```ts
it("cae a la fase 5E en español", () => {
    expect(resourceLabel({ id: "1", phase_type: "engage" })).toBe("Enganche");
  });
```

**Salida obtenida:** `PASSED` en 0 ms

#### CU-121 · extrae texto visible y oculta CSS

**Escenario:** contentPlainPreview

**Código:**

```ts
it("extrae texto visible y oculta CSS", () => {
    const html = `<!DOCTYPE html><style>:root{--x:1}</style><p>Hola mundo</p>`;
    expect(contentPlainPreview(html)).toBe("Hola mundo");
  });
```

**Salida obtenida:** `PASSED` en 1 ms

#### CU-122 · indica vacío cuando no hay contenido

**Escenario:** contentPlainPreview

**Código:**

```ts
it("indica vacío cuando no hay contenido", () => {
    expect(contentPlainPreview("")).toBe("Sin contenido todavía.");
  });
```

**Salida obtenida:** `PASSED` en 0 ms

#### CU-123 · marca truncado solo cuando supera el máximo

**Escenario:** contentPlainPreview

**Código:**

```ts
it("marca truncado solo cuando supera el máximo", () => {
    const long = `<p>${"a".repeat(200)}</p>`;
    expect(isContentPreviewTruncated(long, 140)).toBe(true);
    expect(contentPlainText(long).length).toBe(200);
    expect(isContentPreviewTruncated("<p>corto</p>", 140)).toBe(false);
  });
```

**Salida obtenida:** `PASSED` en 1 ms

### `frontend/src/features/ova-workspace/services/crear-ova-tour.service.spec.ts`

#### CU-124 · uses a per-user storage key when userId is available

**Escenario:** CrearOvaTourService

**Código:**

```ts
it("uses a per-user storage key when userId is available", () => {
    expect(service.storageKey()).toBe("genova.crear-ova.tour.done.user-42");
  });
```

**Salida obtenida:** `PASSED` en 22 ms

#### CU-125 · CA-23 marks the tour done so it does not auto-show again

**Escenario:** CrearOvaTourService

**Código:**

```ts
it("CA-23 marks the tour done so it does not auto-show again", () => {
    expect(service.isDone()).toBe(false);
    service.markDone();
    expect(service.isDone()).toBe(true);
    expect(store["genova.crear-ova.tour.done.user-42"]).toBe("1");
  });
```

**Salida obtenida:** `PASSED` en 6 ms

#### CU-126 · CA-22 does not start driver when tour is already done

**Escenario:** CrearOvaTourService

**Código:**

```ts
it("CA-22 does not start driver when tour is already done", () => {
    store["genova.crear-ova.tour.done.user-42"] = "1";
    mountPromptAnchor();

    service.startIfNeeded();

    expect(driverFactory).not.toHaveBeenCalled();
    expect(driveMock).not.toHaveBeenCalled();
  });
```

**Salida obtenida:** `PASSED` en 9 ms

#### CU-127 · CA-22 starts driver with prompt → config → generar steps

**Escenario:** CrearOvaTourService

**Código:**

```ts
it("CA-22 starts driver with prompt → config → generar steps", () => {
    mountPromptAnchor();

    service.startIfNeeded();

    expect(driverFactory).toHaveBeenCalledOnce();
    const opts = driverFactory.mock.calls[0][0]!;
    expect(opts.steps.map((s) => s.element)).toEqual([
      "#tour-crear-ova-prompt",
      "#tour-crear-ova-config",
      "#tour-crear-ova-generar",
    ]);
    expect(driveMock).toHaveBeenCalledOnce();

    opts.onDestroyStarted();
    expect(service.isDone()).toBe(true);
    expect(destroyMock).toHaveBeenCalled();
  });
```

**Salida obtenida:** `PASSED` en 7 ms

#### CU-128 · CA-24 restart starts driver even when tour is already done

**Escenario:** CrearOvaTourService

**Código:**

```ts
it("CA-24 restart starts driver even when tour is already done", () => {
    store["genova.crear-ova.tour.done.user-42"] = "1";
    mountPromptAnchor();

    service.restart();

    expect(driverFactory).toHaveBeenCalledOnce();
    expect(driveMock).toHaveBeenCalledOnce();
  });
```

**Salida obtenida:** `PASSED` en 4 ms

#### CU-129 · CA-24 restart destroys prior instance before starting a new one

**Escenario:** CrearOvaTourService

**Código:**

```ts
it("CA-24 restart destroys prior instance before starting a new one", () => {
    mountPromptAnchor();

    service.startIfNeeded();
    expect(driverFactory).toHaveBeenCalledOnce();

    service.restart();

    expect(destroyMock).toHaveBeenCalled();
    expect(driverFactory).toHaveBeenCalledTimes(2);
    expect(driveMock).toHaveBeenCalledTimes(2);
  });
```

**Salida obtenida:** `PASSED` en 10 ms

#### CU-130 · destroy clears the live instance

**Escenario:** CrearOvaTourService

**Código:**

```ts
it("destroy clears the live instance", () => {
    mountPromptAnchor();
    service.startIfNeeded();
    expect(service.active).toBe(true);

    service.destroy();

    expect(destroyMock).toHaveBeenCalled();
    expect(service.active).toBe(false);
  });
```

**Salida obtenida:** `PASSED` en 9 ms

#### CU-131 · CA-26 tour config step requires resources in at least 2 phases

**Escenario:** CrearOvaTourService

**Código:**

```ts
it("CA-26 tour config step requires resources in at least 2 phases", () => {
    mountPromptAnchor();
    service.startIfNeeded();

    const opts = driverFactory.mock.calls[0][0]!;
    const config = opts.steps.find((s) => s.element === "#tour-crear-ova-config");
    const generar = opts.steps.find((s) => s.element === "#tour-crear-ova-generar");
    expect(config?.popover?.title).toMatch(/recursos/i);
    expect(config?.popover?.title).not.toMatch(/opcional/i);
    expect(config?.popover?.description).toMatch(/al menos 2 fases/i);
    expect(config?.popover?.description).toMatch(/Pulsa Recursos/i);
    expect(generar?.popover?.description).toMatch(/al menos 2 fases/i);
  });
```

**Salida obtenida:** `PASSED` en 10 ms

### `frontend/src/features/ova-workspace/services/ova-workspace.service.spec.ts`

#### CU-132 · savePhase llama a savePhaseContent y recarga el OVA

**Escenario:** OvaWorkspaceService — mutaciones de fase (HU-026/031/032/033)

**Código:**

```ts
it("savePhase llama a savePhaseContent y recarga el OVA", async () => {
    await service.savePhase("fase-9", "<p>nuevo</p>");

    expect(edit.savePhaseContent).toHaveBeenCalledWith("ova-1", "fase-9", "<p>nuevo</p>");
    expect(edit.fetchOvaEditorData).toHaveBeenCalledTimes(2);
  });
```

**Salida obtenida:** `PASSED` en 47 ms

#### CU-133 · deletePhase llama a deletePhase y recarga el OVA

**Escenario:** OvaWorkspaceService — mutaciones de fase (HU-026/031/032/033)

**Código:**

```ts
it("deletePhase llama a deletePhase y recarga el OVA", async () => {
    await service.deletePhase("fase-9");

    expect(edit.deletePhase).toHaveBeenCalledWith("ova-1", "fase-9");
    expect(edit.fetchOvaEditorData).toHaveBeenCalledTimes(2);
  });
```

**Salida obtenida:** `PASSED` en 21 ms

#### CU-134 · addPhase llama a addPhase con tipo y prompt y recarga el OVA

**Escenario:** OvaWorkspaceService — mutaciones de fase (HU-026/031/032/033)

**Código:**

```ts
it("addPhase llama a addPhase con tipo y prompt y recarga el OVA", async () => {
    await service.addPhase("engage", "Un cómic sobre redes");

    expect(edit.addPhase).toHaveBeenCalledWith("ova-1", "engage", "Un cómic sobre redes");
    expect(edit.fetchOvaEditorData).toHaveBeenCalledTimes(2);
  });
```

**Salida obtenida:** `PASSED` en 19 ms

#### CU-135 · reorderPhases mapea la lista a [{phase_id, new_order}] por índice global

**Escenario:** OvaWorkspaceService — mutaciones de fase (HU-026/031/032/033)

**Código:**

```ts
it("reorderPhases mapea la lista a [{phase_id, new_order}] por índice global", async () => {
```

**Salida obtenida:** `PASSED` en 37 ms

#### CU-136 · runRegen con faseIds envía el subconjunto al endpoint de regeneración

**Escenario:** OvaWorkspaceService — mutaciones de fase (HU-026/031/032/033)

**Código:**

```ts
it("runRegen con faseIds envía el subconjunto al endpoint de regeneración", async () => {
    await service.runRegen({ faseIds: ["fase-9"], prompt: "más ejemplos" });

    expect(edit.triggerRegen).toHaveBeenCalledWith("ova-1", {
      faseIds: ["fase-9"],
      prompt: "más ejemplos",
    });
  });
```

**Salida obtenida:** `PASSED` en 24 ms

#### CU-137 · submitPrompt deja el prompt en el historial del chat

**Escenario:** OvaWorkspaceService — mutaciones de fase (HU-026/031/032/033)

**Código:**

```ts
it("submitPrompt deja el prompt en el historial del chat", async () => {
    service.setPrompt("Añade más ejemplos prácticos");
    await service.submitPrompt(["fase-9"]);

    const msgs = service.chatMessages();
    expect(msgs.length).toBeGreaterThanOrEqual(2);
    expect(msgs.some((m) => m.role === "user" && m.text === "Añade más ejemplos prácticos")).toBe(
      true,
    );
    expect(msgs.some((m) => m.role === "assistant")).toBe(true);
    expect(service.prompt()).toBe("");
  });
```

**Salida obtenida:** `PASSED` en 36 ms

#### CU-138 · un fallo en la mutación no recarga el OVA

**Escenario:** OvaWorkspaceService — mutaciones de fase (HU-026/031/032/033)

**Código:**

```ts
it("un fallo en la mutación no recarga el OVA", async () => {
    edit.deletePhase.mockRejectedValueOnce(new Error("boom"));

    await service.deletePhase("fase-9");

    expect(edit.fetchOvaEditorData).toHaveBeenCalledTimes(1);
  });
```

**Salida obtenida:** `PASSED` en 29 ms

#### CU-139 · init con otro OVA limpia el estado del anterior mientras carga el nuevo

**Escenario:** OvaWorkspaceService — aislamiento entre OVAs y teardown (B1)

**Código:**

```ts
it("init con otro OVA limpia el estado del anterior mientras carga el nuevo", async () => {
    const edit = {
      ...editServiceStub(),
      fetchOvaEditorData: vi.fn((id: string) =>
        id === "ova-A"
          ? Promise.resolve({
              status: "listo",
              title: "A",
              current_version: { phases: [{ id: "p1", phase_type: "engage" }] },
            })
          : new Promise(() => {}),
      ),
    };
    TestBed.configureTestingModule({
      providers: [OvaWorkspaceService, { provide: OvaEditService, useValue: edit }],
    });
    const service = TestBed.inject(OvaWorkspaceService);

    service.init("ova-A");
    await vi.waitFor(() => {
      expect(service.phases().length).toBe(1);
    });
    service.setPrompt("prompt de A");

    service.init("ova-B");

    expect(service.ova()).toBeNull();
    expect(service.phases()).toEqual([]);
    expect(service.prompt()).toBe("");
    expect(service.error()).toBe("");
    expect(service.chatMessages()).toEqual([]);
  });
```

**Salida obtenida:** `PASSED` en 98 ms

#### CU-140 · teardown cancela el reintento de load cuando el OVA está generando

**Escenario:** OvaWorkspaceService — aislamiento entre OVAs y teardown (B1)

**Código:**

```ts
it("teardown cancela el reintento de load cuando el OVA está generando", async () => {
    vi.useFakeTimers();
    try {
      const edit = editServiceStub();
      edit.fetchOvaEditorData = vi.fn(() =>
        Promise.reject(Object.assign(new Error("generando"), { status: 409 })),
      );
      TestBed.configureTestingModule({
        providers: [OvaWorkspaceService, { provide: OvaEditService, useValue: edit }],
      });
      const service = TestBed.inject(OvaWorkspaceService);

      service.init("ova-A");
      await vi.advanceTimersByTimeAsync(0);
      expect(edit.fetchOvaEditorData).toHaveBeenCalledTimes(1);
      expect(service.generating()).toBe(true);

      service.teardown();
      await vi.advanceTimersByTimeAsync(30000);

      expect(edit.fetchOvaEditorData).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
```

**Salida obtenida:** `PASSED` en 46 ms

## Suite 2 — BDD de frontend sin navegador (cucumber-js)

Ejecutadas con `pnpm test:unit`. Cada caso es un escenario Gherkin que ejercita lógica pura del frontend (validadores, servicios y máquinas de estado) sin navegador ni backend. **63 escenarios**, todos en verde.

### `features/admin/llm-config-unit.feature` — Config admin de modelos LLM — lógica de panel (unit)

#### BDD-F-001 · Reordenar la cadena de fallback hacia arriba

**Escenario:** Config admin de modelos LLM — lógica de panel (unit)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Reordenar la cadena de fallback hacia arriba
    Given una cadena de fallback "groq:a,openrouter:b,groq:c"
    When muevo el fallback en índice 2 con dirección -1
    Then la cadena resultante es "groq:a,groq:c,openrouter:b"
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-002 · Mover fuera de rango no cambia nada

**Escenario:** Config admin de modelos LLM — lógica de panel (unit)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Mover fuera de rango no cambia nada
    Given una cadena de fallback "groq:a,openrouter:b"
    When muevo el fallback en índice 0 con dirección -1
    Then la cadena resultante es "groq:a,openrouter:b"
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-003 · Agregar y quitar fallback

**Escenario:** Config admin de modelos LLM — lógica de panel (unit)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Agregar y quitar fallback
    Given una cadena de fallback "groq:a"
    When agrego un fallback vacío
    Then la cadena tiene 2 elementos
    When quito el fallback en índice 0
    Then la cadena resultante es ":"
```

**Salida obtenida:** `PASSED` — 5 pasos en 0 ms

#### BDD-F-004 · toPayload descarta entries sin modelo y preserva orden

**Escenario:** Config admin de modelos LLM — lógica de panel (unit)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: toPayload descarta entries sin modelo y preserva orden
    Given un draft de tarea "codigo" con primario "openrouter:deepseek/deepseek-v4-flash" y fallbacks "groq:llama-3.3-70b-versatile,:"
    When construyo el payload
    Then el payload tiene default "openrouter:deepseek/deepseek-v4-flash" para "codigo"
    And el payload tiene 1 fallback para "codigo"
```

**Salida obtenida:** `PASSED` — 4 pasos en 0 ms

#### BDD-F-005 · toPayload omite la tarea si el primario no tiene modelo

**Escenario:** Config admin de modelos LLM — lógica de panel (unit)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: toPayload omite la tarea si el primario no tiene modelo
    Given un draft de tarea "texto" con primario ":" y fallbacks ""
    When construyo el payload
    Then el payload no incluye "texto" en defaults
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

### `features/admin/nodes-config-unit.feature` — Panel de nodos Prometheus — lógica de draft (unit)

#### BDD-F-006 · Campo rondas visible cuando critico esta activo

**Escenario:** Panel de nodos Prometheus — lógica de draft (unit)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Campo rondas visible cuando critico esta activo
    Given un draft de nodos con ova_critic "1"
    Then criticRoundsVisible retorna true
```

**Salida obtenida:** `PASSED` — 2 pasos en 0 ms

#### BDD-F-007 · Campo rondas oculto cuando critico esta apagado

**Escenario:** Panel de nodos Prometheus — lógica de draft (unit)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Campo rondas oculto cuando critico esta apagado
    Given un draft de nodos con ova_critic "0"
    Then criticRoundsVisible retorna false
```

**Salida obtenida:** `PASSED` — 2 pasos en 0 ms

#### BDD-F-008 · hasUnsavedChanges detecta cambio en flag

**Escenario:** Panel de nodos Prometheus — lógica de draft (unit)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: hasUnsavedChanges detecta cambio en flag
    Given un config server con ova_critic "0"
    And un draft modificado con ova_critic "1"
    When comparo draft con config server y rounds 1
    Then hasUnsavedChanges retorna true
```

**Salida obtenida:** `PASSED` — 4 pasos en 0 ms

#### BDD-F-009 · hasUnsavedChanges detecta cambio en rounds

**Escenario:** Panel de nodos Prometheus — lógica de draft (unit)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: hasUnsavedChanges detecta cambio en rounds
    Given un config server con ova_critic "0"
    And un draft sin cambios de flags
    When comparo draft con config server y rounds 2
    Then hasUnsavedChanges retorna true

  @pending-en022
```

**Salida obtenida:** `PASSED` — 4 pasos en 0 ms

### `features/auth/BU-001_expiracion-bus-unit.feature` — BU-001 unit — Bus de expiración de sesión (AuthExpiredBus)

#### BDD-F-010 · Un suscriptor recibe la notificación de expiración

**Escenario:** BU-001 unit — Bus de expiración de sesión (AuthExpiredBus)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Un suscriptor recibe la notificación de expiración
    Given un suscriptor registrado en el bus de expiración
    When el bus notifica la expiración de sesión
    Then el suscriptor fue notificado 1 vez
```

**Salida obtenida:** `PASSED` — 3 pasos en 1 ms

#### BDD-F-011 · Cancelar la suscripción detiene las notificaciones

**Escenario:** BU-001 unit — Bus de expiración de sesión (AuthExpiredBus)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Cancelar la suscripción detiene las notificaciones
    Given un suscriptor registrado en el bus de expiración
    And el suscriptor cancela su suscripción
    When el bus notifica la expiración de sesión
    Then el suscriptor fue notificado 0 veces
```

**Salida obtenida:** `PASSED` — 4 pasos en 0 ms

#### BDD-F-012 · Varios suscriptores reciben la misma notificación

**Escenario:** BU-001 unit — Bus de expiración de sesión (AuthExpiredBus)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Varios suscriptores reciben la misma notificación
    Given 3 suscriptores registrados en el bus de expiración
    When el bus notifica la expiración de sesión
    Then cada suscriptor fue notificado 1 vez
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

### `features/auth/HU-001_validaciones-unit.feature` — HU-001 unit — Validaciones del registro

#### BDD-F-013 · Un nombre real es válido

**Escenario:** HU-001 unit — Validaciones del registro

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Un nombre real es válido
    Given el nombre completo "Solange Quispe"
    When valido el nombre completo
    Then la validación de nombre es aceptada
```

**Salida obtenida:** `PASSED` — 3 pasos en 1 ms

#### BDD-F-014 · Un nombre de solo puntos es rechazado

**Escenario:** HU-001 unit — Validaciones del registro

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Un nombre de solo puntos es rechazado
    Given el nombre completo "..."
    When valido el nombre completo
    Then la validación de nombre es rechazada
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-015 · Un nombre de solo espacios es rechazado

**Escenario:** HU-001 unit — Validaciones del registro

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Un nombre de solo espacios es rechazado
    Given el nombre completo "   "
    When valido el nombre completo
    Then la validación de nombre es rechazada
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-016 · Un nombre demasiado corto es rechazado

**Escenario:** HU-001 unit — Validaciones del registro

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Un nombre demasiado corto es rechazado
    Given el nombre completo "Al"
    When valido el nombre completo
    Then la validación de nombre es rechazada
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-017 · Una contraseña alfanumérica de 8+ caracteres es válida

**Escenario:** HU-001 unit — Validaciones del registro

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Una contraseña alfanumérica de 8+ caracteres es válida
    Given la contraseña "clave1234"
    When valido la contraseña
    Then la validación de contraseña es aceptada
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-018 · Una contraseña sin números es rechazada

**Escenario:** HU-001 unit — Validaciones del registro

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Una contraseña sin números es rechazada
    Given la contraseña "solopalabras"
    When valido la contraseña
    Then la validación de contraseña es rechazada
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-019 · Una contraseña corta es rechazada

**Escenario:** HU-001 unit — Validaciones del registro

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Una contraseña corta es rechazada
    Given la contraseña "ab1"
    When valido la contraseña
    Then la validación de contraseña es rechazada
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

### `features/ova/HU-022_recursos-parciales.feature` — Recuperación de recursos parciales — viewmodel (HU-022)

#### BDD-F-020 · El viewmodel mapea estados backend a estados de UI

**Escenario:** Recuperación de recursos parciales — viewmodel (HU-022)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: El viewmodel mapea estados backend a estados de UI
    Given un job con recursos en estados "done, error, running, pending"
    When se construye el viewmodel de recursos
    Then los estados de UI son "check, X, generando, pendiente" en orden
    And solo el recurso en error es seleccionable
```

**Salida obtenida:** `PASSED` — 4 pasos en 1 ms

#### BDD-F-021 · El recurso fallido conserva su Error ID y etiqueta del catálogo

**Escenario:** Recuperación de recursos parciales — viewmodel (HU-022)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: El recurso fallido conserva su Error ID y etiqueta del catálogo
    Given un recurso "error" con error_id "8f3a-c1" del tipo "Diagrama"
    When se construye el viewmodel de recursos
    Then ese recurso muestra la etiqueta "Diagrama" y el error_id "8f3a-c1"
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-022 · Seleccionar todos los fallidos toma solo los recursos en error

**Escenario:** Recuperación de recursos parciales — viewmodel (HU-022)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Seleccionar todos los fallidos toma solo los recursos en error
    Given un job con dos recursos en error y uno done
    When se piden los ids de los recursos fallidos
    Then se obtienen exactamente los dos recursos en error
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-023 · La selección se depura cuando un fallido pasa a done

**Escenario:** Recuperación de recursos parciales — viewmodel (HU-022)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: La selección se depura cuando un fallido pasa a done
    Given una selección con un id que ya quedó en estado done
    When se depura la selección contra el viewmodel
    Then ese id ya no está en la selección
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-024 · Fallo total se detecta cuando ningún recurso quedó done

**Escenario:** Recuperación de recursos parciales — viewmodel (HU-022)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Fallo total se detecta cuando ningún recurso quedó done
    Given un job terminado en error sin recursos done
    When se evalúa el resultado del job
    Then el resultado indica fallo total
    And no hay recursos done para previsualizar

  # GN-01/GN-02: job restaurado sin selección original — la etiqueta ya no
  # muestra el resource_type crudo; lo humaniza o cae a "Fase · N" (orden por fase).
```

**Salida obtenida:** `PASSED` — 4 pasos en 0 ms

#### BDD-F-025 · Sin selección disponible, un tipo con texto se humaniza

**Escenario:** Recuperación de recursos parciales — viewmodel (HU-022)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Sin selección disponible, un tipo con texto se humaniza
    Given un recurso "done" sin selección del tipo "comic_interactivo"
    When se construye el viewmodel de recursos
    Then ese recurso muestra la etiqueta "Comic Interactivo"
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-026 · Sin selección disponible, un tipo numérico cae a fase + orden

**Escenario:** Recuperación de recursos parciales — viewmodel (HU-022)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Sin selección disponible, un tipo numérico cae a fase + orden
    Given un recurso "done" sin selección del tipo "3" en el orden 1
    When se construye el viewmodel de recursos
    Then ese recurso muestra la etiqueta "Enganche · 2"
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

### `features/ova/HU-023_generacion-background.feature` — Generación en background y reanudación — viewmodel (HU-023)

#### BDD-F-027 · Progreso se calcula correctamente desde recursos del job

**Escenario:** Generación en background y reanudación — viewmodel (HU-023)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Progreso se calcula correctamente desde recursos del job
    Given un job con 8 recursos donde 3 están "done"
    When se calcula el progreso del job
    Then el progreso muestra 3 de 8
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-028 · Un job en estado terminal no necesita más polling

**Escenario:** Generación en background y reanudación — viewmodel (HU-023)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Un job en estado terminal no necesita más polling
    Given un job con status "done"
    When se evalúa si el job requiere polling
    Then el job no requiere polling
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-029 · Un job en estado activo requiere polling

**Escenario:** Generación en background y reanudación — viewmodel (HU-023)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Un job en estado activo requiere polling
    Given un job con status "running"
    When se evalúa si el job requiere polling
    Then el job requiere polling
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-030 · Un job interrumpido se identifica correctamente

**Escenario:** Generación en background y reanudación — viewmodel (HU-023)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Un job interrumpido se identifica correctamente
    Given un job con status "interrupted"
    When se evalúa si el job está interrumpido
    Then el job está interrumpido
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

### `features/ova/HU-024_archivos-chat.feature` — Archivos contextuales estilo chat — viewmodel (HU-024)

#### BDD-F-031 · Rechazo por exceder el límite de archivos

**Escenario:** Archivos contextuales estilo chat — viewmodel (HU-024)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Rechazo por exceder el límite de archivos
    Given un estudiante con 5 archivos adjuntos
    When intenta adjuntar 1 archivo más
    Then se produce un error indicando el límite de 5 archivos
    And el archivo no se adjunta
```

**Salida obtenida:** `PASSED` — 4 pasos en 0 ms

#### BDD-F-032 · Rechazo no ocurre si no se supera el límite

**Escenario:** Archivos contextuales estilo chat — viewmodel (HU-024)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Rechazo no ocurre si no se supera el límite
    Given un estudiante con 3 archivos adjuntos
    When intenta adjuntar 2 archivos más
    Then no hay error de validación
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

### `features/ova/HU-025_workspace.feature` — Workspace de edición OVA — split panel (HU-025)

#### BDD-F-033 · El ratio del divider se clampea al mínimo

**Escenario:** Workspace de edición OVA — split panel (HU-025)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: El ratio del divider se clampea al mínimo
    Given un drag hasta una posición de ratio 0.1
    When se clampea el ratio
    Then el ratio resultante es 0.25
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-034 · El ratio del divider se clampea al máximo

**Escenario:** Workspace de edición OVA — split panel (HU-025)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: El ratio del divider se clampea al máximo
    Given un drag hasta una posición de ratio 0.9
    When se clampea el ratio
    Then el ratio resultante es 0.65
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-035 · Un ratio válido no se modifica

**Escenario:** Workspace de edición OVA — split panel (HU-025)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Un ratio válido no se modifica
    Given un drag hasta una posición de ratio 0.4
    When se clampea el ratio
    Then el ratio resultante es 0.4
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-036 · El workspace muestra el título del OVA

**Escenario:** Workspace de edición OVA — split panel (HU-025)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: El workspace muestra el título del OVA
    Given un OVA con título "Árboles de decisión"
    When se carga el workspace
    Then el título visible es "Árboles de decisión"
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

### `features/ova/HU-026_click-to-edit.feature` — Edición de recurso por click (HU-026)

#### BDD-F-037 · Eliminar única fase falla validación

**Escenario:** Edición de recurso por click (HU-026)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Eliminar única fase falla validación
    Given una versión con 1 fase
    When se intenta eliminar la única fase
    Then la eliminación es rechazada por ser la última
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-038 · Eliminar fase de varias deja el resto

**Escenario:** Edición de recurso por click (HU-026)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Eliminar fase de varias deja el resto
    Given una versión con 3 fases
    When se elimina la fase del índice 1
    Then quedan 2 fases
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-039 · Editar con contenido vacío es inválido

**Escenario:** Edición de recurso por click (HU-026)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Editar con contenido vacío es inválido
    Given un recurso con contenido "hola"
    When se edita con contenido vacío
    Then la edición es inválida
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-040 · Editar con contenido válido es aceptado

**Escenario:** Edición de recurso por click (HU-026)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Editar con contenido válido es aceptado
    Given un recurso con contenido "hola"
    When se edita con contenido "nuevo contenido"
    Then la edición es válida
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

### `features/ova/HU-027_seleccion-recursos.feature` — Selección de recursos como contexto (HU-027)

#### BDD-F-041 · Seleccionar un recurso lo agrega a la lista

**Escenario:** Selección de recursos como contexto (HU-027)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Seleccionar un recurso lo agrega a la lista
    Given no hay recursos seleccionados
    When el usuario marca el recurso "phase-abc"
    Then "phase-abc" está en la lista de seleccionados
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-042 · Deseleccionar un recurso lo elimina de la lista

**Escenario:** Selección de recursos como contexto (HU-027)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Deseleccionar un recurso lo elimina de la lista
    Given el recurso "phase-abc" está seleccionado
    When el usuario desmarca el recurso "phase-abc"
    Then la lista de seleccionados está vacía
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-043 · Sin selección el prompt aplica a todos

**Escenario:** Selección de recursos como contexto (HU-027)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Sin selección el prompt aplica a todos
    Given no hay recursos seleccionados
    When se construye la llamada al regen
    Then fase_ids está vacío
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-044 · Con selección el prompt aplica solo a los marcados

**Escenario:** Selección de recursos como contexto (HU-027)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Con selección el prompt aplica solo a los marcados
    Given los recursos "p1" y "p2" están seleccionados
    When se construye la llamada al regen
    Then fase_ids contiene "p1" y "p2"
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

### `features/ova/HU-028_versionado.feature` — Versionado de OVA (HU-028)

#### BDD-F-045 · Las versiones se listan en orden descendente

**Escenario:** Versionado de OVA (HU-028)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Las versiones se listan en orden descendente
    Given un historial con versiones 1, 2 y 3
    When se ordenan de más reciente a más antigua
    Then el orden es 3, 2, 1
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-046 · Se pueden seleccionar dos versiones para diff

**Escenario:** Versionado de OVA (HU-028)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Se pueden seleccionar dos versiones para diff
    Given un historial con versiones 1, 2 y 3
    When el usuario selecciona las versiones 1 y 3
    Then hay dos versiones seleccionadas para diff
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

### `features/ova/HU-029_micro-versionado.feature` — Micro-versionado por recurso (HU-029)

#### BDD-F-047 · El primer minor de un recurso es 1

**Escenario:** Micro-versionado por recurso (HU-029)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: El primer minor de un recurso es 1
    Given un recurso sin micro-versiones previas
    When se calcula el siguiente número de micro-versión
    Then el número de micro-versión es 1
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-048 · El minor incrementa con cada edición

**Escenario:** Micro-versionado por recurso (HU-029)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: El minor incrementa con cada edición
    Given un recurso con 3 micro-versiones previas
    When se calcula el siguiente número de micro-versión
    Then el número de micro-versión es 4
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-049 · El historial está ordenado de más reciente a más antiguo

**Escenario:** Micro-versionado por recurso (HU-029)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: El historial está ordenado de más reciente a más antiguo
    Given micro-versiones con números 1, 2 y 3
    When se ordenan las micro-versiones de más reciente a más antigua
    Then el primer elemento tiene minor_number 3
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

### `features/ova/HU-030_mis-ovas-workspace.feature` — Mis OVAs — acceso workspace + versión (HU-030)

#### BDD-F-050 · La URL de edición apunta al workspace

**Escenario:** Mis OVAs — acceso workspace + versión (HU-030)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: La URL de edición apunta al workspace
    Given un OVA con id "ova-abc-123"
    When se construye la URL de edición
    Then la URL es "/ova/ova-abc-123/workspace"
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-051 · La tarjeta muestra la versión activa del OVA

**Escenario:** Mis OVAs — acceso workspace + versión (HU-030)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: La tarjeta muestra la versión activa del OVA
    Given un OVA con version_number 2
    When se renderiza la etiqueta de versión
    Then la etiqueta de versión es "v2"
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-052 · Sin versión activa no se muestra etiqueta

**Escenario:** Mis OVAs — acceso workspace + versión (HU-030)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Sin versión activa no se muestra etiqueta
    Given un OVA sin version_number
    When se renderiza la etiqueta de versión
    Then no hay etiqueta de versión
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

### `features/ova/HU-031_edicion-granular.feature` — Edición granular de sub-elementos (HU-031)

#### BDD-F-053 · Un tipo de fase sin soporte devuelve 501

**Escenario:** Edición granular de sub-elementos (HU-031)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Un tipo de fase sin soporte devuelve 501
    Given una fase de tipo "actividad" sin soporte granular
    When se intenta editar un sub-elemento
    Then el resultado es 501 no implementado
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-054 · Identificador de sub-elemento vacío es inválido

**Escenario:** Edición granular de sub-elementos (HU-031)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Identificador de sub-elemento vacío es inválido
    Given un sub-elemento sin identificador
    When se valida el sub-elemento
    Then la validación falla
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-055 · Identificador de sub-elemento válido

**Escenario:** Edición granular de sub-elementos (HU-031)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Identificador de sub-elemento válido
    Given un sub-elemento con id "sec-intro"
    When se valida el sub-elemento
    Then la validación pasa correctamente
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

### `features/ova/HU-032_anadir-recurso.feature` — Añadir recurso al OVA (HU-032)

#### BDD-F-056 · Se puede añadir si hay menos de 4 recursos

**Escenario:** Añadir recurso al OVA (HU-032)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Se puede añadir si hay menos de 4 recursos
    Given una fase con 2 recursos
    When se verifica si se puede añadir otro recurso
    Then se puede añadir
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-057 · No se puede añadir si ya hay 4 recursos

**Escenario:** Añadir recurso al OVA (HU-032)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: No se puede añadir si ya hay 4 recursos
    Given una fase con 4 recursos
    When se verifica si se puede añadir otro recurso
    Then no se puede añadir
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-058 · El prompt vacío es inválido para añadir

**Escenario:** Añadir recurso al OVA (HU-032)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: El prompt vacío es inválido para añadir
    Given una fase con 1 recurso
    When se intenta añadir con prompt vacío
    Then el intento es inválido
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-059 · Prompt con contenido es válido

**Escenario:** Añadir recurso al OVA (HU-032)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Prompt con contenido es válido
    Given una fase con 1 recurso
    When se intenta añadir con prompt "Añadir un ejemplo de clustering"
    Then el intento es válido
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

### `features/ova/HU-033_reordenar.feature` — Reordenar recursos del OVA (HU-033)

#### BDD-F-060 · Reordenar dentro de la misma fase cambia el orden

**Escenario:** Reordenar recursos del OVA (HU-033)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Reordenar dentro de la misma fase cambia el orden
    Given una fase con recursos en el orden "A,B,C"
    When el estudiante arrastra el recurso del índice 2 al índice 0
    Then el orden resultante es "C,A,B"
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-061 · Mover al mismo índice no cambia nada

**Escenario:** Reordenar recursos del OVA (HU-033)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: Mover al mismo índice no cambia nada
    Given una fase con recursos en el orden "A,B,C"
    When el estudiante arrastra el recurso del índice 1 al índice 1
    Then el orden resultante es "A,B,C"
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-062 · El backend rechaza reordenamiento entre fases distintas

**Escenario:** Reordenar recursos del OVA (HU-033)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: El backend rechaza reordenamiento entre fases distintas
    Given reorders con phase_types "actividad" y "evaluacion"
    When se valida que todos pertenecen a la misma fase
    Then la validación falla por tipos distintos
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

#### BDD-F-063 · El backend acepta reordenamiento dentro de la misma fase

**Escenario:** Reordenar recursos del OVA (HU-033)

**Código (Gherkin ejecutable):**

```gherkin
  Scenario: El backend acepta reordenamiento dentro de la misma fase
    Given reorders con phase_types "actividad" y "actividad"
    When se valida que todos pertenecen a la misma fase
    Then la validación pasa
```

**Salida obtenida:** `PASSED` — 3 pasos en 0 ms

## Suite 3 — BDD de backend (pytest-bdd)

Ejecutadas con `pytest tests/step_defs/ -v`. Cada caso ata un escenario Gherkin a la API real mediante un cliente de pruebas de FastAPI. **51 escenarios**, todos en verde.

### `tests/step_defs/test_auth_steps.py`

#### BDD-B-001 · test_login_exitoso

**Escenario:** Login exitoso (test_auth_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Login exitoso
    Given que estoy en la página de login
    When ingreso un correo registrado y contraseña válida
    And envío el formulario
    Then debo recibir un JWT con expiración de 24 horas
    And debo ser redirigido al dashboard
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE_LOGIN, "Login exitoso")
def test_login_exitoso():
    pass
```

**Salida obtenida:** `PASSED` en 492 ms

#### BDD-B-002 · test_login_credenciales_invalidas

**Escenario:** Credenciales inválidas (test_auth_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Credenciales inválidas
    Given que estoy en la página de login
    When ingreso un correo o contraseña inválidos
    And envío el formulario
    Then debo recibir un error descriptivo
    And no debo acceder al dashboard
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE_LOGIN, "Credenciales inválidas")
def test_login_credenciales_invalidas():
    pass
```

**Salida obtenida:** `PASSED` en 464 ms

#### BDD-B-003 · test_login_bloqueo

**Escenario:** Bloqueo tras intentos fallidos (test_auth_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Bloqueo tras intentos fallidos
    Given que realizo 5 intentos fallidos consecutivos
    When intento iniciar sesión nuevamente
    Then la cuenta debe quedar bloqueada por 15 minutos
    And debo recibir un mensaje indicando el bloqueo
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE_LOGIN, "Bloqueo tras intentos fallidos")
def test_login_bloqueo():
    pass
```

**Salida obtenida:** `PASSED` en 4912 ms

#### BDD-B-004 · test_registro_exitoso

**Escenario:** Registro exitoso con credenciales válidas (test_auth_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Registro exitoso con credenciales válidas
    Given que estoy en la página de registro
    When ingreso un correo válido y una contraseña alfanumérica de mínimo 8 caracteres
    And envío el formulario
    Then el sistema debe crear la cuenta sin verificar
    And los campos university_id, gender y phone_number deben crearse como NULL
    And debo ver un aviso para verificar mi correo
    And no debo iniciar sesión hasta verificar el correo
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE_REGISTER, "Registro exitoso con credenciales válidas")
def test_registro_exitoso():
    pass
```

**Salida obtenida:** `PASSED` en 3335 ms

#### BDD-B-005 · test_registro_email_duplicado

**Escenario:** Registro fallido por email duplicado (test_auth_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Registro fallido por email duplicado
    Given que el correo "estudiante@upao.edu" ya está registrado
    When intento registrarme con ese correo
    Then debo ver un mensaje indicando que el correo ya existe
    And no debo ser redirigido al dashboard
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE_REGISTER, "Registro fallido por email duplicado")
def test_registro_email_duplicado():
    pass
```

**Salida obtenida:** `PASSED` en 457 ms

### `tests/step_defs/test_db_api_keys_steps.py`

#### BDD-B-006 · test_resolve_from_db

**Escenario:** resolve key from PlatformConfig when DB row exists (test_db_api_keys_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: resolve key from PlatformConfig when DB row exists
    Given PlatformConfig has "groq_api_key" = "gsk_test123"
    When _get_provider_key is called for "groq"
    Then the returned key is "gsk_test123"
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "resolve key from PlatformConfig when DB row exists")
def test_resolve_from_db():
    pass
```

**Salida obtenida:** `PASSED` en 7 ms

#### BDD-B-007 · test_resolve_none

**Escenario:** resolve key returns None when no DB row and no env var (test_db_api_keys_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: resolve key returns None when no DB row and no env var
    Given PlatformConfig has no "groq_api_key" row
    And env var "GROQ_API_KEY" is not set
    When _get_provider_key is called for "groq"
    Then the returned key is None
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "resolve key returns None when no DB row and no env var")
def test_resolve_none():
    pass
```

**Salida obtenida:** `PASSED` en 5 ms

#### BDD-B-008 · test_cache_ttl

**Escenario:** cache TTL — second call within 30s skips DB query (test_db_api_keys_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: cache TTL — second call within 30s skips DB query
    Given PlatformConfig has "groq_api_key" = "gsk_cached"
    When _get_provider_key is called for "groq" twice within 30s
    Then the DB is queried only once
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "cache TTL — second call within 30s skips DB query")
def test_cache_ttl():
    pass
```

**Salida obtenida:** `PASSED` en 4 ms

### `tests/step_defs/test_error_log_steps.py`

#### BDD-B-009 · test_registrar_error_con_id

**Escenario:** Registrar un error con Error ID (test_error_log_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Registrar un error con Error ID
    Given un recurso cuya generación falla tras agotar reintentos
    When el backend registra el error
    Then se crea una fila en "ova_error_logs" con un Error ID único
    And el registro incluye categoría, ova_id, recurso y timestamp
    And el Error ID guardado coincide con el expuesto al usuario
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Registrar un error con Error ID")
def test_registrar_error_con_id():
    pass
```

**Salida obtenida:** `PASSED` en 6 ms

#### BDD-B-010 · test_categoria_invalida

**Escenario:** Categoría inválida cae a  (test_error_log_steps)

**Código (escenario Gherkin):**

```gherkin
# no se localizó el escenario «Categoría inválida cae a »
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, 'Categoría inválida cae a "other"')
def test_categoria_invalida():
    pass
```

**Salida obtenida:** `PASSED` en 4 ms

#### BDD-B-011 · test_no_filtra_secretos

**Escenario:** El registro no filtra secretos (test_error_log_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: El registro no filtra secretos
    Given un error cuyo mensaje interno contiene una API key
    When se registra el error
    Then el registro almacenado no contiene la API key ni tokens
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "El registro no filtra secretos")
def test_no_filtra_secretos():
    pass
```

**Salida obtenida:** `PASSED` en 6 ms

#### BDD-B-012 · test_fallo_no_interrumpe

**Escenario:** Un fallo al registrar no interrumpe la generación (test_error_log_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Un fallo al registrar no interrumpe la generación
    Given una indisponibilidad temporal al escribir el log de error
    When el backend intenta registrar el error
    Then la generación del resto de recursos continúa
    And el helper devuelve igualmente un Error ID
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Un fallo al registrar no interrumpe la generación")
def test_fallo_no_interrumpe():
    pass
```

**Salida obtenida:** `PASSED` en 68 ms

### `tests/step_defs/test_jobs_steps.py`

#### BDD-B-013 · test_continua_tras_desconexion

**Escenario:** La generación continúa aunque el cliente se desconecte (test_jobs_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: La generación continúa aunque el cliente se desconecte
    Given un usuario autenticado inicia la generación de un OVA con 2 fases
    And el servidor crea un job con sus recursos "pending"
    When el runner ejecuta el job en background mientras el cliente está desconectado
    And el cliente vuelve a consultar el estado del job más tarde
    Then el job refleja las fases completadas durante la desconexión
    And el contenido de cada recurso quedó persistido en la base de datos
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "La generación continúa aunque el cliente se desconecte")
def test_continua_tras_desconexion():
    pass
```

**Salida obtenida:** `PASSED` en 37 ms

#### BDD-B-014 · test_recurso_falla_sin_abortar

**Escenario:** Un recurso falla sin abortar el resto (test_jobs_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Un recurso falla sin abortar el resto
    Given un job de generación con 3 recursos donde el segundo falla siempre
    When el runner ejecuta el job
    Then el recurso que falla queda en estado "error" con un error_id
    And los otros recursos quedan "done"
    And el job termina "done" porque al menos un recurso quedó listo
    And el contenido de los recursos "done" quedó persistido
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Un recurso falla sin abortar el resto")
def test_recurso_falla_sin_abortar():
    pass
```

**Salida obtenida:** `PASSED` en 28 ms

#### BDD-B-015 · test_reintentos

**Escenario:** Reintenta el recurso hasta agotar los intentos (test_jobs_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Reintenta el recurso hasta agotar los intentos
    Given un job con un recurso que falla siempre
    When el runner ejecuta el job
    Then el recurso registra el máximo de intentos
    And queda "error" con un error_id
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Reintenta el recurso hasta agotar los intentos")
def test_reintentos():
    pass
```

**Salida obtenida:** `PASSED` en 21 ms

#### BDD-B-016 · test_reanudar_solo_pendientes

**Escenario:** Reanudar continúa solo las fases pendientes (test_jobs_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Reanudar continúa solo las fases pendientes
    Given un job "interrupted" con un recurso "done" y dos "pending"
    When se solicitan los recursos reanudables del job
    Then solo se listan los recursos "pending"
    And el recurso "done" no se incluye
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Reanudar continúa solo las fases pendientes")
def test_reanudar_solo_pendientes():
    pass
```

**Salida obtenida:** `PASSED` en 11 ms

#### BDD-B-017 · test_barrido_interrupted

**Escenario:** Un job running sin progreso reciente se marca interrupted (test_jobs_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Un job running sin progreso reciente se marca interrupted
    Given un job "running" cuyo progreso quedó obsoleto
    When el dueño consulta el estado del job
    Then el job pasa a "interrupted"
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Un job running sin progreso reciente se marca interrupted")
def test_barrido_interrupted():
    pass
```

**Salida obtenida:** `PASSED` en 13 ms

#### BDD-B-018 · test_no_filtra_sensibles

**Escenario:** El estado no filtra detalles sensibles (test_jobs_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: El estado no filtra detalles sensibles
    Given un recurso que falló por un error interno del proveedor LLM
    When se serializa el estado del job para el cliente
    Then la respuesta incluye status y error_id por recurso
    But no incluye el contenido, el mensaje de excepción interno ni credenciales
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "El estado no filtra detalles sensibles")
def test_no_filtra_sensibles():
    pass
```

**Salida obtenida:** `PASSED` en 21 ms

#### BDD-B-019 · test_solo_dueno

**Escenario:** Solo el dueño puede consultar su job (test_jobs_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Solo el dueño puede consultar su job
    Given un job creado por un usuario
    When otro usuario distinto intenta consultarlo
    Then el servicio no devuelve el job

  # HU-022/B1 — el plan crea una fila por recurso elegido (no 1 genérico por fase).
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Solo el dueño puede consultar su job")
def test_solo_dueno():
    pass
```

**Salida obtenida:** `PASSED` en 9 ms

#### BDD-B-020 · test_plan_recurso_por_fila

**Escenario:** El plan de recursos crea una fila por recurso elegido (test_jobs_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: El plan de recursos crea una fila por recurso elegido
    Given el cliente elige varios recursos con su fase y tipo
    When se construye el plan de recursos
    Then hay una fila por cada recurso elegido con su resource_type
    And cada recurso conserva su fase y su orden dentro de la fase

  # HU-022/B2 — al terminar con ≥1 recurso done se materializa el OVA parcial (R1/R2).
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "El plan de recursos crea una fila por recurso elegido")
def test_plan_recurso_por_fila():
    pass
```

**Salida obtenida:** `PASSED` en 3 ms

#### BDD-B-021 · test_materializa_ova_parcial

**Escenario:** Un job con recursos generados materializa un OVA parcial (test_jobs_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Un job con recursos generados materializa un OVA parcial
    Given un job donde un recurso se genera y otro falla siempre
    When el runner ejecuta el job
    Then el job queda ligado a un OVA con sus fases generadas
    And solo los recursos done se vuelven fases del OVA

  # HU-022/B2/R8 — fallo total no crea un OVA vacío.
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Un job con recursos generados materializa un OVA parcial")
def test_materializa_ova_parcial():
    pass
```

**Salida obtenida:** `PASSED` en 32 ms

#### BDD-B-022 · test_fallo_total_sin_ova

**Escenario:** Un fallo total no materializa ningún OVA (test_jobs_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Un fallo total no materializa ningún OVA
    Given un job donde todos los recursos fallan siempre
    When el runner ejecuta el job
    Then el job termina en error sin OVA asociado

  # HU-022/B3 — el contenido de un recurso done se lee por su propio endpoint.
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Un fallo total no materializa ningún OVA")
def test_fallo_total_sin_ova():
    pass
```

**Salida obtenida:** `PASSED` en 23 ms

#### BDD-B-023 · test_contenido_aparte

**Escenario:** El contenido de un recurso done se obtiene aparte del estado (test_jobs_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: El contenido de un recurso done se obtiene aparte del estado
    Given un job con un recurso done con contenido
    When el dueño solicita el contenido de ese recurso
    Then recibe el HTML del recurso
    But el estado del job sigue sin exponer el contenido

  # HU-022/B4 — resume acepta un subconjunto de recursos del job.
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "El contenido de un recurso done se obtiene aparte del estado")
def test_contenido_aparte():
    pass
```

**Salida obtenida:** `PASSED` en 12 ms

#### BDD-B-024 · test_resume_subconjunto

**Escenario:** Reintentar un subconjunto de recursos del job (test_jobs_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Reintentar un subconjunto de recursos del job
    Given un job interrupted con varios recursos pending
    When se resuelven los recursos a reanudar para un subconjunto válido
    Then solo se reanudan los recursos solicitados

  # HU-022/B4 — un id ajeno al job se rechaza sin filtrar detalle.
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Reintentar un subconjunto de recursos del job")
def test_resume_subconjunto():
    pass
```

**Salida obtenida:** `PASSED` en 18 ms

#### BDD-B-025 · test_resume_ajeno_rechazado

**Escenario:** Reintentar con un recurso ajeno al job se rechaza (test_jobs_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Reintentar con un recurso ajeno al job se rechaza
    Given un job interrupted con varios recursos pending
    When se resuelven los recursos a reanudar incluyendo un id ajeno
    Then la resolución se rechaza como no encontrada

  # HU-022/B4/R6/R7 — un recurso done en el subset de resume es inocuo: no se
  # relanza ni se sobrescribe; solo se regenera el error del subset.
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Reintentar con un recurso ajeno al job se rechaza")
def test_resume_ajeno_rechazado():
    pass
```

**Salida obtenida:** `PASSED` en 10 ms

#### BDD-B-026 · test_resume_done_en_subset

**Escenario:** Reintentar un subconjunto con un recurso done no lo regenera (test_jobs_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Reintentar un subconjunto con un recurso done no lo regenera
    Given un job interrupted con un recurso done y otro en error
    When el usuario reanuda el subconjunto que incluye el recurso done
    Then solo se regenera el recurso en error
    And el recurso done conserva su contenido original sin relanzarse
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Reintentar un subconjunto con un recurso done no lo regenera")
def test_resume_done_en_subset():
    pass
```

**Salida obtenida:** `PASSED` en 27 ms

### `tests/step_defs/test_llm_config_steps.py`

#### BDD-B-027 · test_admin_get

**Escenario:** Admin obtiene la configuración efectiva (test_llm_config_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Admin obtiene la configuración efectiva
    Given que estoy autenticado como administrador
    When solicito la configuración de modelos
    Then la respuesta es 200
    And la config incluye las tareas "texto", "codigo", "orquestador", "razonamiento"
    And cada tarea tiene un modelo primario por defecto
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Admin obtiene la configuración efectiva")
def test_admin_get():
    pass
```

**Salida obtenida:** `PASSED` en 16 ms

#### BDD-B-028 · test_admin_put_valid

**Escenario:** Admin guarda una configuración válida y se refleja (test_llm_config_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Admin guarda una configuración válida y se refleja
    Given que estoy autenticado como administrador
    When guardo el modelo de codigo como "openrouter/deepseek/deepseek-v4-flash"
    Then la respuesta es 200
    And al consultar la config el modelo de codigo es "openrouter/deepseek/deepseek-v4-flash"
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Admin guarda una configuración válida y se refleja")
def test_admin_put_valid():
    pass
```

**Salida obtenida:** `PASSED` en 18 ms

#### BDD-B-029 · test_admin_put_invalid

**Escenario:** Un modelo invalido se descarta y cae a la semilla (test_llm_config_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Un modelo invalido se descarta y cae a la semilla
    Given que estoy autenticado como administrador
    When guardo el modelo de codigo como "openrouter/modelo-inexistente-xyz"
    Then la respuesta es 200
    And al consultar la config el modelo de codigo no es "openrouter/modelo-inexistente-xyz"
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Un modelo invalido se descarta y cae a la semilla")
def test_admin_put_invalid():
    pass
```

**Salida obtenida:** `PASSED` en 89 ms

#### BDD-B-030 · test_user_get_forbidden

**Escenario:** Un usuario no admin no puede leer la config (test_llm_config_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Un usuario no admin no puede leer la config
    Given que estoy autenticado como usuario normal
    When solicito la configuración de modelos
    Then la respuesta es 403
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Un usuario no admin no puede leer la config")
def test_user_get_forbidden():
    pass
```

**Salida obtenida:** `PASSED` en 16 ms

#### BDD-B-031 · test_user_put_forbidden

**Escenario:** Un usuario no admin no puede guardar la config (test_llm_config_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Un usuario no admin no puede guardar la config
    Given que estoy autenticado como usuario normal
    When intento guardar el modelo de codigo como "openrouter/deepseek/deepseek-v4-flash"
    Then la respuesta es 403
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Un usuario no admin no puede guardar la config")
def test_user_put_forbidden():
    pass
```

**Salida obtenida:** `PASSED` en 15 ms

### `tests/step_defs/test_nodes_config_steps.py`

#### BDD-B-032 · test_get_defaults

**Escenario:** GET retorna nodos y config con defaults cuando no hay DB config (test_nodes_config_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: GET retorna nodos y config con defaults cuando no hay DB config
    Given la tabla PlatformConfig no tiene entrada "ova_nodes_config"
    When el admin llama GET /api/admin/nodes-config
    Then la respuesta incluye nodes con al menos 9 nodos
    And config.ova_critic es "0"
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "GET retorna nodos y config con defaults cuando no hay DB config")
def test_get_defaults():
    pass
```

**Salida obtenida:** `PASSED` en 14 ms

#### BDD-B-033 · test_put_and_get

**Escenario:** PUT guarda flags y GET refleja el cambio (test_nodes_config_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: PUT guarda flags y GET refleja el cambio
    Given la tabla PlatformConfig está vacía
    When el admin llama PUT /api/admin/nodes-config con ova_critic "1" y ova_reflection_rounds 2
    Then la respuesta incluye config.ova_critic igual a "1"
    And config.ova_reflection_rounds igual a 2
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "PUT guarda flags y GET refleja el cambio")
def test_put_and_get():
    pass
```

**Salida obtenida:** `PASSED` en 14 ms

#### BDD-B-034 · test_put_invalid_flag

**Escenario:** PUT con flag inválido retorna 400 (test_nodes_config_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: PUT con flag inválido retorna 400
    Given la tabla PlatformConfig está vacía
    When el admin llama PUT /api/admin/nodes-config con ova_critic "invalid"
    Then la respuesta tiene status 400
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "PUT con flag inválido retorna 400")
def test_put_invalid_flag():
    pass
```

**Salida obtenida:** `PASSED` en 13 ms

### `tests/step_defs/test_ova_critic_steps.py`

#### BDD-B-035 · test_critico_apagado

**Escenario:** Crítico apagado — sin cambio de comportamiento (test_ova_critic_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Crítico apagado — sin cambio de comportamiento
    Given OVA_CRITIC está en "0"
    When se ejecuta run_phase con un recurso mock
    Then el result dict no incluye score ni critic_issues distintos de cero
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Crítico apagado — sin cambio de comportamiento")
def test_critico_apagado():
    pass
```

**Salida obtenida:** `PASSED` en 1636 ms

#### BDD-B-036 · test_critico_acepta

**Escenario:** Crítico acepta un recurso de calidad (test_ova_critic_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Crítico acepta un recurso de calidad
    Given OVA_CRITIC está en "1" y OVA_REFLECTION_ROUNDS en "1"
    And el LLM del Crítico retorna veredicto "aceptar" con puntaje 85
    When se ejecuta run_phase con un recurso mock
    Then el result dict incluye score=85 y critic_issues vacío
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Crítico acepta un recurso de calidad")
def test_critico_acepta():
    pass
```

**Salida obtenida:** `PASSED` en 6 ms

#### BDD-B-037 · test_critico_regenera

**Escenario:** Crítico re-genera un recurso defectuoso (test_ova_critic_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Crítico re-genera un recurso defectuoso
    Given OVA_CRITIC está en "1" y OVA_REFLECTION_ROUNDS en "1"
    And el LLM del Crítico retorna veredicto "revisar" puntaje 40 en primera llamada
    And el LLM del Crítico retorna veredicto "aceptar" puntaje 78 en segunda llamada
    When se ejecuta run_phase con un recurso mock
    Then el result dict incluye score=78 y critique fue llamado dos veces
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Crítico re-genera un recurso defectuoso")
def test_critico_regenera():
    pass
```

**Salida obtenida:** `PASSED` en 3 ms

#### BDD-B-038 · test_critico_rondas_cero

**Escenario:** Crítico con rondas=0 evalúa pero no re-genera (test_ova_critic_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Crítico con rondas=0 evalúa pero no re-genera
    Given OVA_CRITIC está en "1" y OVA_REFLECTION_ROUNDS en "0"
    And el LLM del Crítico retorna veredicto "revisar" con puntaje 50
    When se ejecuta run_phase con un recurso mock
    Then el Crítico fue invocado exactamente una vez
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Crítico con rondas=0 evalúa pero no re-genera")
def test_critico_rondas_cero():
    pass
```

**Salida obtenida:** `PASSED` en 3 ms

#### BDD-B-039 · test_critico_falla

**Escenario:** Crítico falla — recurso aceptado igual (test_ova_critic_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Crítico falla — recurso aceptado igual
    Given OVA_CRITIC está en "1"
    And el LLM del Crítico lanza excepción
    When se ejecuta run_phase con un recurso mock
    Then el recurso se acepta sin error y score=0
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Crítico falla — recurso aceptado igual")
def test_critico_falla():
    pass
```

**Salida obtenida:** `PASSED` en 58 ms

### `tests/step_defs/test_ova_editor_steps.py`

#### BDD-B-040 · test_editor_apagado

**Escenario:** Editor apagado — noop (test_ova_editor_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Editor apagado — noop
    Given OVA_EDITOR está en "0"
    And el state tiene 2 recursos generados
    When se ejecuta editor_node
    Then retorna dict vacío sin coherence_report
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Editor apagado — noop")
def test_editor_apagado():
    pass
```

**Salida obtenida:** `PASSED` en 2 ms

#### BDD-B-041 · test_editor_aplica_parche

**Escenario:** Editor detecta inconsistencia y aplica parche (test_ova_editor_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Editor detecta inconsistencia y aplica parche
    Given OVA_EDITOR está en "1"
    And el state tiene resultados con texto "término X" en fase "explore"
    And el LLM mock retorna hallazgos y parches con reemplazo de "término X" por "término Y"
    When se ejecuta editor_node
    Then coherence_report incluye hallazgos y parches
    And el resultado de la fase "explore" ya no contiene "término X"
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Editor detecta inconsistencia y aplica parche")
def test_editor_aplica_parche():
    pass
```

**Salida obtenida:** `PASSED` en 2 ms

#### BDD-B-042 · test_editor_falla

**Escenario:** Editor falla — continúa sin crash (test_ova_editor_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Editor falla — continúa sin crash
    Given OVA_EDITOR está en "1"
    And el LLM del Editor lanza excepción
    And el state tiene 1 recurso generado
    When se ejecuta editor_node
    Then retorna coherence_report vacío sin error
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE, "Editor falla — continúa sin crash")
def test_editor_falla():
    pass
```

**Salida obtenida:** `PASSED` en 42 ms

### `tests/step_defs/test_ova_steps.py`

#### BDD-B-043 · test_db_health

**Escenario:** Endpoint de salud de base de datos responde ok (test_ova_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Endpoint de salud de base de datos responde ok
    Given el backend FastAPI en ejecución
    When se realiza GET a /api/db/health
    Then la respuesta es 200 con estado "ok"
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE_DB, "Endpoint de salud de base de datos responde ok")
def test_db_health():
    pass
```

**Salida obtenida:** `PASSED` en 9 ms

#### BDD-B-044 · test_historial_listado

**Escenario:** CA-01 — Ver lista de OVAs propios (test_ova_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: CA-01 — Ver lista de OVAs propios
    When navego a "/mis-ovas"
    Then veo exactamente 4 cards de OVAs
    And están ordenados por fecha de creación descendente
    And cada card muestra título, fecha y badge de estado
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE_HISTORIAL, "CA-01 — Ver lista de OVAs propios")
def test_historial_listado():
    pass
```

**Salida obtenida:** `PASSED` en 21 ms

### `tests/step_defs/test_roles_steps.py`

#### BDD-B-045 · test_listar_roles

**Escenario:** Ver lista de roles existentes (test_roles_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Ver lista de roles existentes
    Given que estoy en "/admin/roles"
    Then debo ver la lista de roles registrados
    And debo ver al menos los roles "administrador" y "usuario"
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE_CREAR, "Ver lista de roles existentes")
def test_listar_roles():
    pass
```

**Salida obtenida:** `PASSED` en 20 ms

#### BDD-B-046 · test_crear_rol

**Escenario:** Crear un nuevo rol exitosamente (test_roles_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Crear un nuevo rol exitosamente
    Given que estoy en "/admin/roles"
    When hago click en "Nuevo rol"
    And ingreso el nombre "docente"
    And selecciono los permisos "create_ova" y "view_ova"
    And envío el formulario
    Then el sistema debe crear el rol y retornar 201
    And el nuevo rol "docente" debe aparecer inmediatamente en la lista
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE_CREAR, "Crear un nuevo rol exitosamente")
def test_crear_rol():
    pass
```

**Salida obtenida:** `PASSED` en 28 ms

#### BDD-B-047 · test_crear_rol_duplicado

**Escenario:** Intentar crear un rol con nombre duplicado (test_roles_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Intentar crear un rol con nombre duplicado
    Given que existe un rol con nombre "docente"
    When intento crear otro rol con el mismo nombre "docente"
    Then el sistema retorna 409
    And debo ver el mensaje "Ya existe un rol con ese nombre"
    And el rol no debe duplicarse en la lista
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE_CREAR, "Intentar crear un rol con nombre duplicado")
def test_crear_rol_duplicado():
    pass
```

**Salida obtenida:** `PASSED` en 21 ms

#### BDD-B-048 · test_editar_rol

**Escenario:** Modificación exitosa del rol (test_roles_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Modificación exitosa del rol
    Given que tengo el modal de edición del rol "docente" abierto
    When cambio el nombre a "instructor"
    And selecciono el permiso "export_ova"
    And hago click en "Guardar cambios"
    Then el sistema debe actualizar el rol en la base de datos y retornar 200
    And el modal debe cerrarse automáticamente
    And el rol "instructor" con sus nuevos permisos debe listarse inmediatamente en la tabla
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE_EDITAR, "Modificación exitosa del rol")
def test_editar_rol():
    pass
```

**Salida obtenida:** `PASSED` en 20 ms

#### BDD-B-049 · test_editar_rol_duplicado

**Escenario:** Nombre duplicado al intentar editar (test_roles_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Nombre duplicado al intentar editar
    Given que existe otro rol con nombre "supervisor"
    And que tengo abierto el modal de edición del rol "docente"
    When cambio el nombre del rol a "supervisor"
    And hago click en "Guardar cambios"
    Then el sistema debe retornar un código 409
    And debo ver el mensaje de error "Ya existe un rol con ese nombre"
    And el modal debe permanecer abierto
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE_EDITAR, "Nombre duplicado al intentar editar")
def test_editar_rol_duplicado():
    pass
```

**Salida obtenida:** `PASSED` en 15 ms

#### BDD-B-050 · test_eliminar_rol_sin_usuarios

**Escenario:** Eliminar un rol sin usuarios asignados (test_roles_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Eliminar un rol sin usuarios asignados
    Given que el rol "auxiliar" tiene 0 usuarios vinculados
    And que estoy en la pantalla "/admin/roles"
    When hago click en el botón "Eliminar" de "auxiliar"
    Then debo ver un modal de confirmación simple
    And debo ver la advertencia de que la acción es irreversible
    When hago click en "Confirmar eliminación"
    Then el sistema debe eliminar el rol retornando 204
    And el rol "auxiliar" debe desaparecer de la tabla local de inmediato
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE_ELIMINAR, "Eliminar un rol sin usuarios asignados")
def test_eliminar_rol_sin_usuarios():
    pass
```

**Salida obtenida:** `PASSED` en 26 ms

#### BDD-B-051 · test_eliminar_rol_sin_reasignar

**Escenario:** Intentar eliminar un rol con usuarios sin especificar reasignación (test_roles_steps)

**Código (escenario Gherkin):**

```gherkin
  Scenario: Intentar eliminar un rol con usuarios sin especificar reasignación
    Given que el rol "auxiliar" tiene 3 usuarios asignados
    When envío un request directo DELETE a "/api/roles/111" sin query parameters
    Then el sistema retorna un código 409
    And responde con el mensaje "El rol tiene usuarios asignados"
```

**Código (enlace pytest-bdd):**

```python
@scenario(FEATURE_ELIMINAR, "Intentar eliminar un rol con usuarios sin especificar reasignación")
def test_eliminar_rol_sin_reasignar():
    pass
```

**Salida obtenida:** `PASSED` en 15 ms

## Resumen

| Suite | Casos | Pasan | Fallan |
|---|---:|---:|---:|
| Vitest (componentes) | 140 | 140 | 0 |
| cucumber-js (frontend BDD) | 63 | 63 | 0 |
| pytest-bdd (backend BDD) | 51 | 51 | 0 |
| **Total** | **254** | **254** | **0** |
