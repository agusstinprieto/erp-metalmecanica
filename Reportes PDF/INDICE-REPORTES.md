# Índice de Reportes — ERP McVill

> Todos los reportes que los usuarios pueden imprimir o descargar desde la app.
> Actualizado: 17/05/2026

---

## Reportes completamente implementados

Estos reportes generan PDF real desde la app:

| # | Módulo | Nombre del Reporte | Archivo fuente | Motor PDF | Datos que incluye | HTML de muestra |
|---|---|---|---|---|---|---|
| 1 | **Cotizaciones** | Cotización Formal al Cliente | `AgenteCotizacionesView.tsx` | jsPDF + autoTable | Número cotización, cliente, vigencia, partidas (descripción/cant/precio), subtotal, IVA 16%, total, condiciones comerciales | `reporte-cotizacion.html` |
| 2 | **Ventas** | Cotización desde Panel de Ventas | `VentasPanel.tsx` | jsPDF + autoTable (A4) | Encabezado McVill, info cliente, tabla de partidas con partida/descripción/cant/precio unitario/importe, subtotal/IVA/total, notas | `reporte-cotizacion.html` |
| 3 | **Asistencia / RH** | Reporte de Ausentismo | `AttendanceView.tsx` | reportUtils.exportToPDF | Colaborador, Días Reg., Presentes, Faltas, Retardos, Sin Check-Out, % Asistencia — filtrable por rango de fechas y turno | `reporte-asistencia-ausentismo.html` |
| 4 | **Nómina** | Recibo de Pago Individual | `PayrollCalculatorModal.tsx` | window.print() | Empleado, período, días trabajados, salario base, horas extra, ISR, IMSS obrero, neto a pagar — con desglose de percepciones y deducciones | `reporte-nomina-semanal.html` |
| 5 | **RH** | Credencial de Empleado | `EmployeeBadgeModal.tsx` | window.print() | Foto/avatar, nombre completo, puesto, número de empleado, célula/área, turno, código de barras para Kiosk, año de vigencia | `reporte-credencial-empleado.html` |
| 6 | **Minutas** | Minuta de Reunión | `MinutasView.tsx` | jsPDF (vía handleExportPDF) | Tipo reunión, fecha/lugar/facilitador, lista de asistentes con firma, puntos tratados, acuerdos con responsable y fecha límite, espacio de firmas | `reporte-minuta-reunion.html` |
| 7 | **IA Chat** | Transcripción de Sesión IA | `McVillChat.tsx` | jsPDF (exportChatToPDF) | ID de sesión, usuario, modelo IA, duración, todos los mensajes con timestamp, highlights de recomendaciones | `reporte-chat-ia.html` |
| 8 | **Finanzas** | Conciliación Bancaria IA | `ConciliacionIA.tsx` | reportUtils.exportToPDF | Movimientos banco vs. ERP, confianza IA, estado (auto/sugerido/sin-match), diferencias pendientes | `reporte-conciliacion-bancaria.html` |
| 9 | **Reclutamiento** | Perfil de Candidato | `RecruitmentView.tsx` | reportUtils.exportToPDF | Datos del candidato, score IA, fortalezas, áreas de mejora, recomendación neural, etapa del proceso | `reporte-reclutamiento-candidato.html` |
| 10 | **Ingeniería** | BOM desde Plano (Vision AI) | `BlueprintAnalyzerModal.tsx` | reportUtils.exportToPDF | Lista de materiales extraída por IA del plano: componente, cantidad, unidad, notas técnicas | `reporte-bom-planos.html` |
| 11 | **Cotizaciones** | Análisis de Factibilidad IA | `FactibilidadIAView.tsx` | reportUtils.exportToPDF | Veredicto, costos (pieza/lote), tiempo entrega, capacidad, riesgos, cuellos de botella, recomendaciones, resumen ejecutivo | `reporte-factibilidad-ia.html` |

---

## Reportes en módulos adicionales (agente en progreso)

Estos módulos están siendo auditados/implementados por el agente de fondo:

| # | Módulo | Nombre del Reporte | Archivo fuente | HTML de muestra |
|---|---|---|---|---|
| 12 | **Compras** | Orden de Compra | `PurchasesView.tsx` / `ComprasView.tsx` | `reporte-compras-ordenes.html` |
| 13 | **Producción** | Órdenes de Trabajo | `ProductionView.tsx` | `reporte-produccion-ordenes-trabajo.html` |
| 14 | **Seguridad Industrial** | Incidentes HSE | `SeguridadIndustrialView.tsx` | `reporte-hse-incidentes.html` |
| 15 | **Calidad / SPC** | Reporte Six Sigma | `QualityView.tsx` | `reporte-calidad-six-sigma.html` |
| 16 | **Desempeño** | KPIs de Operadores | `DesempenoView.tsx` | `reporte-desempeno-operadores.html` |
| 17 | **Costeo** | Simulación de Costeo | `CosteoDashboard.tsx` | `reporte-costeo-simulacion.html` |
| 18 | **Dashboard** | Resumen Ejecutivo KPIs | `DashboardView.tsx` | `reporte-dashboard-kpis.html` |
| 19 | **RH** | Censo de Personal | `HRView.tsx` | `reporte-rh-censo-personal.html` |
| 20 | **Mantenimiento** | Reporte de Activos | `MaintenanceView.tsx` | `reporte-mantenimiento-activos.html` |
| 21 | **Inventario** | Inventario General / OC sugerida | `InventoryView.tsx` | `reporte-inventario-general.html` |
| 22 | **Finanzas** | Flujo de Caja | `FinancesView.tsx` | `reporte-finanzas-flujo-caja.html` |
| 23 | **Calidad** | PPAP / PSW | `PPAPView.tsx` | `reporte-ppap-psw.html` |

---

## Reportes generados por el Reporting Service (localhost:5005)

Estos los genera el servidor .NET separado, no el frontend React:

| # | Nombre | Endpoint | Motor | Para qué |
|---|---|---|---|---|
| R1 | Viajero Industrial (QuestPDF) | `GET /api/reports/viajero/{jobID}` | QuestPDF C# | PDF nativo con todas las operaciones del viajero |
| R2 | Viajero HTML (Puppeteer) | `GET /api/reports/viajero/html/{jobID}` | Chrome headless | Versión HTML del viajero con template editable |
| R3 | Masivo seleccionados | `POST /api/reports/viajero/print-selected` | QuestPDF | Varios viajeros en un solo PDF para imprimir de una vez |
| R4 | Masivo por fechas | `GET /api/reports/viajero/print-by-date` | QuestPDF | Todos los viajeros de un rango de fechas |
| R5 | Preview HTML navegador | `GET /api/reports/viajero/html-preview/{jobID}` | HTML puro | Vista previa del viajero en el navegador antes de imprimir |

---

## Resumen ejecutivo

| Categoría | Cantidad |
|---|---|
| Reportes completamente funcionales (código + HTML) | **11** |
| Reportes en módulos adicionales (HTML listo, código en progreso) | **12** |
| Reportes del Reporting Service (viajeros) | **5** |
| **Total de puntos de exportación en la app** | **28** |

---

## Cómo abrir los HTMLs de muestra

Abre cualquier archivo `.html` de esta carpeta en el navegador (doble clic) y usa `Ctrl+P` para imprimir o guardar como PDF.

Los reportes con `window.print()` (Credencial, Recibo de Nómina) ya tienen estilos `@media print` optimizados para impresora.

Los reportes con `jsPDF` generan un archivo `.pdf` directamente descargable desde la app sin diálogo de impresión.

Los reportes con `reportUtils.exportToPDF` usan la utilidad compartida en `src/utils/reportUtils.ts`.
