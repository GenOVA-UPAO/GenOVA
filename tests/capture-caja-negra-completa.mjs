// Captura de screenshots para el Documento de Pruebas de Caja Negra (Anexo 9) — versión AMPLIADA.
// Ejecuta 13 escenarios contra el stack local REAL (frontend :4200 → backend :8000,
// LLMs reales, worker arq activo) y guarda las capturas en docs/assets/caja-negra-completa/.
// Reutiliza los selectores reales de tests/steps/e2e y reaprovecha OVAs ya "listos"
// de la cuenta admin (evita regenerar); sólo el Escenario 4 hace UNA generación real.
//
// Uso:  cd tests && node capture-caja-negra-completa.mjs
//       ONLY=esc1,esc4 node capture-caja-negra-completa.mjs   (subconjunto)
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../docs/assets/caja-negra-completa");
mkdirSync(OUT, { recursive: true });

const BASE = process.env.BASE_URL || "http://localhost:4200";
const ADMIN = { email: "admin@genova.ai", pass: "admin1234password" };
const USER = { email: "user@genova.ai", pass: "user1234password" };
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

// Toma el primer OVA "listo" de la cuenta autenticada; no genera nada.
async function pickReadyOva(page) {
  const res = await page.request.get(`${BASE}/api/ovas`);
  if (!res.ok()) throw new Error(`listar ovas ${res.status()}`);
  const items = await res.json();
  const list = Array.isArray(items) ? items : items.items || items.ovas || [];
  const ready = list.find((o) => (o.status || o.state) === "listo");
  if (!ready) throw new Error("no hay OVA en estado 'listo' en la cuenta");
  return { id: ready.id, title: ready.title || ready.name || "" };
}

const cardByTitle = (page, title) =>
  page.locator("gn-ova-card, gn-trashed-ova-card").filter({ hasText: title }).first();

// ─── Escenario 1: Registro de usuario (partición de equivalencia) ──────────
async function esc1(ctx) {
  const page = await ctx.newPage();
  console.log("Escenario 1 — Registro");
  await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
  await page.locator("#fullName").waitFor({ state: "visible", timeout: 20000 });
  await page.getByRole("button", { name: /Crear cuenta/ }).click({ force: true }).catch(() => {});
  await page.waitForTimeout(700);
  await shot(page, "esc1_01_campos_vacios", "Submit con campos vacíos: mensajes de requerido");
  await page.locator("#fullName").fill("Juan Pérez");
  await page.locator("#email").fill(`cn_${uid()}@test.genova.ai`);
  await page.locator("#password").fill("abc");
  await page.getByRole("button", { name: /Crear cuenta/ }).click({ force: true }).catch(() => {});
  await page.waitForTimeout(700);
  await shot(page, "esc1_02_password_debil", 'Password "abc": error "Mínimo 8 caracteres con letras y números"');
  await page.locator("#email").fill("correo-sin-arroba");
  await page.locator("#password").fill("Clave1234");
  await page.getByRole("button", { name: /Crear cuenta/ }).click({ force: true }).catch(() => {});
  await page.waitForTimeout(700);
  await shot(page, "esc1_03_email_invalido", "Email sin @ ni dominio: error de formato");
  await page.locator("#email").fill("user@genova.ai");
  await page.locator("#password").fill("Clave1234");
  await page.getByRole("button", { name: /Crear cuenta/ }).click({ force: true });
  await page.waitForTimeout(1800);
  await shot(page, "esc1_04_email_duplicado", "Email ya registrado: error del backend");
  await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
  await page.locator("#fullName").fill("Nuevo Usuario CN");
  await page.locator("#email").fill(`cn_ok_${uid()}@test.genova.ai`);
  await page.locator("#password").fill("Clave1234");
  await page.getByRole("button", { name: /Crear cuenta/ }).click({ force: true });
  await Promise.any([
    page.getByText(/Verifica tu correo|Cuenta creada/).waitFor({ state: "visible", timeout: 20000 }),
    page.waitForURL(/dashboard|mis-ovas/, { timeout: 20000 }),
  ]).catch(() => {});
  await page.waitForTimeout(900);
  await shot(page, "esc1_05_registro_ok", "Datos válidos únicos: cuenta creada / sesión iniciada");
  await page.close();
}

// ─── Escenario 2: Inicio de sesión y bloqueo por intentos ──────────────────
async function esc2(ctx) {
  const page = await ctx.newPage();
  console.log("Escenario 2 — Login");
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Iniciar sesión" }).waitFor({ state: "visible", timeout: 30000 });
  await shot(page, "esc2_01_form_vacio", "Formulario vacío: botón Entrar deshabilitado");
  await emailField(page).fill("user@genova.ai");
  await passwordField(page).fill("passwordIncorrecta1");
  await page.getByRole("button", { name: "Entrar" }).click({ force: true });
  await page.waitForTimeout(1800);
  await shot(page, "esc2_02_credenciales_invalidas", "Password incorrecta: mensaje de credenciales inválidas");
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
    await errorBox.first().waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);
    const txt = await errorBox.first().textContent().catch(() => "");
    if (txt && /bloqueada/i.test(txt)) break;
  }
  await page.getByText(/Cuenta bloqueada/).first().waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  await shot(page, "esc2_03_bloqueo_cuenta", "Tras 5 intentos fallidos: cuenta bloqueada temporalmente (403)");
  await login(page, USER.email, USER.pass);
  await page.waitForTimeout(1200);
  await shot(page, "esc2_04_login_ok", "Credenciales válidas: redirección al dashboard");
  await page.close();
}

// ─── Escenario 3: Recuperación de contraseña (tabla de decisiones) ─────────
async function esc3(ctx) {
  const page = await ctx.newPage();
  console.log("Escenario 3 — Recuperar contraseña");
  await page.context().clearCookies();
  await page.goto(`${BASE}/forgot-password`, { waitUntil: "domcontentloaded" });
  await emailField(page).waitFor({ state: "visible", timeout: 20000 });
  await shot(page, "esc3_01_pantalla", "Pantalla de recuperación de contraseña");
  await emailField(page).fill(`cn_inexistente_${uid()}@test.genova.ai`);
  await page.getByRole("button", { name: /Enviar|Recuperar|Restablecer|Continuar/ }).first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(1800);
  await shot(page, "esc3_02_email_generico", "Mensaje genérico (no revela si el correo existe) — anti-enumeración");
  await page.close();
}

// ─── Escenario 4: Crear OVA desde prompt + generación real en vivo ─────────
async function esc4(ctx) {
  const page = await ctx.newPage();
  console.log("Escenario 4 — Crear OVA (generación real)");
  await login(page, USER.email, USER.pass);
  await page.goto(`${BASE}/crear`, { waitUntil: "domcontentloaded" });
  await page.locator("textarea").first().waitFor({ state: "visible", timeout: 20000 });
  await shot(page, "esc4_01_generar_deshabilitado", "Sin prompt: botón Generar OVA deshabilitado");
  const prompt = `Prueba caja negra ${uid()}: introducción a las fracciones para 5.º de primaria. Objetivo: comparar y ordenar fracciones.`;
  await page.locator("textarea").first().fill(prompt);
  await page.waitForTimeout(500);
  await shot(page, "esc4_02_prompt_escrito", "Prompt válido escrito, botón Generar OVA habilitado");
  await page.getByRole("button", { name: "Configurar recursos 5E" }).click().catch(() => {});
  await page.waitForTimeout(1200);
  await shot(page, "esc4_03_modal_recursos", "Modal de configuración de recursos por fase 5E");
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(400);
  // Generación REAL mínima vía API (1 recurso) para acotar créditos/tiempo.
  const res = await page.request.post(`${BASE}/api/jobs`, {
    data: {
      prompt,
      resources: [
        { phase_type: "engage", resource_type: "Cómic Interactivo" },
        { phase_type: "explore", resource_type: "Lectura Interactiva" },
      ],
    },
  });
  if (res.status() !== 202) {
    results.push({ name: "esc4_job_ERROR", note: `${res.status()} ${(await res.text()).slice(0, 200)}` });
    await page.close();
    return null;
  }
  const { job_id } = await res.json();
  results.push({ name: "esc4_job_id", note: job_id });
  // Capturar estado "generando/en cola" en vivo lo antes posible.
  await page.goto(`${BASE}/crear?jobId=${job_id}`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(2500);
  await shot(page, "esc4_04_generando", "Generación en curso: progreso en vivo (SSE / panel de nodos)");
  // Poll hasta 'done' (máx 6 min); si termina, captura el resultado real.
  let ovaId = null;
  const deadline = Date.now() + 480000;
  for (;;) {
    const poll = await page.request.get(`${BASE}/api/jobs/${job_id}`);
    if (poll.ok()) {
      const j = await poll.json();
      if (j.status === "done") { ovaId = j.ova_id; break; }
      if (["error", "canceled"].includes(j.status)) {
        results.push({ name: "esc4_job_status", note: j.status });
        break;
      }
    }
    if (Date.now() > deadline) { results.push({ name: "esc4_job_status", note: "timeout 6min" }); break; }
    await page.waitForTimeout(4000);
  }
  if (ovaId) {
    results.push({ name: "esc4_ova_id", note: ovaId });
    await page.goto(`${BASE}/workspace/${ovaId}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    await shot(page, "esc4_05_resultado_workspace", "OVA REAL generado, abierto en el workspace");
  }
  await page.close();
  return ovaId;
}

// ─── Escenario 5: Visualización del OVA en el workspace (5E) ────────────────
async function esc5(ctx) {
  const page = await ctx.newPage();
  console.log("Escenario 5 — Workspace 5E (OVA listo)");
  await login(page, ADMIN.email, ADMIN.pass);
  const ova = await pickReadyOva(page);
  await page.goto(`${BASE}/workspace/${ova.id}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await shot(page, "esc5_01_workspace_recursos", "Workspace con recursos generados por fase (5E)");
  const scorm = page.getByRole("button", { name: "SCORM" });
  await scorm.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(600);
  await shot(page, "esc5_02_boton_scorm", "Botón de exportación SCORM visible en el workspace");
  await page.close();
}

// ─── Escenario 6: Edición del OVA en el workspace ──────────────────────────
async function esc6(ctx) {
  const page = await ctx.newPage();
  console.log("Escenario 6 — Edición en workspace");
  await login(page, ADMIN.email, ADMIN.pass);
  const ova = await pickReadyOva(page);
  await page.goto(`${BASE}/workspace/${ova.id}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  // Panel de edición estilo chat (prompt de edición)
  const chat = page.locator("textarea").first();
  await chat.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  await chat.fill("Haz el título de la introducción más motivador para estudiantes.").catch(() => {});
  await page.waitForTimeout(600);
  await shot(page, "esc6_01_panel_edicion", "Panel de edición (prompt de cambios) sobre el OVA");
  await page.close();
}

// ─── Escenario 7: Exportación del OVA como paquete SCORM ───────────────────
async function esc7(ctx) {
  const page = await ctx.newPage();
  console.log("Escenario 7 — Exportar SCORM");
  await login(page, ADMIN.email, ADMIN.pass);
  const ova = await pickReadyOva(page);
  await page.goto(`${BASE}/mis-ovas`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const card = cardByTitle(page, ova.title);
  await card.waitFor({ state: "visible", timeout: 15000 });
  await card.scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, "esc7_01_card_descargar", "Card del OVA 'Listo' con botón Descargar habilitado");
  const dl = page.waitForEvent("download", { timeout: 90000 });
  await card.getByRole("button", { name: "Descargar" }).click();
  const download = await dl;
  const filename = download.suggestedFilename();
  const savePath = resolve(OUT, `_scorm_${filename}`);
  await download.saveAs(savePath).catch(() => {});
  results.push({ name: "esc7_download_filename", note: filename });
  await page.waitForTimeout(600);
  await shot(page, "esc7_02_descarga_scorm", `Descarga del paquete SCORM: ${filename}`);
  await page.close();
}

// ─── Escenario 8: Gestión de biblioteca (buscar/duplicar/papelera/restaurar) ─
async function esc8(ctx) {
  const page = await ctx.newPage();
  console.log("Escenario 8 — Biblioteca");
  await login(page, ADMIN.email, ADMIN.pass);
  const ova = await pickReadyOva(page);
  // Término de búsqueda limpio (1ª línea del título, sin saltos ni elipsis)
  const q = (ova.title.split("\n")[0] || ova.title).replace(/[.…]+$/, "").slice(0, 45).trim();
  await page.goto(`${BASE}/mis-ovas`, { waitUntil: "domcontentloaded" });
  const search = page.getByRole("textbox", { name: /Buscar por título/i }).first();
  await search.waitFor({ state: "visible", timeout: 15000 });
  await search.fill(q);
  await page.waitForTimeout(1000);
  await shot(page, "esc8_01_buscar", "Búsqueda por título en Mis OVAs");
  // Duplicar la primera card (operamos sobre la COPIA para no alterar originales)
  await page.locator("gn-ova-card").first().getByRole("button", { name: "Duplicar" }).click();
  await page.getByText(/\(copia\)/).first().waitFor({ state: "visible", timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await shot(page, "esc8_02_duplicado", 'Duplicado: aparece la copia "(copia)"');
  // Aislar la COPIA por su sufijo y moverla a papelera
  await search.fill("(copia)");
  await page.waitForTimeout(1000);
  const copyCard = () => page.locator("gn-ova-card").filter({ hasText: "(copia)" }).first();
  await copyCard().waitFor({ state: "visible", timeout: 15000 });
  await copyCard().getByRole("button", { name: "A papelera" }).click();
  await page.waitForTimeout(600);
  await shot(page, "esc8_03_confirmar_papelera", "Confirmación de mover a papelera");
  await page.getByRole("button", { name: "Mover", exact: true }).click();
  await page.waitForTimeout(1200);
  await page.goto(`${BASE}/papelera`, { waitUntil: "domcontentloaded" });
  await page.getByText(/\(copia\)/).first().waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
  await shot(page, "esc8_04_papelera", "La copia movida aparece en la papelera (borrado lógico)");
  // Restaurar
  const trashCard = () => page.locator("gn-trashed-ova-card").filter({ hasText: "(copia)" }).first();
  await trashCard().getByRole("button", { name: "Restaurar" }).click().catch(() => {});
  await page.waitForTimeout(1500);
  await shot(page, "esc8_05_restaurado", "La copia restaurada vuelve a Mis OVAs");
  // Cleanup: mover a papelera y borrar definitivamente la copia
  await page.goto(`${BASE}/mis-ovas`, { waitUntil: "domcontentloaded" });
  await search.fill("(copia)");
  await page.waitForTimeout(1000);
  await copyCard().getByRole("button", { name: "A papelera" }).click().catch(() => {});
  await page.getByRole("button", { name: "Mover", exact: true }).click().catch(() => {});
  await page.waitForTimeout(1000);
  await page.goto(`${BASE}/papelera`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await trashCard().getByRole("button", { name: "Borrar definitivamente" }).click().catch(() => {});
  await page.getByRole("button", { name: "Eliminar", exact: true }).click().catch(() => {});
  await page.waitForTimeout(800);
  await page.close();
}

// ─── Escenario 9: Ver y editar perfil (partición de equivalencia) ──────────
async function esc9(ctx) {
  const page = await ctx.newPage();
  console.log("Escenario 9 — Perfil");
  const email = `cn_perfil_${uid()}@test.genova.ai`;
  await page.request.post(`${BASE}/api/auth/register`, {
    data: { full_name: "Perfil CN", email, password: "Clave1234" },
  });
  await login(page, email, "Clave1234");
  await page.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await shot(page, "esc9_01_perfil", "Pantalla de perfil con datos de la cuenta");
  // Editar el nombre (dato válido) y guardar
  const nameInput = page.locator("#fullName, input[name=fullName], input[type=text]").first();
  await nameInput.fill("Perfil CN Editado").catch(() => {});
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /Guardar/ }).first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(1200);
  await shot(page, "esc9_02_perfil_editado", "Nombre actualizado y guardado (dato válido)");
  await page.close();
}

// ─── Escenario 10: Cambiar contraseña desde el perfil (partición) ──────────
async function esc10(ctx) {
  const page = await ctx.newPage();
  console.log("Escenario 10 — Cambiar contraseña");
  const email = `cn_pass_${uid()}@test.genova.ai`;
  await page.request.post(`${BASE}/api/auth/register`, {
    data: { full_name: "Pass CN", email, password: "Clave1234" },
  });
  await page.setViewportSize({ width: 1440, height: 1040 }); // que el toast (abajo) quede visible
  await login(page, email, "Clave1234");
  await page.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  // Cambiar a la pestaña "Seguridad" (el form de contraseña vive allí)
  await page.getByRole("button", { name: "Seguridad", exact: true }).click().catch(async () => {
    await page.getByText("Seguridad", { exact: true }).first().click().catch(() => {});
  });
  await page.locator("#currentPassword").waitFor({ state: "visible", timeout: 10000 });
  const current = page.locator("#currentPassword");
  const next = page.locator("#newPassword");
  const confirm = page.locator("#confirmPassword");
  const submit = page.getByRole("button", { name: "Actualizar Contraseña" });
  const fillPw = async (c, n, cf) => {
    for (const [el, val] of [[current, c], [next, n], [confirm, cf]]) {
      await el.click();
      await el.fill("");
      await el.type(val, { delay: 15 });
    }
    await confirm.blur().catch(() => {});
    await page.waitForTimeout(400);
  };
  const changePwResp = () =>
    page.waitForResponse((r) => r.url().includes("/change-password"), { timeout: 15000 }).catch(() => null);
  // C1: contraseña actual incorrecta (formato válido → el backend la rechaza con 400)
  await fillPw("noEsLaActual1", "NuevaClave1", "NuevaClave1");
  let respP = changePwResp();
  await submit.click({ force: true }).catch(() => {});
  await respP;
  await page.waitForTimeout(1000);
  await shot(page, "esc10_01_actual_incorrecta", "Contraseña actual incorrecta: la aplicación rechaza el cambio (HTTP 400)");
  await page.waitForTimeout(600);
  // C2: nueva contraseña débil (validación en línea deshabilita el envío)
  await fillPw("Clave1234", "abc", "abc");
  await page.waitForTimeout(600);
  await shot(page, "esc10_02_nueva_debil", "Nueva contraseña débil: error de política y botón deshabilitado");
  // C3: cambio válido
  await fillPw("Clave1234", "NuevaClave1", "NuevaClave1");
  respP = changePwResp();
  await submit.click({ force: true }).catch(() => {});
  await respP;
  await page.waitForTimeout(1200);
  await shot(page, "esc10_03_cambio_ok", "Cambio de contraseña correcto (HTTP 200; el botón vuelve a habilitarse)");
  await page.close();
}

// ─── Escenario 11: Carga de archivos base para RAG ─────────────────────────
async function esc11(ctx) {
  const page = await ctx.newPage();
  console.log("Escenario 11 — Subida de archivos RAG");
  await login(page, USER.email, USER.pass);
  await page.goto(`${BASE}/crear`, { waitUntil: "domcontentloaded" });
  await page.locator("textarea").first().waitFor({ state: "visible", timeout: 20000 });
  // Cerrar el tour de onboarding (driver.js) para no tapar la vista
  await page.keyboard.press("Escape").catch(() => {});
  await page.locator(".driver-popover-close-btn").click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(600);
  await page.locator("textarea").first().fill("OVA sobre fracciones apoyado en un documento base adjunto (contexto RAG).");
  await page.waitForTimeout(300);
  // Abrir la sección "Archivos" para mostrar la afordancia de carga
  await page.getByRole("button", { name: "Archivos de referencia" }).click().catch(() => {});
  await page.waitForTimeout(500);
  await shot(page, "esc11_01_zona_carga", "Zona de creación con carga de archivos contextuales (RAG)");
  // Adjuntar un archivo aceptado (.png) vía el input[type=file] oculto
  const sample = resolve(OUT, "_muestra_contexto.png");
  // PNG 1x1 válido (base64)
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  writeFileSync(sample, png);
  const fileInput = page.locator('input[type=file]').first();
  await fileInput.setInputFiles(sample).catch((e) => results.push({ name: "esc11_upload_ERROR", note: e.message }));
  await page.getByText(/_muestra_contexto|muestra_contexto|\.png/i).first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await shot(page, "esc11_02_archivo_adjunto", "Archivo de contexto adjuntado y aceptado (chip visible)");
  await page.close();
}

// ─── Escenario 12: Configuración del catálogo de modelos de IA ─────────────
async function esc12(ctx) {
  const page = await ctx.newPage();
  console.log("Escenario 12 — Modelos de IA");
  await login(page, ADMIN.email, ADMIN.pass);
  await page.goto(`${BASE}/models`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  // Esperar a que las tarjetas de modelo dejen de ser skeletons
  await page.getByText(/Groq|OpenRouter|Gemini|Cerebras|primario|Fallback|tarea/i).first().waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await shot(page, "esc12_01_catalogo_modelos", "Catálogo de proveedores y modelos de IA");
  // Desplazar para mostrar asignación por tarea / fallback si existe
  await page.mouse.wheel(0, 700).catch(() => {});
  await page.waitForTimeout(1200);
  await shot(page, "esc12_02_asignacion_fallback", "Asignación de modelos por tarea y cadena de fallback");
  await page.close();
}

// ─── Escenario 13: Administración (usuarios, roles y control de acceso) ─────
async function esc13(ctx) {
  const page = await ctx.newPage();
  console.log("Escenario 13 — Administración");
  await login(page, ADMIN.email, ADMIN.pass);
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Usuarios" }).waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const search = page.getByRole("textbox", { name: /Buscar por nombre o email/i });
  await search.fill("genova.ai").catch(() => {});
  await page.waitForTimeout(700);
  await shot(page, "esc13_01_usuarios", "Gestión de usuarios (búsqueda por email)");
  await page.goto(`${BASE}/admin/roles`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await shot(page, "esc13_02_roles", "Gestión de roles del sistema");
  await page.getByRole("button", { name: "Nuevo rol" }).click().catch(() => {});
  await page.waitForTimeout(700);
  await shot(page, "esc13_03_crear_rol", "Formulario de creación de rol");
  await page.keyboard.press("Escape").catch(() => {});
  await page.close();
  // Control de acceso: usuario SIN rol admin intenta entrar a /admin (página nueva,
  // evita la carrera de estado SPA al re-loguear sobre la misma página).
  const upage = await ctx.newPage();
  await login(upage, USER.email, USER.pass);
  await upage.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await upage.waitForURL(/dashboard/, { timeout: 15000 }).catch(() => {});
  await upage.waitForTimeout(1500);
  await shot(upage, "esc13_04_control_acceso", "Usuario no-admin en /admin: el adminGuard lo redirige al Dashboard (sin panel admin)");
  await upage.close();
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  const all = { esc1, esc2, esc3, esc4, esc5, esc6, esc7, esc8, esc9, esc10, esc11, esc12, esc13 };
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
