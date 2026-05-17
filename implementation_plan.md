# Implementation Plan — ERP McVill Bug Review & Fixes
**Date:** 2026-05-15  
**Scope:** P4 Factibilidad IA + supporting modules  
**Reviewer:** Claude Code (deep static analysis)

---

## Findings by Severity

### CRITICAL

| # | File | Issue | Fix |
|---|------|-------|-----|
| C1 | `factibilidadIAService.ts:125` | `JSON.parse()` on AI response has no try/catch — any malformed JSON crashes the entire analysis silently | Wrap in try/catch, throw descriptive error |
| C2 | `useQuoteStatus.ts:25` | Rollback on Supabase failure does `{ estado: r.estado }` which is already the **new** estado — rollback never restores the original | Capture original estado before optimistic update, restore it on catch |
| C3 | `quoteService.ts:124-142` | `createRFQ()` inserts without `tenant_id`; `updateEstado/updateRFQ/deleteRFQ` have no tenant filter — cross-tenant operations possible | Add `tenant_id: 'mcvill'` to insert; add `.eq('tenant_id','mcvill')` to all update/delete |

### HIGH

| # | File | Issue | Fix |
|---|------|-------|-----|
| H1 | `factibilidadIAService.ts:152` | `getHistorial()` fetches all rows without `tenant_id` filter | Add `.eq('tenant_id','mcvill')` to select query |
| H2 | `FactibilidadIAView.tsx:371` | `handleSave()` awaits `saveAnalisis()` without try/catch — promise rejection is unhandled | Wrap in try/catch, show error to user |
| H3 | `FactibilidadIAView.tsx:383` | `handleReload()` uses `rfqs.find()` result without null guard — undefined silently set as selected RFQ | Add early return if rfq not found |
| H4 | `FactibilidadIAView.tsx:340` | `useEffect` fetch calls have no error handling — loading state hangs forever on network error | Add try/catch/finally, set loading false on error |

### MEDIUM

| # | File | Issue | Fix |
|---|------|-------|-----|
| M1 | `App.tsx:55` | `handleAnalyzeRFQ` not wrapped in `useCallback` — new reference every render passed to `CotizacionesKanbanView` | Wrap with `useCallback(…, [])` |
| M2 | `CotizacionesKanbanView.tsx:648` | `fetchRFQs().then()` has no `.catch()` — network failure leaves `loading: true` forever | Add `.catch(() => setLoading(false))` |
| M3 | `useQuoteStatus.ts:23` | `catch {}` swallows error with no logging | Add `console.error` in catch |
| M4 | `factibilidadIAService.ts:199` | `deleteAnalisis()` always cleans localStorage regardless of ID prefix — fragile prefix check | Clean localStorage unconditionally |

---

## Files to Modify

1. `src/hooks/useQuoteStatus.ts`
2. `src/services/factibilidadIAService.ts`
3. `src/services/quoteService.ts`
4. `src/components/FactibilidadIAView.tsx`
5. `src/App.tsx`
6. `src/components/CotizacionesKanbanView.tsx`

---

## Out of Scope

- aiService.ts internal response validation (depends on Edge Function contract, not our code)
- Role-based access for P4 menu (current `isGodmode` gate is acceptable for this phase)
- sessionStorage → context refactor for pre-selected RFQ (works correctly, just not optimal)
