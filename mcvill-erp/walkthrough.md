# Walkthrough — Bug Fixes & Hardening ERP McVill
**Date:** 2026-05-15  
**Scope:** P4 Factibilidad IA + módulos de soporte (Kanban RFQ, quoteService, hooks)  
**TypeScript check post-fix:** ✅ 0 errores

---

## 1. `useQuoteStatus.ts` — Rollback no restauraba el estado original

**Bug:** Al fallar la actualización en Supabase, el rollback hacía `{ estado: r.estado }` donde `r.estado` ya era el *nuevo* estado (por la actualización optimista). El rollback nunca restauraba nada.

**Fix:** Se captura `originalEstado` antes del update optimista. Si el `await updateEstado()` falla, se restaura ese valor. Se añade `console.error` para visibilidad.

```ts
// Antes — rollback roto
catch {
  setRfqs(prev => prev.map(r => r.id === id ? { ...r, estado: r.estado } : r));
}

// Después — rollback correcto
const originalEstado = rfqs.find(r => r.id === id)?.estado;
// ... optimistic update ...
catch (e) {
  console.error('Failed to update RFQ estado:', e);
  if (originalEstado) {
    setRfqs(prev => prev.map(r => r.id === id ? { ...r, estado: originalEstado } : r));
  }
}
```

---

## 2. `factibilidadIAService.ts` — JSON.parse sin protección + sin filtro de tenant

**Bug A:** `JSON.parse(cleaned)` lanzaba excepción no capturada si la IA devolvía texto malformado, crasheando el análisis con un error genérico sin contexto.

**Fix:** Se envuelve en `try/catch` con validación mínima de campos requeridos (`factibilidad`, `resumen_ejecutivo`). El error lanzado es descriptivo y llega al usuario.

**Bug B:** `getHistorial()` y `deleteAnalisis()` no filtraban por `tenant_id = 'mcvill'`, exponiendo potencialmente datos de otros tenants.

**Fix:** Se añade `.eq('tenant_id', 'mcvill')` en `select` y `delete`. La limpieza de localStorage en `deleteAnalisis` ahora ocurre siempre, sin importar el prefijo del ID.

---

## 3. `quoteService.ts` — Operaciones sin tenant_id

**Bug:** `createRFQ()` insertaba filas sin `tenant_id`. `updateEstado()`, `updateRFQ()` y `deleteRFQ()` operaban sobre cualquier fila solo por `id`, sin verificar tenant.

**Fix:** Se define constante `TENANT = 'mcvill'` y se aplica en todas las operaciones:
- `createRFQ`: añade `tenant_id: TENANT` al objeto insertado
- `fetchRFQs`: añade `.eq('tenant_id', TENANT)`
- `updateEstado`, `updateRFQ`: añaden `.eq('tenant_id', TENANT)` antes del update
- `deleteRFQ`: añade `.eq('tenant_id', TENANT)` antes del delete

---

## 4. `FactibilidadIAView.tsx` — Promesas sin manejo de errores + null guard

**Bug A:** `useEffect` inicial llamaba `fetchRFQs()` y `getHistorial()` sin `.catch()`. Error de red dejaba la UI colgada sin retroalimentación al usuario.

**Fix:** Se añade `.catch()` a ambas llamadas. Error en `fetchRFQs` muestra mensaje al usuario; error en `getHistorial` falla silenciosamente (no es crítico).

**Bug B:** `handleSave()` hacía `await saveAnalisis()` sin `try/catch`. Promesa rechazada pasaba sin notificación.

**Fix:** Envuelto en `try/catch`. Error se muestra al usuario via `setError()`.

**Bug C:** `handleDelete()` no capturaba errores del delete async.

**Fix:** Envuelto en `try/catch` con `console.error`. El historial se recarga independientemente.

**Bug D:** `handleReload()` usaba `rfqs.find()` sin null guard — si el RFQ ya no existe, `setSelected(undefined)` rompía la UI.

**Fix:** Guard explícito: si `rfq` es `undefined`, se muestra error descriptivo y se retorna temprano.

---

## 5. `App.tsx` — handleAnalyzeRFQ no memoizado

**Bug:** `handleAnalyzeRFQ` se redefinía en cada render, generando una nueva referencia de función que se pasaba como prop a `CotizacionesKanbanView`, causando re-renders innecesarios del árbol completo del Kanban.

**Fix:** Envuelto con `useCallback(…, [])`. Se añade `useCallback` al import de React.

---

## 6. `CotizacionesKanbanView.tsx` — fetchRFQs sin .catch

**Bug:** `fetchRFQs().then(...)` sin `.catch()`. Error de red dejaba `loading: true` para siempre, bloqueando toda la UI del Kanban.

**Fix:** Se añade `.catch(() => setLoading(false))` para garantizar que el spinner se detiene aunque falle la carga.

---

## Resumen de archivos modificados

| Archivo | Tipo de fix |
|---------|-------------|
| `src/hooks/useQuoteStatus.ts` | Bug crítico — rollback + logging |
| `src/services/factibilidadIAService.ts` | Bug crítico — JSON parse + tenant filters |
| `src/services/quoteService.ts` | Bug crítico — tenant_id en todas las operaciones |
| `src/components/FactibilidadIAView.tsx` | Error handling async + null guards |
| `src/App.tsx` | Performance — useCallback memoization |
| `src/components/CotizacionesKanbanView.tsx` | Reliability — .catch en fetch inicial |

**Verificación final:** `npx tsc --noEmit` → 0 errores, 0 warnings relevantes.
