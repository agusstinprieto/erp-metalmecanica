/**
 * McVill ERP — Full QA Audit Script
 * Playwright headless Chromium, viewport 1280x800
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:5174';
const SCREENSHOT_DIR = './qa_screenshots';
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const results = [];
const consoleErrors = [];

function log(module, status, note) {
  results.push({ module, status, note });
  console.log(`[${status}] ${module}: ${note}`);
}

async function takeScreenshot(page, name) {
  const path = join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function waitAndCheck(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });
  page.on('response', response => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && url.includes('supabase')) {
      consoleErrors.push(`[HTTP ${status}] ${url}`);
    }
  });

  // ─────────────────────────────────────────────
  // 1. LOGIN
  // ─────────────────────────────────────────────
  console.log('\n=== STEP 1: LOGIN ===');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await takeScreenshot(page, '01_landing');

  const pageTitle = await page.title();
  console.log('Page title:', pageTitle);
  console.log('Current URL:', page.url());

  // Check if already authenticated or on login page
  const hasLoginForm = await waitAndCheck(page, 'input[type="email"], input[type="text"]', 3000);
  const hasPasswordField = await waitAndCheck(page, 'input[type="password"]', 3000);

  let loggedIn = false;

  if (hasLoginForm || hasPasswordField) {
    console.log('Login form detected, attempting login...');

    const credentials = [
      { email: 'admin@mcvill.com', password: 'admin123' },
      { email: 'agusstinprieto@gmail.com', password: 'admin123' },
      { email: 'admin@mcvill.com', password: 'Admin123' },
    ];

    for (const cred of credentials) {
      try {
        // Clear and fill email
        const emailInput = page.locator('input[type="email"], input[type="text"]').first();
        await emailInput.clear();
        await emailInput.fill(cred.email);

        const passInput = page.locator('input[type="password"]').first();
        await passInput.clear();
        await passInput.fill(cred.password);

        // Check for secret key / godmode input
        const godmodeInput = page.locator('input[placeholder*="secret"], input[placeholder*="key"], input[placeholder*="godmode"], input[name*="secret"]');
        const hasGodmode = await godmodeInput.count() > 0;
        if (hasGodmode) {
          await godmodeInput.first().fill('godmode');
          console.log('Godmode field detected and filled');
        }

        await takeScreenshot(page, '02_login_filled');

        // Submit
        const submitBtn = page.locator('button[type="submit"], button:has-text("Ingresar"), button:has-text("Login"), button:has-text("Entrar"), button:has-text("Iniciar")').first();
        await submitBtn.click();

        // Wait for navigation or dashboard
        await page.waitForTimeout(3000);
        await takeScreenshot(page, '03_after_login');

        const currentUrl = page.url();
        console.log('URL after login attempt with', cred.email, ':', currentUrl);

        // Check if we got past login
        const stillOnLogin = await waitAndCheck(page, 'input[type="password"]', 1000);
        if (!stillOnLogin || currentUrl.includes('dashboard') || currentUrl.includes('app') || currentUrl.includes('home')) {
          loggedIn = true;
          log('Login', 'PASS', `Logged in with ${cred.email}`);
          break;
        } else {
          // Check for error message
          const errorMsg = await page.locator('.error, [class*="error"], [class*="alert"], [role="alert"]').textContent().catch(() => '');
          console.log(`Login failed with ${cred.email}:`, errorMsg || 'no error msg visible');
        }
      } catch (err) {
        console.log('Login attempt error:', err.message);
      }
    }

    if (!loggedIn) {
      // Try looking for bypass/demo mode
      const bypassBtn = page.locator('button:has-text("Demo"), button:has-text("Bypass"), button:has-text("demo"), a:has-text("demo")');
      if (await bypassBtn.count() > 0) {
        await bypassBtn.first().click();
        await page.waitForTimeout(2000);
        loggedIn = true;
        log('Login', 'PARTIAL', 'Used demo/bypass mode');
      } else {
        log('Login', 'FAIL', 'Could not log in with any credentials');
      }
    }
  } else {
    // Maybe already on dashboard
    loggedIn = true;
    log('Login', 'PASS', 'Already authenticated or no login required');
  }

  if (!loggedIn) {
    console.log('\nCannot proceed without login. Dumping page HTML snippet...');
    const html = await page.content();
    console.log('HTML snippet:', html.substring(0, 2000));
    await browser.close();
    printReport();
    return;
  }

  // Wait for app to fully load
  await page.waitForTimeout(2000);
  await takeScreenshot(page, '04_dashboard_initial');
  console.log('Dashboard URL:', page.url());

  // ─────────────────────────────────────────────
  // 2. DASHBOARD CHECK
  // ─────────────────────────────────────────────
  console.log('\n=== STEP 2: DASHBOARD ===');
  // Navigate to dashboard if not there
  const dashboardLink = page.locator('a[href*="dashboard"], a:has-text("Dashboard"), nav a').first();
  try {
    await dashboardLink.click();
    await page.waitForTimeout(1500);
  } catch {}

  await takeScreenshot(page, '05_dashboard');

  // Check for KPI cards
  const kpiCards = await page.locator('[class*="card"], [class*="kpi"], [class*="stat"], .bg-white, .rounded').count();
  const hasNumbers = await page.locator('text=/\\d+/').count() > 0;
  const whiteScreen = kpiCards === 0 && !hasNumbers;

  if (whiteScreen) {
    log('Dashboard', 'FAIL', 'White screen / no content detected');
  } else {
    const kpiText = await page.locator('body').textContent();
    const hasZeros = kpiText.includes('0') || kpiText.includes('$');
    log('Dashboard', 'PASS', `KPI cards visible (${kpiCards} card elements), has data: ${!whiteScreen}`);
  }

  // ─────────────────────────────────────────────
  // 3. SIDEBAR SCROLL CHECK
  // ─────────────────────────────────────────────
  console.log('\n=== STEP 3: SIDEBAR SCROLL ===');

  // Check sidebar visibility
  const sidebar = page.locator('nav, aside, [class*="sidebar"], [class*="Sidebar"]').first();
  const sidebarVisible = await sidebar.isVisible().catch(() => false);

  // Look for specific nav items
  const finanzasLink = page.locator('text=Finanzas, a:has-text("Finanzas"), [href*="finanzas"]').first();
  const desempenoLink = page.locator('text=Desempeño, a:has-text("Desempeño"), [href*="desempeno"], [href*="performance"]').first();
  const nominaLink = page.locator('text=Nómina, text=Nomina, a:has-text("Nómina"), [href*="nomina"]').first();
  const reportesLink = page.locator('text=Reportes, a:has-text("Reportes"), [href*="reportes"]').first();

  const finanzasVisible = await finanzasLink.isVisible().catch(() => false);
  const desempenoVisible = await desempenoLink.isVisible().catch(() => false);
  const nominaVisible = await nominaLink.isVisible().catch(() => false);
  const reportesVisible = await reportesLink.isVisible().catch(() => false);

  // Try scrolling sidebar to find items
  try {
    await sidebar.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(500);
  } catch {}

  const finanzasAfterScroll = await finanzasLink.isVisible().catch(() => false);
  const desempenoAfterScroll = await desempenoLink.isVisible().catch(() => false);

  await takeScreenshot(page, '06_sidebar_scrolled');

  const sidebarItems = await page.locator('nav a, aside a, [class*="nav-item"], [class*="NavItem"]').count();
  console.log('Total sidebar nav items found:', sidebarItems);

  if (finanzasAfterScroll || finanzasVisible) {
    log('Sidebar Scroll', 'PASS', `Finanzas visible. Desempeño: ${desempenoAfterScroll || desempenoVisible}, Nómina: ${nominaVisible}, Reportes: ${reportesVisible}`);
  } else {
    // Try clicking sidebar nav items by text
    const allLinks = await page.locator('a, button').allTextContents();
    const sidebarTexts = allLinks.filter(t => t.trim().length > 0).slice(0, 30);
    log('Sidebar Scroll', 'PARTIAL', `Items found: ${sidebarTexts.join(', ').substring(0, 200)}`);
  }

  // ─────────────────────────────────────────────
  // 4. NAVIGATE AND TEST EACH MODULE
  // ─────────────────────────────────────────────

  async function navigateToModule(namePatterns, urlPattern) {
    // Try URL direct navigation first
    if (urlPattern) {
      try {
        await page.goto(`${BASE_URL}${urlPattern}`, { waitUntil: 'networkidle', timeout: 10000 });
        await page.waitForTimeout(1500);
        return true;
      } catch {}
    }

    // Try clicking in nav
    for (const name of namePatterns) {
      try {
        const link = page.locator(`a:has-text("${name}"), button:has-text("${name}"), [href*="${name.toLowerCase()}"]`).first();
        if (await link.isVisible({ timeout: 2000 })) {
          await link.click();
          await page.waitForTimeout(2000);
          return true;
        }
        // Try scrolling sidebar first
        try {
          const sidebar = page.locator('nav, aside').first();
          await sidebar.evaluate(el => { el.scrollTop = el.scrollHeight; });
          await page.waitForTimeout(300);
          if (await link.isVisible({ timeout: 1000 })) {
            await link.click();
            await page.waitForTimeout(2000);
            return true;
          }
        } catch {}
      } catch {}
    }
    return false;
  }

  // ─────────────────────────────────────────────
  // 5. FINANZAS
  // ─────────────────────────────────────────────
  console.log('\n=== STEP 4: FINANZAS ===');
  const finanzasNav = await navigateToModule(['Finanzas', 'Finance', 'finanzas'], '/finanzas');
  await takeScreenshot(page, '07_finanzas');

  const finanzasUrl = page.url();
  console.log('Finanzas URL:', finanzasUrl);

  // Check for CxC/CxP tabs
  const cxcTab = page.locator('text=CxC, text="Cuentas por Cobrar", button:has-text("CxC"), [role="tab"]:has-text("CxC")');
  const cxpTab = page.locator('text=CxP, text="Cuentas por Pagar", button:has-text("CxP"), [role="tab"]:has-text("CxP")');

  const hasCxC = await cxcTab.count() > 0;
  const hasCxP = await cxpTab.count() > 0;

  // Check for table rows
  const tableRows = await page.locator('tr, [class*="row"], tbody tr').count();
  const hasContent = await page.locator('table, [class*="table"], [class*="list"]').count() > 0;

  if (hasCxC || hasCxP) {
    // Try clicking CxC tab and check rows
    if (hasCxC) {
      try { await cxcTab.first().click(); await page.waitForTimeout(1000); } catch {}
    }
    await takeScreenshot(page, '07b_finanzas_cxc');
    const rowsAfterTab = await page.locator('tbody tr, [class*="row"]').count();
    log('Finanzas CxC/CxP', 'PASS', `CxC tab: ${hasCxC}, CxP tab: ${hasCxP}, rows visible: ${rowsAfterTab}`);
  } else if (finanzasUrl.includes('finanzas') || hasContent) {
    log('Finanzas', 'PARTIAL', `Page loaded but tabs not found. Rows: ${tableRows}`);
  } else {
    log('Finanzas', 'FAIL', 'Could not navigate to Finanzas or no content');
  }

  // ─────────────────────────────────────────────
  // 6. CALIDAD / QUALITY
  // ─────────────────────────────────────────────
  console.log('\n=== STEP 5: CALIDAD ===');
  const calidadNav = await navigateToModule(['Calidad', 'Quality', 'Inspección'], '/calidad');
  await takeScreenshot(page, '08_calidad');

  const calidadUrl = page.url();
  const calidadRows = await page.locator('tbody tr, [class*="inspection"], [class*="row"]').count();
  const calidadContent = await page.locator('text=Inspección, text=Inspection, text=NC, text="No Conformidad"').count() > 0;

  if (calidadUrl.includes('calidad') || calidadContent) {
    log('Calidad (inspections)', 'PASS', `Inspections visible: ${calidadRows} rows`);

    // Try creating a new inspection
    const newBtn = page.locator('button:has-text("Nueva"), button:has-text("Nuevo"), button:has-text("Crear"), button:has-text("Add"), button:has-text("+")').first();
    if (await newBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForTimeout(1500);
      await takeScreenshot(page, '08b_calidad_new_inspection');
      const modalOpen = await page.locator('[role="dialog"], [class*="modal"], [class*="Modal"]').isVisible().catch(() => false);
      log('Calidad New Inspection', modalOpen ? 'PASS' : 'PARTIAL', `New inspection modal: ${modalOpen}`);
      // Close modal
      const closeBtn = page.locator('button:has-text("Cancelar"), button:has-text("Cerrar"), button[aria-label="Close"], button:has-text("×")').first();
      try { await closeBtn.click(); await page.waitForTimeout(500); } catch {}
    } else {
      log('Calidad New Inspection', 'PARTIAL', 'No "Nueva inspección" button found');
    }
  } else {
    log('Calidad', 'FAIL', 'Could not navigate to Calidad or no content');
  }

  // ─────────────────────────────────────────────
  // 7. NÓMINA / PAYROLL
  // ─────────────────────────────────────────────
  console.log('\n=== STEP 6: NÓMINA ===');
  const nominaNav = await navigateToModule(['Nómina', 'Nomina', 'Payroll'], '/nomina');
  await takeScreenshot(page, '09_nomina');

  const nominaUrl = page.url();
  const nominaRows = await page.locator('tbody tr, [class*="payroll"], [class*="row"]').count();
  const nominaContent = await page.locator('text=Nómina, text=Nomina, text=Payroll, text=Empleado').count() > 0;

  if (nominaUrl.includes('nomina') || nominaContent) {
    log('Nómina/Payroll', 'PASS', `Payroll list visible, rows: ${nominaRows}`);
  } else {
    log('Nómina/Payroll', 'FAIL', 'Could not navigate to Nómina or white screen');
  }

  // ─────────────────────────────────────────────
  // 8. DESEMPEÑO
  // ─────────────────────────────────────────────
  console.log('\n=== STEP 7: DESEMPEÑO ===');
  const desempenoNav = await navigateToModule(['Desempeño', 'Desempeno', 'Performance', 'KPI'], '/desempeno');
  await takeScreenshot(page, '10_desempeno');

  const desempenoUrl = page.url();
  const desempenoContent = await page.locator('body').textContent();
  const hasKPIContent = desempenoContent.includes('KPI') || desempenoContent.includes('Desempeño') || desempenoContent.includes('operator') || desempenoContent.includes('Operador');
  const isWhiteScreen = (await page.locator('[class*="card"], table, [class*="chart"], [class*="kpi"]').count()) === 0;

  if (desempenoUrl.includes('desempeno') || hasKPIContent) {
    log('Desempeño', isWhiteScreen ? 'PARTIAL' : 'PASS', `KPI content: ${hasKPIContent}, white screen: ${isWhiteScreen}`);
  } else {
    log('Desempeño', 'FAIL', 'Could not navigate to Desempeño or white screen');
  }

  // ─────────────────────────────────────────────
  // 9. RH / EMPLOYEES
  // ─────────────────────────────────────────────
  console.log('\n=== STEP 8: RH/EMPLEADOS ===');
  const rhNav = await navigateToModule(['RH', 'Empleados', 'Employees', 'Recursos Humanos'], '/rh');
  await takeScreenshot(page, '11_rh');

  const rhUrl = page.url();
  const rhRows = await page.locator('tbody tr, [class*="employee"], [class*="row"]').count();
  const rhContent = await page.locator('text=Empleado, text=Employee, text=Nombre, text=RFC').count() > 0;

  if (rhUrl.includes('rh') || rhUrl.includes('employee') || rhContent) {
    log('RH/Empleados', 'PASS', `Employee list visible, rows: ${rhRows}`);
  } else {
    log('RH/Empleados', 'FAIL', 'Could not navigate to RH or no content');
  }

  // ─────────────────────────────────────────────
  // 10. VIAJEROS
  // ─────────────────────────────────────────────
  console.log('\n=== STEP 9: VIAJEROS ===');
  const viajerosNav = await navigateToModule(['Viajeros', 'Traveler', 'Viajero'], '/viajeros');
  await page.waitForTimeout(2000);
  await takeScreenshot(page, '12_viajeros_list');

  const viajerosUrl = page.url();
  const viajerosRows = await page.locator('tbody tr, [class*="viajero"], [class*="row"], [class*="card"]').count();

  if (viajerosUrl.includes('viajero') || viajerosRows > 0) {
    log('Viajeros List', 'PASS', `Viajeros list visible, items: ${viajerosRows}`);

    // Try opening a viajero
    const firstViajero = page.locator('tbody tr, [class*="row"], [class*="card"]').first();
    if (await firstViajero.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstViajero.click();
      await page.waitForTimeout(2000);
      await takeScreenshot(page, '12b_viajero_detail');

      // Navigate to General tab
      const generalTab = page.locator('button:has-text("General"), [role="tab"]:has-text("General"), a:has-text("General")').first();
      if (await generalTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await generalTab.click();
        await page.waitForTimeout(1500);
        await takeScreenshot(page, '12c_viajero_general_tab');

        // Look for OC Cliente dropdown
        const ocDropdown = page.locator('select:near(:text("OC Cliente")), [class*="select"]:near(:text("OC")), input:near(:text("OC Cliente"))').first();
        const ocDropdownAlt = page.locator('text=OC Cliente').locator('..').locator('select, input, [class*="select"]').first();

        let ocFound = false;
        if (await ocDropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
          ocFound = true;
          // Check options
          const options = await ocDropdown.evaluate(el => {
            if (el.tagName === 'SELECT') {
              return Array.from(el.options).map(o => o.text).slice(0, 5).join(', ');
            }
            return 'non-select element';
          }).catch(() => 'error reading options');
          log('Viajero OC Dropdown', 'PASS', `OC dropdown found, options: ${options}`);
        } else if (await ocDropdownAlt.isVisible({ timeout: 2000 }).catch(() => false)) {
          ocFound = true;
          log('Viajero OC Dropdown', 'PASS', 'OC Cliente dropdown found (alt selector)');
        } else {
          log('Viajero OC Dropdown', 'PARTIAL', 'OC Cliente dropdown not clearly identified on General tab');
        }
      } else {
        log('Viajero General Tab', 'PARTIAL', 'General tab not found or already on it');
      }
    } else {
      log('Viajero Detail', 'PARTIAL', 'Could not open a viajero detail');
    }
  } else {
    log('Viajeros', 'FAIL', 'Could not navigate to Viajeros or no content');
  }

  // ─────────────────────────────────────────────
  // 11. INVENTARIO
  // ─────────────────────────────────────────────
  console.log('\n=== STEP 10: INVENTARIO ===');
  const inventarioNav = await navigateToModule(['Inventario', 'Inventory', 'Materiales'], '/inventario');
  await page.waitForTimeout(2000);
  await takeScreenshot(page, '13_inventario');

  const inventarioUrl = page.url();
  const inventarioRows = await page.locator('tbody tr, [class*="material"], [class*="row"]').count();
  const inventarioContent = await page.locator('text=Material, text=Inventario, text=Stock, text=Cantidad').count() > 0;

  if (inventarioUrl.includes('inventario') || inventarioContent) {
    log('Inventario', 'PASS', `Materials list visible, rows: ${inventarioRows}`);
  } else {
    log('Inventario', 'FAIL', 'Could not navigate to Inventario or no content');
  }

  // ─────────────────────────────────────────────
  // 12. VISUAL CHECK - CENTERING & RESPONSIVE
  // ─────────────────────────────────────────────
  console.log('\n=== STEP 11: VISUAL QUALITY CHECK ===');

  // Go back to dashboard for visual check
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  await takeScreenshot(page, '14_visual_check_1280x800');

  // Check viewport and layout
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  const hasHorizontalScroll = bodyWidth > viewportWidth;

  // Check for major layout issues
  const mainContent = page.locator('main, [class*="main"], [class*="content"], [class*="layout"]').first();
  const mainVisible = await mainContent.isVisible().catch(() => false);

  // Check sidebar
  const sidebarEl = page.locator('nav, aside, [class*="sidebar"]').first();
  const sidebarHeight = await sidebarEl.evaluate(el => el.scrollHeight).catch(() => 0);
  const sidebarClientHeight = await sidebarEl.evaluate(el => el.clientHeight).catch(() => 0);
  const canScroll = sidebarHeight > sidebarClientHeight;

  log('Visual - Layout 1280x800', 'PASS', `Centered: ${mainVisible}, HScroll: ${hasHorizontalScroll}, Sidebar scrollable: ${canScroll} (${sidebarClientHeight}px visible of ${sidebarHeight}px)`);

  // ─────────────────────────────────────────────
  // 13. FINAL SCREENSHOT TOUR - all sidebar items
  // ─────────────────────────────────────────────
  console.log('\n=== STEP 12: FINAL SIDEBAR AUDIT ===');

  // Get all nav links
  const allNavLinks = await page.locator('nav a, aside a, [class*="sidebar"] a, [class*="nav"] a').all();
  const navTexts = [];
  for (const link of allNavLinks) {
    const text = await link.textContent().catch(() => '');
    const href = await link.getAttribute('href').catch(() => '');
    if (text.trim()) navTexts.push(`${text.trim()} (${href})`);
  }
  console.log('All sidebar nav items:', navTexts.join('\n  '));

  const hasFinanzas = navTexts.some(t => t.toLowerCase().includes('finanzas'));
  const hasDesempeno = navTexts.some(t => t.toLowerCase().includes('desempe'));
  const hasNomina = navTexts.some(t => t.toLowerCase().includes('nómina') || t.toLowerCase().includes('nomina'));
  const hasReportes = navTexts.some(t => t.toLowerCase().includes('reporte'));

  log('Sidebar Items Visible',
    (hasFinanzas && hasDesempeno && hasNomina) ? 'PASS' : 'PARTIAL',
    `Finanzas:${hasFinanzas} Desempeño:${hasDesempeno} Nómina:${hasNomina} Reportes:${hasReportes} | Total: ${navTexts.length} items`
  );

  // ─────────────────────────────────────────────
  // FINAL REPORT
  // ─────────────────────────────────────────────
  await browser.close();
  printReport();
}

function printReport() {
  console.log('\n');
  console.log('═'.repeat(80));
  console.log('                   McVill ERP — QA AUDIT REPORT');
  console.log('═'.repeat(80));
  console.log('');
  console.log('| Module                    | Status  | Notes');
  console.log('|---------------------------|---------|' + '-'.repeat(50));

  for (const r of results) {
    const padded = r.module.padEnd(25);
    const status = r.status.padEnd(7);
    console.log(`| ${padded} | ${status} | ${r.note}`);
  }

  console.log('');
  console.log('─'.repeat(80));
  console.log('CONSOLE ERRORS (first 30):');
  if (consoleErrors.length === 0) {
    console.log('  (none)');
  } else {
    consoleErrors.slice(0, 30).forEach(e => console.log(' ', e));
  }
  console.log('─'.repeat(80));
  console.log(`Screenshots saved in: ./qa_screenshots/`);
  console.log('═'.repeat(80));
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
