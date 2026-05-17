# 📊 CODE AUDIT REPORT — ERP-METALMECANICA (Agus Pro Full Audit)
**Fecha:** 2026-05-17 | **Auditor:** Antigravity (Agus Pro v2) | **Proyecto:** `ERP-METALMECANICA`  
**Repositorio:** `https://github.com/agusstinprieto-eng/erp-metalmecanica` | **Build:** ✅ Exit 0 — 25.94s

---

## 🚦 Resumen Ejecutivo — Semáforo General

| # | Eje de Auditoría | Puntuación | Semáforo |
|---|-----------------|:-----------:|----------|
| 1 | 🔍 Inventario & Stack | **10/10** | 🟢 |
| 2 | 🔐 Seguridad & Integridad | **8/10** | 🟢 |
| 3 | 🎨 Estética & UX (WOW Factor) | **9/10** | 🟢 |
| 4 | 🧱 Arquitectura & Zero Hardcoding | **6/10** | 🟡 |
| 5 | ⚡ Performance & Build | **7/10** | 🟡 |
| 6 | 🧹 Calidad de Código TypeScript | **6/10** | 🟡 |
| 7 | 🤖 Modelos de IA | **9/10** | 🟢 |
| 8 | 💼 ROI & Visión de Negocio | **8/10** | 🟢 |
| **TOTAL** | **Promedio Global** | **7.9/10** | **🟢 APROBADO** |

---

## 1. 🔍 Inventario del Proyecto — 10/10 🟢

**Stack confirmado:**
- **Frontend:** React 19 + Vite 5.4 + TypeScript 6.0 + TailwindCSS 4.2
- **Backend:** Supabase JS 2.104 (PostgreSQL + Auth + Storage)
- **IA:** @google/genai 1.50.1 + @google/generative-ai 0.21.0
- **Observabilidad:** @sentry/react 10.53 ✅
- **PDF/Export:** jspdf 4.2.1 + jspdf-autotable 5.0.7
- **Animaciones:** framer-motion 12.38 ✅

**Estructura `src/`:** 9 carpetas bien organizadas (`components`, `services`, `contexts`, `hooks`, `lib`, `utils`, `types`, `data`, `assets`) — arquitectura limpia y escalable.

---

## 2. 🔐 Seguridad & Integridad de Datos — 8/10 🟢

### ✅ Bien hecho
- `.env`, `.env.local`, `.env.*.local` excluidos correctamente en `.gitignore` ✅
- `node_modules`, `dist`, `scratch/` ignorados ✅
- **Cero API keys con valores reales** hardcodeados en el código fuente ✅
- Claves de IA (Gemini, DeepSeek, Together, OpenAI) fluyen exclusivamente por Supabase `tenants.config` ✅
- Sentry filtra el header `apikey` antes de enviar eventos ✅
- `ErrorBoundary` activo en `App.tsx` — sin pantallas blancas fatales ✅
- Auth con `supabase.auth.signInWithPassword()` y fallback correcto a `user_metadata.role` ✅

### ⚠️ Observaciones

| Sev | Archivo | Línea | Descripción | Acción |
|-----|---------|-------|-------------|--------|
| 🟡 P2 | `Dashboard.tsx` | 296 | Placeholder `"eyJhbGciOiJIUzI1NiIs..."` visible en input — parece JWT real | Cambiar a `"Tu token Plaid aquí..."` |
| 🟡 P2 | `agentService.ts` | 812 | API key de Gemini pasada inline en URL fetch del cliente para RAG | Mover a `supabase/functions/rag-search` Edge Function |
| 🟢 P3 | `Archivos SQL/` | — | Excluido de git ✅ pero sin README de referencia | Agregar `README_SQL.md` con instrucciones de ejecución |

**Notas RLS:** No se encontraron políticas en el código frontend — la seguridad RLS depende 100% de la configuración en el dashboard de Supabase (recomendado revisar manualmente).

---

## 3. 🎨 Estética & UX (The "WOW" Factor) — 9/10 🟢

### ✅ Cumplimiento Premium Agus Pro
- **Design System:** `mcvill-accent` propagado globalmente vía CSS variables desde `ConfigContext` — dinámico y con soporte para 4 temas (blue, slate, emerald, carbon) ✅
- **Modo oscuro profundo:** `bg-slate-950`, `bg-mcvill-bg`, `bg-black/60` — coherente en todos los módulos ✅
- **Glassmorphism:** `backdrop-blur` encontrado en **100+ componentes** — modales, sidebars, cámaras, chat IA, todos con efecto vidrio ✅
- **Micro-animaciones:** `transition-all` (y `transition-all duration-300`) encontrado en **800+ instancias** a lo largo de toda la UI ✅
- **Framer Motion:** `motion.tr`, `animate-in fade-in`, `zoom-in duration-300` usados consistentemente ✅
- **Zero Lorem Ipsum:** Sin textos placeholder en ningún componente ✅
- **Dropdowns:** Todos los `<select>` usan `bg-black/60 text-white` — contraste premium ✅
- **Tipografía en PDFs:** Inter en `ViajeroAdminPanel.tsx` — correcto para exports ✅

### ⚠️ Observación Menor

| Sev | Archivo | Descripción | Acción |
|-----|---------|-------------|--------|
| 🟢 P3 | `ViajeroQRModal.tsx:32` | PDF QR usa `font-family: sans-serif` genérico | Cambiar a `'Inter', sans-serif` para consistencia |

---

## 4. 🧱 Arquitectura & Zero Hardcoding — 6/10 🟡

### ✅ Bien hecho
- `ConfigContext` tipado con `BrandConfig` interface completa — `brandName`, `systemName`, `logo`, `industryType`, `salarioBaseDefault`, etc. ✅
- Los datos de Supabase **sobreescriben** el `DEFAULT_CONFIG` al iniciar — flujo correcto ✅
- `industryType` propagado a `Sidebar.tsx` (exclusiones dinámicas), `SettingsView.tsx` (selector) y `desempenoService.ts` ✅
- `useConfig()` activo en componentes críticos: Dashboard, Sidebar, SettingsView, DesempenoView ✅

### 🟡 Hallazgos P2 — Tenant Hardcodeado

| Archivo | Línea | Código | Acción |
|---------|-------|--------|--------|
| `wiService.ts` | 3 | `const TENANT = 'mcvill'` | Recibir tenantId como parámetro de la función |
| `spcService.ts` | 3 | `const TENANT = 'mcvill'` | Ídem |
| `desempenoService.ts` | 3, 9 | `const TENANT = 'mcvill'` + fallback | Ídem |
| `hseService.ts` | 162 | `\|\| 'mcvill'` | Manejar null explícitamente |
| `useTenant.ts` | 9 | `return tenantId \|\| 'mcvill'` | Mostrar UI de error de sesión si no hay tenant |
| `factibilidadIAService.ts` | 41 | `LS_KEY = 'mcvill_factibilidad_historial'` | Prefijo dinámico: `${tenantId}_factibilidad_historial` |
| `ConfigContext.tsx` | 148 | `let currentTenantId = 'mcvill'` | Lanzar error de onboarding si no hay tenant en DB |

### 🟢 Observaciones P3
- Comentarios internos con nombre "McVill" en `reportUtils.ts`, `quoteService.ts`, `agentService.ts` — no afectan al runtime pero dificultan la reventa SaaS.
- `quoteService.ts:24`: `// const TENANT = 'mcvill'; // REMOVED` — línea muerta, eliminar.

---

## 5. ⚡ Performance & Build — 7/10 🟡

### 📦 Métricas de Build (Vite 5.4.21)

```
✅ Build exitoso: 25.94 segundos | Exit code: 0
📦 Chunks generados: 38 archivos JS
🗂️ Bundle total estimado: ~2.7 MB min | ~740 KB gzip
```

### Chunks Críticos >500 KB

| Chunk | Tamaño | Gzip | Prioridad |
|-------|--------|------|-----------|
| `index-*.js` | **767 KB** | 227 KB | 🔴 Optimizar — main bundle |
| `jspdf.es.min-*.js` | 390 KB | 128 KB | 🟡 Dynamic import al generar PDF |
| `CartesianChart-*.js` | 326 KB | 99 KB | 🟡 Lazy load Recharts |
| `LiveVoiceModalERP-*.js` | 305 KB | 62 KB | 🟢 Aceptable — modal lazy |

### ✅ Bien hecho
- `App.tsx:21` usa `lazy(() => ...)` correctamente para todos los módulos pesados ✅
- `ViajeroAdminPanel`, `SettingsView`, `RHView` en chunks separados ✅
- `Sentry` integrado para monitoreo de errores en producción ✅

### ⚠️ Observaciones

| Sev | Descripción | Acción |
|-----|-------------|--------|
| 🟡 P2 | `console.log` activos en producción (11 instancias en geminiLiveService, LiveVoiceModalERP) | Crear `src/utils/logger.ts` con no-op en producción |
| 🟡 P2 | `jspdf` cargado en el bundle principal | `const jsPDF = await import('jspdf')` al hacer clic en "Exportar PDF" |
| 🟢 P3 | Sin índices explícitos verificados para `tenant_id` en migraciones SQL visibles | Verificar índices en Supabase Dashboard |

---

## 6. 🧹 Calidad de Código TypeScript — 6/10 🟡

### `as any` — 50+ instancias

La mayoría son técnicamente justificables (respuestas DB sin tipo, librería jspdf interna), pero representan deuda técnica acumulada.

**Top concentraciones:**
| Archivo | Instancias | Tipo |
|---------|-----------|------|
| `agentService.ts` | ~20 | Datos DB Supabase sin tipo |
| `MantenimientoPanel.tsx` | 6 | `edit as any` repetitivo |
| `FinanceView.tsx` | 4 | Formularios sin tipo genérico |
| `inventoryService.ts` | 3 | Campo `quantity` renombrado |

**Solución global (P3):** `npx supabase gen types typescript --project-id rtfxxonlpzgtxkrirwrl > src/types/supabase.ts`

### `catch {}` Silenciosos — 44 instancias

La mayoría son fallbacks de localStorage (aceptables). Los siguientes son críticos:

| Archivo | Línea | Riesgo | Acción |
|---------|-------|--------|--------|
| `AttendanceView.tsx` | 67, 255 | 🟡 Medio | Agregar Toast de error |
| `PlanningView.tsx` | 425, 449, 638, 659 | 🟡 Medio | Feedback al usuario en flujos de datos |
| `QualityView.tsx` | 467 | 🟡 Medio | Operación de calidad sin notificación |
| `InventoryView.tsx` | 146 | 🟡 Medio | Carga de inventario sin error visible |

### ✅ Bien hecho
- `ErrorBoundary` activo wrapping `<App />` completo — sin pantalla blanca ✅
- Props tipadas en la mayoría de componentes con `React.FC<Props>` ✅
- `eslint-plugin-react-hooks` en devDependencies ✅

---

## 7. 🤖 Modelos de IA — 9/10 🟢

| Uso | Modelo Configurado | Estado |
|-----|--------------------|--------|
| Texto / Agente | `gemini-2.5-flash-lite` | ✅ Correcto |
| Live Voz | `models/gemini-2.5-flash-native-audio-preview-12-2025` | ✅ Correcto |
| Endpoint Voz | `v1beta` (LiveVoiceModalERP:245) | ✅ Correcto |
| Selector UI | `gemini-2.5-flash-lite` default en SettingsView | ✅ Correcto |
| Modelos obsoletos (2.0, 1.5) | No encontrados | ✅ Limpio |

### ⚠️ Un hallazgo P2

| Archivo | Línea | Modelo | Acción |
|---------|-------|--------|--------|
| `aiService.ts` | 93 | `'gemini-2.5-flash'` (sin `-lite`) | Cambiar a `'gemini-2.5-flash-lite'` — cumple Regla 12 y reduce costos |

---

## 8. 💼 ROI & Visión de Negocio — 8/10 🟢

### ✅ Implementado
- **Godmode activo:** Roles `ceo`, `sistemas`, `gerencia` tienen acceso ilimitado a todos los módulos (`isGodmode = true`) ✅
- **Multi-vertical:** 7 industrias configurables (Metalmecánica, Automotriz, Aeroespacial, Textil, Farmacéutica, Electrónica, Minería) — diferenciador clave de ventas ✅
- **Multitenancy:** `tenants` table con `config` JSONB — arquitectura SaaS lista ✅
- **KPIs de Dashboard:** OEE, Asistencia, Scrap, Producción, Energía con mini-charts SVG ✅
- **Automatización IA:** Chat Neural, Agente Cotizaciones, Factibilidad IA, Conciliación IA, Voice Link — alto nivel de automatización ✅
- **Sentry integrado:** Monitoreo de errores en producción listo ✅

### ⚠️ Observaciones

| Sev | Tema | Descripción | Acción |
|-----|------|-------------|--------|
| 🟡 P2 | **Stripe / Pagos** | No hay integración de pagos implementada | Agregar módulo de suscripción SaaS con Stripe para cobrar a nuevos tenants |
| 🟡 P2 | **Analytics de Uso** | No hay tracking de qué módulos usa más cada tenant | Integrar evento básico `supabase.from('usage_events').insert()` por acción clave |
| 🟢 P3 | **Automatización pendiente** | El módulo de `rfq_kanban` tiene proceso de aprobación manual | Automatizar aprobación con umbral de riesgo IA desde `factibilidadIAService` |
| 🟢 P3 | **Manual Técnico** | `Manual ERP McVill — Documentación Completa.pdf` existe pero las nuevas verticales industriales no están documentadas | Actualizar con las 4 nuevas verticales (Textil, Farmacéutica, Electrónica, Minería) |

---

## 🛠️ Plan de Acción Priorizado

### 🔴 P1 — Crítico *(No hay. Build pasa con exit code 0)*

### 🟡 P2 — Importante *(Próximo sprint)*

| # | Acción | Archivo(s) | Impacto |
|---|--------|-----------|---------|
| 1 | `'gemini-2.5-flash'` → `'gemini-2.5-flash-lite'` | `aiService.ts:93` | 💰 Reducción costos API ~30% |
| 2 | Crear `src/utils/logger.ts` — no-op en producción | `geminiLiveService.ts`, `LiveVoiceModalERP.tsx` | 🔐 Oculta info en consola del navegador |
| 3 | Mover RAG fetch a Edge Function | `agentService.ts:812` | 🔐 API key 100% server-side |
| 4 | `catch (err)` con Toast en flujos críticos | `AttendanceView`, `PlanningView`, `QualityView`, `InventoryView` | 👥 UX: usuario informado ante fallas |
| 5 | `jspdf` con `dynamic import()` al exportar | Todos los módulos con PDF | ⚡ Reduce bundle inicial ~390 KB |
| 6 | Cambiar placeholder JWT en Dashboard | `Dashboard.tsx:296` | 🔐 Evita confusión con tokens reales |
| 7 | Reemplazar `const TENANT = 'mcvill'` en servicios | `wiService`, `spcService`, `desempenoService` | 🧱 True zero-hardcoding |
| 8 | Integrar Stripe para suscripción por tenant | Nuevo módulo | 💰 Monetización SaaS directa |

### 🟢 P3 — Mejora *(Backlog técnico)*

| # | Acción | Impacto |
|---|--------|---------|
| 1 | `supabase gen types typescript` → tipado fuerte en servicios | 🧹 Elimina 50+ `as any` |
| 2 | Prefijos localStorage dinámicos por `tenantId` | 🧱 Aislamiento de datos por cliente |
| 3 | Eventos `usage_events` por acción de módulo | 📊 Analytics de uso por tenant |
| 4 | Actualizar Manual PDF con verticales Textil/Farma/Electrónica/Minería | 📄 Documentación comercial lista |
| 5 | Automatizar aprobación RFQ desde `factibilidadIAService` | 🤖 Mayor automatización del pipeline comercial |

---

*Reporte generado por `/code-audit` — Agus Pro Workflow v2. Para aplicar las correcciones P2, ejecuta `/review-fix-push`.*
