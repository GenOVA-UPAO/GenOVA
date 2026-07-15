// Captura de screenshots para el Documento de Pruebas de Caja Negra (Anexo 9).
// Ejecuta los 8 escenarios contra el stack local (frontend :4300 → backend :8001
// con LLM_FAKE=1 y RATE_LIMIT_ENABLED=0) y guarda las capturas en
// docs/assets/caja-negra/. Reutiliza los selectores reales de tests/steps/e2e.
//
// Uso:  cd tests && node capture-caja-negra.mjs
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../docs/assets/caja-negra");
mkdirSync(OUT, { recursive: true });

const BASE = process.env.BASE_URL || "http://localhost:4300";
const results = [];

function uid() {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

async function shot(page, name, note) {
  const path = resolve(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  results.push({ name, note: note || "" });
  console.log(`  [shot] ${name} — ${note || ""}`);
}

const emailField = (page) => page.locator("#email, input[type=email]").first();
const passwordField = (page) => page.locator("#password input, input[type=password]").first();

async function login(page, email, pass) {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.sessionStorage.clear()).catch(() => {});
  await page.getByRole("heading", { name: "Iniciar sesión" }).waitFor({ state: "visible", timeout: 30000 });
  await emailField(page).fill(email);
  await passwordField(page).fill(pass);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/dashboard|mis-ovas|admin/, { timeout: 20000 });
}

async function seedOva(page) {
  const title = `OVA CN ${uid()}`;
  const res = await page.request.post(`${BASE}/api/ova/jobs`, {
    data: {
      prompt: `${title}: redes de computadoras para principiantes, nivel universitario.`,
      resources: [
        { phase_type: "engage", resource_type: "Cómic Interactivo" },
        { phase_type: "explore", resource_type: "Lectura Interactiva" },
      ],
    },
  });
  if (res.status() !== 202) throw new Error(`seed ${res.status()} ${await res.text()}`);
  const { job_id } = await res.json();
  const deadline = Date.now() + 90000;
  for (;;) {
    const poll = await page.request.get(`${BASE}/api/ova/jobs/${job_id}`);
    if (poll.ok()) {
      const j = await poll.json();
      if (j.status === "done") return { title, ovaId: j.ova_id };
      if (["error", "canceled"].includes(j.status)) throw new Error(`seed status ${j.status}`);
    }
    if (Date.now() > deadline) throw new Error("seed timeout 90s");
    await page.waitForTimeout(1000);
  }
}

// ─── Escenario 1: Registro de usuario ──────────────────────────────────────
async function esc1(ctx) {
  const page = await ctx.newPage();
  console.log("Escenario 1 — Registro");
  await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
  await page.locator("#fullName").waitFor({ state: "visible", timeout: 20000 });
  // C1: campos vacíos → submit
  await page.getByRole("button", { name: /Crear cuenta/ }).click({ force: true }).catch(() => {});
  await page.waitForTimeout(600);
  await shot(page, "esc1_01_campos_vacios", "Submit con campos vacíos: mensajes de requerido");
  // C2: password corta / sin números
  await page.locator("#fullName").fill("Juan Pérez");
  await page.locator("#email").fill(`cn_${uid()}@test.genova.ai`);
  await page.locator("#password").fill("abc");
  await page.getByRole("button", { name: /Crear cuenta/ }).click({ force: true }).catch(() => {});
  await page.waitForTimeout(600);
  await shot(page, "esc1_02_password_debil", 'Password "abc": error "Mínimo 8 caracteres con letras y números"');
  // C3: email inválido
  await page.locator("#email").fill("correo-sin-arroba");
  await page.locator("#password").fill("Clave1234");
  await page.getByRole("button", { name: /Crear cuenta/ }).click({ force: true }).catch(() => {});
  await page.waitForTimeout(600);
  await shot(page, "esc1_03_email_invalido", "Email sin @ ni dominio: error de formato");
  // C4: email ya registrado
  await page.locator("#email").fill("user@genova.ai");
  await page.locator("#password").fill("Clave1234");
  await page.getByRole("button", { name: /Crear cuenta/ }).click({ force: true });
  await page.waitForTimeout(1500);
  await shot(page, "esc1_04_email_duplicado", "Email ya registrado: error del backend");
  // C5: registro válido único
  await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
  await page.locator("#fullName").fill("Nuevo Usuario CN");
  await page.locator("#email").fill(`cn_ok_${uid()}@test.genova.ai`);
  await page.locator("#password").fill("Clave1234");
  await page.getByRole("button", { name: /Crear cuenta/ }).click({ force: true });
  await Promise.any([
    page.getByText("Verifica tu correo").waitFor({ state: "visible", timeout: 20000 }),
    page.waitForURL(/dashboard|mis-ovas/, { timeout: 20000 }),
  ]).catch(() => {});
  await page.waitForTimeout(800);
  await shot(page, "esc1_05_registro_ok", "Datos válidos únicos: cuenta creada / sesión iniciada");
  await page.close();
}

// ─── Escenario 2: Inicio de sesión ─────────────────────────────────────────
async function esc2(ctx) {
  const page = await ctx.newPage();
  console.log("Escenario 2 — Login");
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Iniciar sesión" }).waitFor({ state: "visible", timeout: 30000 });
  await shot(page, "esc2_01_form_vacio", "Formulario vacío: botón Entrar deshabilitado");
  // C2: credenciales inválidas
  await emailField(page).fill("user@genova.ai");
  await passwordField(page).fill("passwordIncorrecta1");
  await page.getByRole("button", { name: "Entrar" }).click({ force: true });
  await page.waitForTimeout(1500);
  await shot(page, "esc2_02_credenciales_invalidas", "Password incorrecta: mensaje de credenciales inválidas");
  // C3: bloqueo por intentos (cuenta desechable, NO la seed)
  const lockEmail = `cn_lock_${uid()}@test.genova.ai`;
  await page.request.post(`${BASE}/api/auth/register`, {
    data: { full_name: "Cuenta Bloqueo", email: lockEmail, password: "Clave1234" },
  });
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Iniciar sesión" }).waitFor({ state: "visible", timeout: 30000 });
  const errorBox = page.getByText(/Cuenta bloqueada|Credenciales inválidas/);
  for (let i = 1; i <= 8; i++) {
    await emailField(page).fill(lockEmail);
    await passwordField(page).fill("malmal99");
    await page.getByRole("button", { name: "Entrar" }).click({ force: true });
    // esperar a que el backend responda y el mensaje se pinte antes del próximo intento
    await errorBox.first().waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);
    const txt = await errorBox.first().textContent().catch(() => "");
    if (txt && /bloqueada/i.test(txt)) break;
  }
  await page.getByText(/Cuenta bloqueada/).first().waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  await shot(page, "esc2_03_bloqueo_cuenta", "Tras 5 intentos fallidos: cuenta bloqueada temporalmente (403)");
  // C4: login válido
  await login(page, "user@genova.ai", "user1234password");
  await page.waitForTimeout(1000);
  await shot(page, "esc2_04_login_ok", "Credenciales válidas: redirección al dashboard");
  await page.close();
}

// ─── Escenario 3: Crear OVA desde prompt ───────────────────────────────────
async function esc3(ctx) {
  const page = await ctx.newPage();
  console.log("Escenario 3 — Crear OVA");
  await login(page, "user@genova.ai", "user1234password");
  await page.goto(`${BASE}/crear`, { waitUntil: "domcontentloaded" });
  await page.locator("textarea").first().waitFor({ state: "visible", timeout: 20000 });
  await shot(page, "esc3_01_generar_deshabilitado", "Sin prompt ni recursos: botón Generar OVA deshabilitado");
  await page.locator("textarea").first().fill(`OVA CN ${uid()} sobre álgebra lineal: objetivos, nivel universitario.`);
  await page.waitForTimeout(400);
  await shot(page, "esc3_02_prompt_escrito", "Prompt válido escrito, botón Generar OVA habilitado");
  // Modal de configuración de recursos 5E (aria-label actual)
  await page.getByRole("button", { name: "Configurar recursos 5E" }).click();
  await page.waitForTimeout(1000);
  await shot(page, "esc3_03_modal_recursos", "Modal de configuración de recursos por fase 5E");
  await page.getByRole("button", { name: "Cancelar" }).first().click().catch(() => {});
  await page.waitForTimeout(400);
  // Resultado de la generación: se siembra vía API (LLM_FAKE) y se abre el workspace
  const ova = await seedOva(page);
  await page.goto(`${BASE}/mis-ovas`, { waitUntil: "domcontentloaded" });
  const search = page.getByPlaceholder(/Buscar por título/i);
  await search.waitFor({ state: "visible", timeout: 15000 });
  await search.fill(ova.title);
  let card = page.locator("gn-ova-card, gn-trashed-ova-card").filter({ hasText: ova.title }).first();
  await card.waitFor({ state: "visible", timeout: 15000 });
  const editar = () => card.getByRole("button", { name: "Editar" });
  // Tras generar, la card puede tardar en pasar a "Listo": recargar hasta que Editar se habilite
  for (let i = 0; i < 6 && (await editar().isDisabled().catch(() => true)); i++) {
    await page.reload({ waitUntil: "domcontentloaded" });
    await search.fill(ova.title);
    card = page.locator("gn-ova-card, gn-trashed-ova-card").filter({ hasText: ova.title }).first();
    await card.waitFor({ state: "visible", timeout: 15000 });
    await page.waitForTimeout(1500);
  }
  await editar().click({ timeout: 20000 });
  await page.waitForURL(/\/workspace\//, { timeout: 30000 });
  await page.waitForTimeout(1500);
  await shot(page, "esc3_04_workspace", "OVA generado abierto en el workspace");
  await page.close();
}

// ─── Escenario 4: Workspace / visualización 5E ─────────────────────────────
async function esc4(ctx) {
  const page = await ctx.newPage();
  console.log("Escenario 4 — Workspace 5E");
  await login(page, "user@genova.ai", "user1234password");
  const ova = await seedOva(page);
  await page.goto(`${BASE}/mis-ovas`, { waitUntil: "domcontentloaded" });
  const search = page.getByPlaceholder(/Buscar por título/i);
  await search.waitFor({ state: "visible", timeout: 15000 });
  await search.fill(ova.title);
  const card = page.locator("gn-ova-card, gn-trashed-ova-card").filter({ hasText: ova.title }).first();
  await card.waitFor({ state: "visible", timeout: 15000 });
  await card.getByRole("button", { name: "Editar" }).click();
  await page.waitForURL(/\/workspace\//, { timeout: 30000 });
  await page.waitForTimeout(1500);
  await shot(page, "esc4_01_workspace_recursos", "Workspace con recursos de las fases seleccionadas (5E)");
  const scorm = page.getByRole("button", { name: "SCORM" });
  await scorm.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(400);
  await shot(page, "esc4_02_boton_scorm", "Botón de exportación SCORM visible en el workspace");
  return ova; // reuse in esc5/esc6 via a fresh page
}

// ─── Escenario 5: Exportar SCORM (descarga) ────────────────────────────────
async function esc5(ctx) {
  const page = await ctx.newPage();
  console.log("Escenario 5 — Exportar SCORM");
  await login(page, "user@genova.ai", "user1234password");
  const ova = await seedOva(page);
  await page.goto(`${BASE}/mis-ovas`, { waitUntil: "domcontentloaded" });
  const search = page.getByPlaceholder(/Buscar por título/i);
  await search.waitFor({ state: "visible", timeout: 15000 });
  await search.fill(ova.title);
  const card = page.locator("gn-ova-card, gn-trashed-ova-card").filter({ hasText: ova.title }).first();
  await card.waitFor({ state: "visible", timeout: 15000 });
  await shot(page, "esc5_01_card_descargar", "Card del OVA con botón Descargar habilitado");
  const dl = page.waitForEvent("download", { timeout: 60000 });
  await card.getByRole("button", { name: "Descargar" }).click();
  const download = await dl;
  const filename = download.suggestedFilename();
  results.push({ name: "esc5_download_filename", note: filename });
  console.log(`  [download] ${filename}`);
  await page.waitForTimeout(500);
  await shot(page, "esc5_02_descarga_scorm", `Descarga del paquete SCORM: ${filename}`);
  await page.close();
}

// ─── Escenario 6: Gestión de biblioteca ────────────────────────────────────
async function esc6(ctx) {
  const page = await ctx.newPage();
  console.log("Escenario 6 — Biblioteca");
  await login(page, "user@genova.ai", "user1234password");
  const ova = await seedOva(page);
  await page.goto(`${BASE}/mis-ovas`, { waitUntil: "domcontentloaded" });
  const search = page.getByPlaceholder(/Buscar por título/i);
  await search.waitFor({ state: "visible", timeout: 15000 });
  await search.fill(ova.title);
  const card = () => page.locator("gn-ova-card, gn-trashed-ova-card").filter({ hasText: ova.title }).first();
  await card().waitFor({ state: "visible", timeout: 15000 });
  await shot(page, "esc6_01_buscar", "Búsqueda por título en Mis OVAs");
  // Duplicar
  await card().getByRole("button", { name: "Duplicar" }).click();
  await page.getByText(`${ova.title} (copia)`).waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(600);
  await shot(page, "esc6_02_duplicado", 'Duplicado: aparece la copia "(copia)"');
  // Mover a papelera
  await search.fill(ova.title);
  await card().waitFor({ state: "visible", timeout: 15000 });
  await card().getByRole("button", { name: "Papelera" }).click();
  await page.waitForTimeout(400);
  await shot(page, "esc6_03_confirmar_papelera", "Confirmación de mover a papelera");
  await page.getByRole("button", { name: "Mover", exact: true }).click();
  await page.waitForTimeout(800);
  // Papelera
  await page.goto(`${BASE}/papelera`, { waitUntil: "domcontentloaded" });
  await page.getByText(ova.title).first().waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  await shot(page, "esc6_04_papelera", "OVA movido aparece en la papelera");
  await page.close();
}

// ─── Escenario 7: Editar perfil / cambiar contraseña ───────────────────────
async function esc7(ctx) {
  const page = await ctx.newPage();
  console.log("Escenario 7 — Perfil");
  // Cuenta desechable para no alterar la seed al cambiar la contraseña
  const email = `cn_perfil_${uid()}@test.genova.ai`;
  await page.request.post(`${BASE}/api/auth/register`, {
    data: { full_name: "Perfil CN", email, password: "Clave1234" },
  });
  await login(page, email, "Clave1234");
  await page.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await shot(page, "esc7_01_perfil", "Pantalla de perfil con datos de la cuenta");
  await page.close();
}

// ─── Escenario 8: Administración ───────────────────────────────────────────
async function esc8(ctx) {
  const page = await ctx.newPage();
  console.log("Escenario 8 — Admin");
  await login(page, "admin@genova.ai", "admin1234password");
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Usuarios" }).waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
  const search = page.getByPlaceholder(/Buscar por nombre o email/i);
  await search.fill("genova.ai").catch(() => {});
  await page.waitForTimeout(600);
  await shot(page, "esc8_01_usuarios", "Gestión de usuarios (búsqueda por email)");
  await page.goto(`${BASE}/admin/roles`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await shot(page, "esc8_02_roles", "Gestión de roles del sistema");
  await page.getByRole("button", { name: "Nuevo rol" }).click().catch(() => {});
  await page.waitForTimeout(600);
  await shot(page, "esc8_03_crear_rol", "Formulario de creación de rol");
  await page.keyboard.press("Escape").catch(() => {});
  await page.goto(`${BASE}/models`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await shot(page, "esc8_04_modelos_llm", "Configuración del catálogo de modelos LLM");
  await page.close();
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const all = { esc1, esc2, esc3, esc4, esc5, esc6, esc7, esc8 };
  const only = (process.env.ONLY || "").split(",").map((s) => s.trim()).filter(Boolean);
  const steps = only.length ? only.map((k) => all[k]).filter(Boolean) : Object.values(all);
  for (const step of steps) {
    try {
      await step(ctx);
    } catch (e) {
      console.error(`  [ERROR] ${step.name}: ${e.message}`);
      results.push({ name: `${step.name}_ERROR`, note: e.message });
    }
  }
  await browser.close();
  console.log("\n==== RESUMEN CAPTURAS ====");
  for (const r of results) console.log(`${r.name}\t${r.note}`);
})();
