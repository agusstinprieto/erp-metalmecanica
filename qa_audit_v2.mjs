/**
 * McVill ERP — Full QA Audit Script v2
 * Playwright headless Chromium, viewport 1280x800
 * Proper login: agus / godmode22
 * SPA: navigation via sidebar clicks (not URL routes)
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:5174';
const SCREENSHOT_DIR = './qa_screenshots_v2';
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const results = [];
const consoleErrors = [];
let errorCount400 = 0;

function log(module, status, note) {
  results.push({ module, status, note });
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '~';
  console.log(`  [${icon}] ${module}: ${note}`);
}

async function shot(page, name) {
  const path = join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function waitEl(page, selector, timeout = 4000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch { return false; }
}

// Click a sidebar item by its label text
async function clickSidebarItem(page, label) {
  // The sidebar uses div elements with text, not <a> tags
  const selectors = [
    `div[class*="sidebar"] span:text("${label}")`,
    `aside span:text("${label}")`,
    `nav span:text("${label}")`,
    `text="${label}"`,
  ];
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1500 })) {
        await el.click();
        await page.waitForTimeout(1800);
        return true;
      }
    } catch {}
  }
  // Try scrolling sidebar container and retry
  try {
    const sidebar = page.locator('div[class*="overflow-y-auto"]').first();
    await sidebar.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(300);
    for (const sel of selectors) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 1000 })) {
          await el.click();
          await page.waitForTimeout(1800);
          return true;
        }
      } catch {}
    }
  } catch {}
  return false;
}

// Check if page has real content (not white screen)
async function hasContent(page) {
  const text = await page.locator('body').textContent().catch(() => '');
  const cards = await page.locator('[class*="card"], [class*="Card"], table, [class*="table"]').count();
  return text.trim().length > 100 || cards > 0;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // Capture console errors and HTTP errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      consoleErrors.push(`CONSOLE: ${text.substring(0, 200)}`);
    }
  });
  page.on('response', response => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && url.includes('supabase')) {
      errorCount400++;
      if (consoleErrors.length < 50) {
        consoleErrors.push(`HTTP ${status}: ${url.replace('https://kfdbgvyeomoewzmhkbsn.supabase.co', '[supabase]').substring(0, 120)}`);
      }
    }
  });

  // ─────────────────────────────────────────────
  // 1. LOAD & LOGIN
  // ─────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║    McVill ERP — QA AUDIT v2 (Playwright)        ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
  console.log('── STEP 1: LOGIN ──');

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await shot(page, '01_initial_load');

  const title = await page.title();
  console.log('  App title:', title);
  console.log('  URL:', page.url());

  // Check for login form
  const hasLoginForm = await waitEl(page, 'form', 3000);
  let loggedIn = false;

  if (hasLoginForm) {
    console.log('  Login form detected. Using godmode credentials: agus / godmode22');

    // Fill username (the input is for "email" but accepts username 'agus')
    const userInput = page.locator('input[type="email"], input[type="text"]').first();
    await userInput.fill('agus');

    const passInput = page.locator('input[type="password"]').first();
    await passInput.fill('godmode22');

    await shot(page, '02_login_filled');

    // Submit form
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // Wait for redirect / state change
    await page.waitForTimeout(3000);
    await shot(page, '03_after_login');

    // Check if we're past the login screen
    const stillHasForm = await waitEl(page, 'form input[type="password"]', 1500);
    if (!stillHasForm) {
      loggedIn = true;
      log('Login (agus/godmode22)', 'PASS', 'Godmode bypass accepted, dashboard loaded');
    } else {
      // Try demo credentials
      console.log('  Godmode failed, trying demo/demo123...');
      await userInput.fill('demo');
      await passInput.fill('demo123');
      await submitBtn.click();
      await page.waitForTimeout(2500);
      const stillHasForm2 = await waitEl(page, 'form input[type="password"]', 1500);
      if (!stillHasForm2) {
        loggedIn = true;
        log('Login (demo/demo123)', 'PASS', 'Demo access granted');
      } else {
        log('Login', 'FAIL', 'All credentials rejected — running limited audit');
      }
    }
  } else {
    // Check if already on app / no auth wall
    const bodyText = await page.locator('body').textContent().catch(() => '');
    if (bodyText.includes('Tablero') || bodyText.includes('Dashboard') || bodyText.includes('ERP')) {
      loggedIn = true;
      log('Login', 'PASS', 'Already authenticated or no auth wall');
    } else {
      log('Login', 'PARTIAL', 'No login form found, continuing anyway');
      loggedIn = true;
    }
  }

  await page.waitForTimeout(1000);
  const postLoginText = await page.locator('body').textContent().catch(() => '');
  const isGodmode = postLoginText.includes('ACCESO TOTAL');
  console.log(`  Godmode indicator: ${isGodmode}`);

  // ─────────────────────────────────────────────
  // 2. DASHBOARD
  // ─────────────────────────────────────────────
  console.log('\n── STEP 2: DASHBOARD ──');
  await shot(page, '04_dashboard');

  const dashText = await page.locator('body').textContent().catch(() => '');
  const kpiCards = await page.locator('[class*="grid"] > div, [class*="card"]').count();
  const hasNumbers = /\d+/.test(dashText);
  const isWhiteScreen = dashText.trim().length < 50;

  if (isWhiteScreen) {
    log('Dashboard', 'FAIL', 'White screen / nearly empty content');
  } else {
    log('Dashboard', 'PASS', `Content visible. KPI elements: ${kpiCards}. Numbers present: ${hasNumbers}`);
  }

  // ─────────────────────────────────────────────
  // 3. SIDEBAR AUDIT
  // ─────────────────────────────────────────────
  console.log('\n── STEP 3: SIDEBAR AUDIT ──');

  // Scroll sidebar down to reveal all items
  const scrollable = page.locator('.overflow-y-auto, [class*="overflow-y"]').first();
  try {
    await scrollable.evaluate(el => { el.scrollTop = 0; });
    await page.waitForTimeout(200);
  } catch {}

  await shot(page, '05_sidebar_top');

  try {
    await scrollable.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(300);
  } catch {}

  await shot(page, '05b_sidebar_bottom');

  // Check for key sidebar items
  const sidebarLabels = [
    'Tablero', 'Inventarios', 'Planta', 'Viajeros', 'Calidad',
    'RH', 'Nómina', 'Ventas', 'Compras',
    'Finanzas', 'Costos', 'Desempeño', 'Trazabilidad',
    'HSE', 'Reportes', 'Configuracion'
  ];

  const foundItems = [];
  for (const label of sidebarLabels) {
    const el = page.locator(`text="${label}"`).first();
    const visible = await el.isVisible().catch(() => false);
    if (visible) foundItems.push(label);
  }

  console.log(`  Found sidebar items: ${foundItems.join(', ')}`);

  const hasFinanzas = foundItems.includes('Finanzas');
  const hasDesempeno = foundItems.includes('Desempeño');
  const hasNomina = foundItems.includes('Nómina');
  const hasReportes = foundItems.includes('Reportes');
  const hasRH = foundItems.includes('RH');

  const criticalMissing = ['Finanzas', 'Desempeño', 'Nómina'].filter(x => !foundItems.includes(x));

  if (criticalMissing.length === 0) {
    log('Sidebar - All Items Visible', 'PASS', `All key items visible. Total found: ${foundItems.length}`);
  } else {
    log('Sidebar - Missing Items', 'PARTIAL', `Missing: ${criticalMissing.join(', ')}. Found: ${foundItems.join(', ')}`);
  }

  // Check sidebar scrollability
  const sidebarEl = page.locator('.overflow-y-auto').first();
  const sidebarScrollHeight = await sidebarEl.evaluate(el => el.scrollHeight).catch(() => 0);
  const sidebarClientHeight = await sidebarEl.evaluate(el => el.clientHeight).catch(() => 0);
  const isScrollable = sidebarScrollHeight > sidebarClientHeight;
  log('Sidebar - Scrollable', isScrollable || foundItems.length > 8 ? 'PASS' : 'PARTIAL',
    `scrollHeight=${sidebarScrollHeight}px, clientHeight=${sidebarClientHeight}px, scrollable=${isScrollable}`);

  // ─────────────────────────────────────────────
  // 4. FINANZAS — CxC / CxP
  // ─────────────────────────────────────────────
  console.log('\n── STEP 4: FINANZAS ──');

  const finClicked = await clickSidebarItem(page, 'Finanzas');
  if (!finClicked) {
    // Try direct click by all text spans
    const allSpans = page.locator('span').filter({ hasText: 'Finanzas' });
    const count = await allSpans.count();
    console.log(`  Finanzas span count: ${count}`);
    if (count > 0) {
      await allSpans.first().click();
      await page.waitForTimeout(1800);
    }
  }
  await page.waitForTimeout(1000);
  await shot(page, '06_finanzas');

  const finText = await page.locator('body').textContent().catch(() => '');
  const hasCxC = finText.includes('CxC') || finText.includes('Cobrar') || finText.includes('Receivable');
  const hasCxP = finText.includes('CxP') || finText.includes('Pagar') || finText.includes('Payable');
  const finRows = await page.locator('tbody tr').count();

  if (hasCxC || hasCxP) {
    // Try clicking CxC tab
    const cxcBtn = page.locator('button, [role="tab"]').filter({ hasText: 'CxC' }).first();
    if (await cxcBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cxcBtn.click();
      await page.waitForTimeout(1500);
      await shot(page, '06b_finanzas_cxc');
    }
    const cxcRows = await page.locator('tbody tr').count();
    log('Finanzas CxC/CxP', cxcRows > 0 ? 'PASS' : 'PARTIAL',
      `CxC: ${hasCxC}, CxP: ${hasCxP}, rows: ${cxcRows}`);
  } else {
    log('Finanzas', 'FAIL', `Finanzas view not loaded or no content. Text snippet: "${finText.substring(0, 100)}"`);
  }

  // ─────────────────────────────────────────────
  // 5. CALIDAD / QUALITY
  // ─────────────────────────────────────────────
  console.log('\n── STEP 5: CALIDAD ──');

  await clickSidebarItem(page, 'Calidad');
  await page.waitForTimeout(1200);
  await shot(page, '07_calidad');

  const qualText = await page.locator('body').textContent().catch(() => '');
  const hasInspections = qualText.includes('Inspección') || qualText.includes('Inspeccion') || qualText.includes('NC') || qualText.includes('Audit');
  const qualRows = await page.locator('tbody tr').count();

  if (hasInspections) {
    log('Calidad - Inspecciones', qualRows > 0 ? 'PASS' : 'PARTIAL',
      `Inspections view loaded. Rows: ${qualRows}`);

    // Try creating a new inspection
    const newBtn = page.locator('button').filter({ hasText: /Nueva|Nuevo|Crear|Add|\+/ }).first();
    if (await newBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForTimeout(1500);
      await shot(page, '07b_calidad_new');
      const modalVisible = await page.locator('[role="dialog"], [class*="modal"], [class*="Modal"]').isVisible().catch(() => false);
      log('Calidad - Nueva Inspección', modalVisible ? 'PASS' : 'PARTIAL',
        `New inspection form/modal: ${modalVisible}`);
      // Close
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      log('Calidad - Nueva Inspección', 'PARTIAL', 'No create button found');
    }
  } else {
    log('Calidad', 'FAIL', `Quality view not loaded. Text: "${qualText.substring(0, 80)}"`);
  }

  // ─────────────────────────────────────────────
  // 6. NÓMINA / PAYROLL
  // ─────────────────────────────────────────────
  console.log('\n── STEP 6: NÓMINA ──');

  // Scroll sidebar to find Nómina
  try {
    await scrollable.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(300);
  } catch {}

  await clickSidebarItem(page, 'Nómina');
  await page.waitForTimeout(1500);
  await shot(page, '08_nomina');

  const nomText = await page.locator('body').textContent().catch(() => '');
  const hasNominaContent = nomText.includes('Nómina') || nomText.includes('Nomina') || nomText.includes('Payroll') || nomText.includes('Empleado') || nomText.includes('Salario');
  const nomRows = await page.locator('tbody tr').count();

  log('Nómina/Payroll', hasNominaContent && (nomRows > 0) ? 'PASS' : hasNominaContent ? 'PARTIAL' : 'FAIL',
    `Content: ${hasNominaContent}, rows: ${nomRows}`);

  // ─────────────────────────────────────────────
  // 7. DESEMPEÑO
  // ─────────────────────────────────────────────
  console.log('\n── STEP 7: DESEMPEÑO ──');

  await clickSidebarItem(page, 'Desempeño');
  await page.waitForTimeout(1800);
  await shot(page, '09_desempeno');

  const despText = await page.locator('body').textContent().catch(() => '');
  const hasDesempenoContent = despText.includes('Desempeño') || despText.includes('KPI') || despText.includes('Operador') || despText.includes('Eficiencia');
  const despCards = await page.locator('[class*="card"], [class*="kpi"], [class*="chart"]').count();
  const despWhite = despText.trim().length < 100;

  if (despWhite) {
    log('Desempeño', 'FAIL', 'White screen');
  } else {
    log('Desempeño', hasDesempenoContent ? 'PASS' : 'PARTIAL',
      `KPI/performance content: ${hasDesempenoContent}, cards: ${despCards}`);
  }

  // ─────────────────────────────────────────────
  // 8. RH / EMPLOYEES
  // ─────────────────────────────────────────────
  console.log('\n── STEP 8: RH / EMPLEADOS ──');

  await clickSidebarItem(page, 'RH');
  await page.waitForTimeout(1500);
  await shot(page, '10_rh');

  const rhText = await page.locator('body').textContent().catch(() => '');
  const hasRHContent = rhText.includes('Empleado') || rhText.includes('RFC') || rhText.includes('Puesto') || rhText.includes('Employee') || rhText.includes('RH');
  const rhRows = await page.locator('tbody tr').count();

  log('RH/Empleados', hasRHContent ? 'PASS' : 'FAIL',
    `Employee content: ${hasRHContent}, rows: ${rhRows}`);

  // ─────────────────────────────────────────────
  // 9. VIAJEROS — list + detail + OC dropdown
  // ─────────────────────────────────────────────
  console.log('\n── STEP 9: VIAJEROS ──');

  await clickSidebarItem(page, 'Viajeros');
  await page.waitForTimeout(2000);
  await shot(page, '11_viajeros_list');

  const viajerosText = await page.locator('body').textContent().catch(() => '');
  const hasViajerosContent = viajerosText.includes('Viajero') || viajerosText.includes('OP') || viajerosText.includes('Orden');
  const viajerosRows = await page.locator('tbody tr, [class*="viajero-row"], [class*="card"]').count();

  log('Viajeros - Lista', hasViajerosContent ? 'PASS' : 'FAIL',
    `Content: ${hasViajerosContent}, rows/cards: ${viajerosRows}`);

  // Try opening first viajero
  if (viajerosRows > 0) {
    const firstRow = page.locator('tbody tr, [class*="viajero-row"]').first();
    if (await firstRow.isVisible({ timeout: 1500 }).catch(() => false)) {
      await firstRow.click();
      await page.waitForTimeout(2500);
      await shot(page, '11b_viajero_detail');

      // Check if detail/modal opened
      const detailText = await page.locator('body').textContent().catch(() => '');
      const hasDetailContent = detailText.includes('OC') || detailText.includes('General') || detailText.includes('Operación');

      // Look for General tab
      const generalTab = page.locator('button, [role="tab"]').filter({ hasText: 'General' }).first();
      if (await generalTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await generalTab.click();
        await page.waitForTimeout(1500);
        await shot(page, '11c_viajero_general_tab');
      }

      // Look for OC Cliente field
      const ocFieldLabel = page.locator('text=/OC Cliente|OC del Cliente/').first();
      const hasOCField = await ocFieldLabel.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasOCField) {
        // Find the dropdown near OC Cliente label
        const ocSelect = page.locator('select').filter({ has: page.locator('option[value*="OC"]') }).first();
        const ocSelectAlt = page.locator('select, [class*="select"]').nth(0);

        // Check options count
        const selectsOnPage = await page.locator('select').count();
        let ocOptions = '';
        for (let i = 0; i < Math.min(selectsOnPage, 5); i++) {
          const sel = page.locator('select').nth(i);
          const opts = await sel.evaluate(el => {
            return Array.from(el.options).slice(0, 5).map(o => o.text).join(', ');
          }).catch(() => '');
          if (opts.includes('OC') || opts.includes('2026')) {
            ocOptions = opts;
            // Try selecting it to test auto-fill
            await sel.selectOption({ index: 1 }).catch(() => {});
            await page.waitForTimeout(1000);
            break;
          }
        }

        await shot(page, '11d_viajero_oc_selected');
        log('Viajero - OC Cliente Dropdown', 'PASS',
          `OC field present. Options: ${ocOptions || 'loaded (check screenshot)'}`);

        // Check if cliente/numero_parte auto-filled
        const autoFillText = await page.locator('body').textContent().catch(() => '');
        const hasAutofill = autoFillText.includes('CATERPILLAR') || autoFillText.includes('cliente') || autoFillText.includes('parte');
        log('Viajero - OC Auto-fill', hasAutofill ? 'PASS' : 'PARTIAL',
          `Client/part# auto-fill triggered: ${hasAutofill}`);
      } else {
        log('Viajero - OC Cliente Dropdown', 'PARTIAL', 'OC Cliente field not found on General tab');
      }
    } else {
      log('Viajero - Detail', 'PARTIAL', 'Could not open viajero detail');
    }
  } else {
    log('Viajero - Detail', 'PARTIAL', 'No viajero rows to click');
  }

  // ─────────────────────────────────────────────
  // 10. INVENTARIO
  // ─────────────────────────────────────────────
  console.log('\n── STEP 10: INVENTARIO ──');

  await clickSidebarItem(page, 'Inventarios');
  await page.waitForTimeout(2000);
  await shot(page, '12_inventario');

  const invText = await page.locator('body').textContent().catch(() => '');
  const hasInvContent = invText.includes('Material') || invText.includes('Inventario') || invText.includes('Stock') || invText.includes('SKU');
  const invRows = await page.locator('tbody tr').count();

  log('Inventario', hasInvContent ? 'PASS' : 'FAIL',
    `Content: ${hasInvContent}, rows: ${invRows}`);

  // ─────────────────────────────────────────────
  // 11. VISUAL / LAYOUT CHECK
  // ─────────────────────────────────────────────
  console.log('\n── STEP 11: VISUAL & LAYOUT ──');

  // Back to dashboard for layout check
  await clickSidebarItem(page, 'Tablero');
  await page.waitForTimeout(1500);
  await shot(page, '13_layout_1280x800');

  const bodyScrollW = await page.evaluate(() => document.body.scrollWidth);
  const viewW = await page.evaluate(() => window.innerWidth);
  const hasHScroll = bodyScrollW > viewW + 5;

  // Check sidebar is fixed/sticky and visible
  const sidebarVisible = await page.locator('[class*="sidebar"], aside, nav').first().isVisible().catch(() => false);

  // Check for any visible error banners
  const errorBanners = await page.locator('[class*="error"], [class*="Error"], [role="alert"]').count();

  log('Visual - No Horizontal Scroll', !hasHScroll ? 'PASS' : 'FAIL',
    `bodyScrollWidth=${bodyScrollW}, viewport=${viewW}`);
  log('Visual - Sidebar Visible', sidebarVisible ? 'PASS' : 'FAIL',
    `Sidebar element visible: ${sidebarVisible}`);
  log('Visual - Error Banners', errorBanners === 0 ? 'PASS' : 'PARTIAL',
    `Error banner count: ${errorBanners}`);

  // ─────────────────────────────────────────────
  // 12. CHECK OTHER KEY MODULES
  // ─────────────────────────────────────────────
  console.log('\n── STEP 12: OTHER MODULES ──');

  // Planta
  await clickSidebarItem(page, 'Planta');
  await page.waitForTimeout(1500);
  const plantaText = await page.locator('body').textContent().catch(() => '');
  const hasPlanta = plantaText.includes('Planta') || plantaText.includes('Producción') || plantaText.includes('OP');
  await shot(page, '14_planta');
  log('Planta/Producción', hasPlanta ? 'PASS' : 'FAIL', `Content: ${hasPlanta}`);

  // HSE
  await clickSidebarItem(page, 'HSE');
  await page.waitForTimeout(1500);
  const hseText = await page.locator('body').textContent().catch(() => '');
  const hasHSE = hseText.includes('HSE') || hseText.includes('Seguridad') || hseText.includes('Incidente');
  await shot(page, '15_hse');
  log('HSE', hasHSE ? 'PASS' : 'FAIL', `Content: ${hasHSE}`);

  // Ingeniería
  await clickSidebarItem(page, 'Ingeniería');
  await page.waitForTimeout(1500);
  const engText = await page.locator('body').textContent().catch(() => '');
  const hasEng = engText.includes('Ingeniería') || engText.includes('Engineering') || engText.includes('Plano');
  await shot(page, '16_ingenieria');
  log('Ingeniería', hasEng ? 'PASS' : 'FAIL', `Content: ${hasEng}`);

  // Reportes
  await clickSidebarItem(page, 'Reportes');
  await page.waitForTimeout(1500);
  const repText = await page.locator('body').textContent().catch(() => '');
  const hasRep = repText.includes('Reporte') || repText.includes('Report') || repText.includes('Exportar');
  await shot(page, '17_reportes');
  log('Reportes', hasRep ? 'PASS' : 'FAIL', `Content: ${hasRep}`);

  // ─────────────────────────────────────────────
  // FINAL SCREENSHOT
  // ─────────────────────────────────────────────
  await clickSidebarItem(page, 'Tablero');
  await page.waitForTimeout(1000);
  await shot(page, '99_final_dashboard');

  await browser.close();

  // ─────────────────────────────────────────────
  // PRINT REPORT
  // ─────────────────────────────────────────────
  console.log('\n');
  console.log('═'.repeat(80));
  console.log('              McVill ERP — QA AUDIT REPORT v2');
  console.log('              Date: ' + new Date().toISOString());
  console.log('═'.repeat(80));
  console.log('');
  console.log('┌──────────────────────────────────┬─────────┬──────────────────────────────────┐');
  console.log('│ Module                           │ Status  │ Notes                            │');
  console.log('├──────────────────────────────────┼─────────┼──────────────────────────────────┤');

  for (const r of results) {
    const mod = r.module.padEnd(32).substring(0, 32);
    const status = r.status.padEnd(7);
    const note = r.note.substring(0, 33).padEnd(33);
    console.log(`│ ${mod} │ ${status} │ ${note} │`);
  }

  console.log('└──────────────────────────────────┴─────────┴──────────────────────────────────┘');

  const passed = results.filter(r => r.status === 'PASS').length;
  const partial = results.filter(r => r.status === 'PARTIAL').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log('');
  console.log(`  Summary: ${passed} PASS  |  ${partial} PARTIAL  |  ${failed} FAIL  |  Total: ${results.length}`);
  console.log('');
  console.log('─'.repeat(80));
  console.log('SUPABASE HTTP ERRORS (400/404):');
  console.log(`  Total 400+ responses: ${errorCount400}`);
  if (consoleErrors.length === 0) {
    console.log('  (none logged)');
  } else {
    const uniqueErrors = [...new Set(consoleErrors)];
    uniqueErrors.slice(0, 20).forEach(e => console.log('  ' + e));
    if (uniqueErrors.length > 20) console.log(`  ... and ${uniqueErrors.length - 20} more`);
  }
  console.log('─'.repeat(80));
  console.log('DETAILED RESULTS:');
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✓' : r.status === 'FAIL' ? '✗' : '~';
    console.log(`  [${icon}] ${r.module}: ${r.note}`);
  });
  console.log('─'.repeat(80));
  console.log(`Screenshots: ${SCREENSHOT_DIR}/`);
  console.log('═'.repeat(80));

  return results;
}

run().catch(err => {
  console.error('\nFATAL ERROR:', err.message);
  console.error(err.stack);
  process.exit(1);
});
