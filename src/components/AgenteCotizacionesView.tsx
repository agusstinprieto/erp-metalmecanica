import React, { useState } from 'react';
import {
  Sparkles, Download, FileText, Plus, Trash2, Loader2,
  X, RefreshCw, Save, ChevronRight, Zap, Package
} from 'lucide-react';
import clsx from 'clsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { aiService } from '../services/aiService';
import { supabase } from '../lib/supabase';
import { Toast } from './common/Toast';
import { useConfig } from '../contexts/ConfigContext';

interface Partida {
  concepto: string;
  cantidad: number;
  unidad: string;
  precio_unitario: number;
  subtotal: number;
}

interface CotizacionGenerada {
  partidas: Partida[];
  texto_propuesta: string;
  notas: string;
}

const IVA = 0.16;
const VIGENCIAS = ['24 horas', '48 horas', '72 horas', '7 días', '15 días', '30 días'];

function getSystemPrompt(companyName: string): string { return `Eres el agente de cotizaciones de ${companyName}, empresa metalmecánica industrial especializada en fabricación de piezas industriales: corte láser/plasma, soldadura MIG/TIG, maquinado CNC, tratamientos superficiales y ensamble.

Cuando el vendedor describe un proyecto, generas una cotización profesional estructurada.
Responde ÚNICAMENTE con JSON válido. Sin markdown, sin texto extra, solo el objeto JSON.

Estructura obligatoria:
{
  "partidas": [
    { "concepto": "descripción clara de la partida", "cantidad": número, "unidad": "pza|kg|m|hr|lote|juego", "precio_unitario": número, "subtotal": número }
  ],
  "texto_propuesta": "2-3 oraciones ejecutivas describiendo la propuesta de valor para el cliente",
  "notas": "Condiciones: forma de pago, tiempo de entrega estimado, garantía, vigencia de la cotización"
}

Usa precios en MXN realistas para manufactura industrial mexicana 2026.
Incluye TODAS las operaciones necesarias según la descripción: material, corte, maquinado, soldadura, tratamiento superficial, ingeniería.
El subtotal de cada partida debe ser cantidad × precio_unitario.`; }

const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pad = (n: number) => String(n).padStart(4, '0');
const nextFolio = () => `COT-${new Date().getFullYear()}-${pad(Math.floor(Math.random() * 9000) + 1000)}`;

function calcTotales(partidas: Partida[]) {
  const subtotal = partidas.reduce((s, p) => s + p.subtotal, 0);
  const iva = subtotal * IVA;
  const total = subtotal + iva;
  return { subtotal, iva, total };
}

export const AgenteCotizacionesView: React.FC = () => {
  const { config } = useConfig();
  const SYSTEM_PROMPT = getSystemPrompt(config.companyName);
  const [descripcion, setDescripcion] = useState('');
  const [cliente, setCliente] = useState('');
  const [numeroParte, setNumeroParte] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [vigencia, setVigencia] = useState('7 días');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cotizacion, setCotizacion] = useState<CotizacionGenerada | null>(null);
  const [folio, setFolio] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!descripcion.trim()) { notify('Describe el proyecto primero', 'error'); return; }
    setIsGenerating(true);
    setCotizacion(null);
    try {
      const prompt = `Descripción del proyecto: ${descripcion}
${cliente ? `Cliente: ${cliente}` : ''}
${numeroParte ? `No. de parte / Proyecto: ${numeroParte}` : ''}
${cantidad ? `Cantidad requerida: ${cantidad}` : ''}

Genera la cotización industrial completa.`;

      const raw = await aiService.askGemini(prompt, undefined, [], SYSTEM_PROMPT);

      // Strip markdown fences if model ignores instructions
      const cleaned = raw.trim().replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
      const parsed: CotizacionGenerada = JSON.parse(cleaned);

      // Ensure subtotals are calculated
      parsed.partidas = parsed.partidas.map(p => ({
        ...p,
        subtotal: p.cantidad * p.precio_unitario,
      }));

      setCotizacion(parsed);
      setFolio(nextFolio());
    } catch (e: any) {
      console.error(e);
      notify(`Error al generar: ${e?.message || 'Revisa la conexión IA'}`, 'error');
    }
    setIsGenerating(false);
  };

  // ── Edit partidas inline ──────────────────────────────────────────────────
  const updatePartida = (i: number, field: keyof Partida, value: string | number) => {
    if (!cotizacion) return;
    const next = cotizacion.partidas.map((p, idx) => {
      if (idx !== i) return p;
      const updated = { ...p, [field]: typeof value === 'number' ? value : value };
      if (field === 'cantidad' || field === 'precio_unitario') {
        updated.subtotal = Number(updated.cantidad) * Number(updated.precio_unitario);
      }
      return updated;
    });
    setCotizacion({ ...cotizacion, partidas: next });
  };

  const addPartida = () => {
    if (!cotizacion) return;
    setCotizacion({ ...cotizacion, partidas: [...cotizacion.partidas, { concepto: '', cantidad: 1, unidad: 'pza', precio_unitario: 0, subtotal: 0 }] });
  };

  const removePartida = (i: number) => {
    if (!cotizacion) return;
    setCotizacion({ ...cotizacion, partidas: cotizacion.partidas.filter((_, idx) => idx !== i) });
  };

  // ── Save to DB ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!cotizacion) { notify('Genera una cotización primero', 'error'); return; }
    setIsSaving(true);
    try {
      const { total } = calcTotales(cotizacion.partidas);
      const { error } = await supabase.from('cotizaciones').insert({
        numero_cotizacion: folio,
        cliente_nombre: cliente || 'Sin especificar',
        numero_parte: numeroParte || null,
        descripcion: descripcion,
        estado: 'pendiente',
        vigencia_horas: parseViajeroHours(vigencia),
        precio_total: total,
        texto_propuesta: cotizacion.texto_propuesta,
        partidas: cotizacion.partidas,
        notas: cotizacion.notas,
      });
      if (error) throw error;
      notify(`Cotización ${folio} guardada`);
    } catch (e: any) {
      console.error(e);
      notify('Error al guardar. Verifica la tabla cotizaciones.', 'error');
    }
    setIsSaving(false);
  };

  // ── PDF Export ────────────────────────────────────────────────────────────
  const handlePDF = async () => {
    if (!cotizacion) { notify('Genera una cotización primero', 'error'); return; }
    const { subtotal, iva, total } = calcTotales(cotizacion.partidas);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    // ── Load logo ──
    let logoB64: string | null = null;
    try {
      const res = await fetch('/mcvill-logo-dark.png');
      if (res.ok) {
        const blob = await res.blob();
        logoB64 = await new Promise<string>(resolve => {
          const r = new FileReader();
          r.onloadend = () => resolve(r.result as string);
          r.onerror = () => resolve('');
          r.readAsDataURL(blob);
        });
      }
    } catch { /* sin logo */ }

    // ══════════════════════════════════════════════════
    // ENCABEZADO CORPORATIVO McVill
    // ══════════════════════════════════════════════════
    const HDR_H = 46; // altura total del encabezado corporativo

    // Fondo blanco
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, HDR_H, 'F');

    // ── Columna izquierda: Logo + tagline ──
    if (logoB64) {
      try { doc.addImage(logoB64, 'PNG', 8, 4, 50, 26); } catch { /* skip */ }
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(10, 18, 35);
      doc.text(config.brandName, 10, 18);
    }
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 110);
    doc.text('Precision Metal Fabrication Solution', 10, 33);

    // ── Columna centro: Datos de contacto ──
    const cx = 68;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(50, 50, 60);
    doc.text('Calle Allende # 280 , Ciudad Industrial Torreón,', cx, 10);
    doc.text('Torreón, Coahuila Mexico. CP 27019.', cx, 15.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(20, 20, 30);
    doc.text('Tel. (871) 7508283 . 2288065 . 2240215', cx, 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(0, 90, 200);
    doc.text('mcvill.com', cx, 28);

    // ── Columna derecha: Badges certificaciones ──
    const badgeY = 5;
    const badgeH = 22;
    let bx = W - 72;

    // ISO 9001
    doc.setFillColor(248, 250, 255);
    doc.setDrawColor(60, 90, 160);
    doc.setLineWidth(0.5);
    doc.roundedRect(bx, badgeY, 21, badgeH, 2, 2, 'FD');
    doc.setTextColor(60, 90, 160);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.text('ISO', bx + 10.5, badgeY + 5.5, { align: 'center' });
    doc.setFontSize(9);
    doc.text('9001', bx + 10.5, badgeY + 12, { align: 'center' });
    doc.setFontSize(4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 90);
    doc.text('Cert no. 59273', bx + 10.5, badgeY + 17, { align: 'center' });

    // AWS
    bx += 23;
    doc.setFillColor(255, 250, 250);
    doc.setDrawColor(180, 40, 40);
    doc.roundedRect(bx, badgeY, 21, badgeH, 2, 2, 'FD');
    doc.setTextColor(180, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('AWS', bx + 10.5, badgeY + 8, { align: 'center' });
    doc.setFontSize(4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text('American', bx + 10.5, badgeY + 13, { align: 'center' });
    doc.text('Welding Society', bx + 10.5, badgeY + 17, { align: 'center' });

    // JobBOSS
    bx += 23;
    doc.setFillColor(0, 90, 200);
    doc.roundedRect(bx, badgeY, 23, badgeH, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('JobBOSS', bx + 11.5, badgeY + 8, { align: 'center' });
    doc.setFontSize(4);
    doc.setFont('helvetica', 'normal');
    doc.text('Shop management', bx + 11.5, badgeY + 13, { align: 'center' });
    doc.text('solutions.', bx + 11.5, badgeY + 17, { align: 'center' });

    // ── Línea separadora azul ──
    doc.setDrawColor(0, 100, 210);
    doc.setLineWidth(1.2);
    doc.line(0, HDR_H - 1, W, HDR_H - 1);

    // ── Barra oscura con folio y fecha ──
    const BAND_Y = HDR_H;
    doc.setFillColor(10, 18, 35);
    doc.rect(0, BAND_Y, W, 13, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`COTIZACIÓN  ${folio}`, 12, BAND_Y + 8.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(150, 200, 255);
    doc.text(
      `Fecha: ${new Date().toLocaleDateString('es-MX')}   ·   Vigencia: ${vigencia}`,
      W - 12, BAND_Y + 8.5, { align: 'right' }
    );

    // ── Client + reference block ──
    let y = HDR_H + 13 + 5; // debajo del header corporativo + barra de folio
    doc.setFillColor(20, 30, 50);
    doc.roundedRect(10, y, W - 20, 28, 2, 2, 'F');

    doc.setTextColor(100, 160, 220);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('PARA / CLIENTE', 15, y + 6);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text(cliente || 'A quien corresponda', 15, y + 13);
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text('Torreón, México', 15, y + 19);

    if (numeroParte) {
      doc.setTextColor(100, 160, 220);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('NO. PARTE / PROYECTO', W / 2 + 5, y + 6);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(numeroParte, W / 2 + 5, y + 13);
      if (cantidad) {
        doc.setFontSize(8);
        doc.setTextColor(180, 180, 180);
        doc.text(`Cantidad: ${cantidad}`, W / 2 + 5, y + 19);
      }
    }

    // ── Description ──
    y += 34;
    doc.setTextColor(50, 80, 120);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPCIÓN DEL PROYECTO', 12, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8);
    const descLines = doc.splitTextToSize(descripcion, W - 24);
    doc.text(descLines.slice(0, 3), 12, y);
    y += descLines.slice(0, 3).length * 4 + 4;

    // ── Partidas table ──
    autoTable(doc, {
      startY: y,
      head: [['#', 'Concepto / Descripción', 'Cant.', 'U.M.', 'P. Unit.', 'Subtotal']],
      body: cotizacion.partidas.map((p, i) => [
        i + 1,
        p.concepto,
        p.cantidad,
        p.unidad.toUpperCase(),
        fmt(p.precio_unitario),
        fmt(p.subtotal),
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [10, 18, 35], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 248, 252] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        2: { cellWidth: 14, halign: 'center' },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 26, halign: 'right' },
        5: { cellWidth: 26, halign: 'right' },
      },
      margin: { left: 10, right: 10 },
    });

    // ── Totals ──
    const afterTable = (doc as any).lastAutoTable.finalY + 4;
    const totY = afterTable;
    const boxW = 75;
    const boxX = W - boxW - 10;

    const rows = [
      ['Subtotal', fmt(subtotal)],
      [`IVA (16%)`, fmt(iva)],
    ];
    rows.forEach(([label, value], i) => {
      doc.setFillColor(240, 244, 250);
      doc.rect(boxX, totY + i * 8, boxW, 8, 'F');
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(label, boxX + 4, totY + i * 8 + 5.5);
      doc.text(value, boxX + boxW - 4, totY + i * 8 + 5.5, { align: 'right' });
    });
    doc.setFillColor(10, 18, 35);
    doc.rect(boxX, totY + 16, boxW, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL MXN', boxX + 4, totY + 22.5);
    doc.text(fmt(total), boxX + boxW - 4, totY + 22.5, { align: 'right' });

    // ── Proposal text ──
    let propY = totY + 32;
    if (cotizacion.texto_propuesta) {
      doc.setFillColor(245, 248, 252);
      const propLines = doc.splitTextToSize(cotizacion.texto_propuesta, W - 24);
      doc.rect(10, propY, W - 20, propLines.length * 4.5 + 8, 'F');
      doc.setTextColor(50, 80, 120);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('PROPUESTA COMERCIAL', 14, propY + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(propLines, 14, propY + 10);
      propY += propLines.length * 4.5 + 14;
    }

    // ── Notes ──
    if (cotizacion.notas) {
      const noteLines = doc.splitTextToSize(cotizacion.notas, W - 24);
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(noteLines, 12, propY);
    }

    // ── Footer corporativo ──
    doc.setDrawColor(0, 100, 210);
    doc.setLineWidth(0.5);
    doc.line(10, H - 16, W - 10, H - 16);
    doc.setFillColor(255, 255, 255);
    doc.rect(0, H - 15, W, 15, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(10, 18, 35);
    doc.text(config.companyName, 10, H - 9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 90);
    doc.text('Calle Allende # 280 · Ciudad Industrial Torreón, Coahuila, México · CP 27019', 10, H - 5);
    doc.setTextColor(0, 90, 200);
    doc.text('mcvill.com', W - 10, H - 7, { align: 'right' });
    doc.setTextColor(100, 100, 110);
    doc.text('Tel. (871) 7508283 · 2288065 · 2240215', W - 10, H - 3, { align: 'right' });

    doc.save(`${folio}_${(cliente || 'cliente').replace(/\s+/g, '_')}.pdf`);
    notify('PDF descargado');
  };

  const { subtotal, iva, total } = cotizacion
    ? calcTotales(cotizacion.partidas)
    : { subtotal: 0, iva: 0, total: 0 };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {notification && <Toast message={notification.message} type={notification.type} isVisible={!!notification} onClose={() => setNotification(null)} />}

      {/* Header */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-blue-500" size={16} />
            <h2 className="text-base font-black text-white tracking-tight uppercase">
              AGENTE DE <span className="text-blue-500">COTIZACIONES IA</span>
            </h2>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest hidden md:block">
            Descripción en Lenguaje Natural → Partidas + Precios + PDF Profesional
          </p>
        </div>
        <div className="flex gap-2">
          {cotizacion && (
            <>
              <button onClick={handleSave} disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50">
                {isSaving ? <Loader2 size={11} className="animate-spin" role="status" aria-label="Cargando" /> : <Save size={11} />} Guardar
              </button>
              <button onClick={handlePDF}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95">
                <Download size={12} strokeWidth={3} /> PDF
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">

        {/* ── Left panel: Input ─────────────────────────────────────────────── */}
        <div className="w-[380px] shrink-0 border-r border-white/5 flex flex-col bg-slate-900/20 overflow-y-auto custom-scrollbar">
          <div className="p-4 space-y-3">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Zap size={10} className="text-blue-500" /> Describir Proyecto
            </p>

            <div>
              <label htmlFor="agente-descripcion" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Descripción del proyecto *</label>
              <textarea
                id="agente-descripcion"
                rows={7}
                className="cyber-input w-full resize-none text-[11px]"
                placeholder={`Ejemplo:

Necesito cotizar 200 piezas de brida ciega DN100, material acero al carbono A36, con soldadura MIG certificada, acabado granallado y pintura epóxica anticorrosiva. Incluir inspección dimensional y certificado de calidad.`}
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="agente-cliente" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Cliente</label>
                <input id="agente-cliente" className="cyber-input w-full text-[11px]" placeholder="Nombre del cliente"
                  value={cliente} onChange={e => setCliente(e.target.value)} />
              </div>
              <div>
                <label htmlFor="agente-vigencia" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Vigencia</label>
                <select id="agente-vigencia" className="cyber-select w-full text-[11px]" value={vigencia}
                  onChange={e => setVigencia(e.target.value)}>
                  {VIGENCIAS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="agente-numero-parte" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">No. Parte / Proyecto</label>
                <input id="agente-numero-parte" className="cyber-input w-full text-[11px]" placeholder="P/N o código"
                  value={numeroParte} onChange={e => setNumeroParte(e.target.value)} />
              </div>
              <div>
                <label htmlFor="agente-cantidad" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Cantidad</label>
                <input id="agente-cantidad" className="cyber-input w-full text-[11px]" placeholder="100" type="number" min="1"
                  value={cantidad} onChange={e => setCantidad(e.target.value)} />
              </div>
            </div>

            <button onClick={handleGenerate} disabled={isGenerating || !descripcion.trim()}
              className="w-full h-12 btn-ai font-black uppercase tracking-widest rounded-xl text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
              {isGenerating
                ? <><Loader2 size={16} className="animate-spin" role="status" aria-label="Cargando" /> Generando con IA...</>
                : <><Sparkles size={14} /> Generar Cotización IA</>}
            </button>

            {cotizacion && (
              <button onClick={() => { setCotizacion(null); setDescripcion(''); setCliente(''); setNumeroParte(''); setCantidad(''); }}
                className="w-full h-9 bg-white/5 border border-white/10 text-slate-500 hover:text-white font-black uppercase tracking-widest rounded-xl text-[9px] flex items-center justify-center gap-2 transition-all">
                <RefreshCw size={12} /> Nueva Cotización
              </button>
            )}

            {/* Instructions */}
            {!cotizacion && !isGenerating && (
              <div className="mt-2 space-y-2">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Cómo funciona:</p>
                {[
                  '1. Describe el proyecto con detalle (materiales, operaciones, cantidad, acabado)',
                  '2. La IA genera partidas con precios industriales realistas',
                  '3. Edita precios y partidas si es necesario',
                  `4. Descarga el PDF profesional con logo ${config.brandName}`,
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    </div>
                    <p className="text-[9px] text-slate-600 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right panel: Generated cotización ────────────────────────────── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!cotizacion && !isGenerating && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5">
                <Sparkles className="text-blue-500" size={32} />
              </div>
              <h3 className="text-lg font-black text-slate-600 uppercase tracking-widest mb-2">Agente de Cotizaciones</h3>
              <p className="text-slate-700 text-[11px] max-w-xs leading-relaxed">
                Describe el proyecto en lenguaje natural y la IA generará la cotización completa con partidas, precios industriales y texto ejecutivo.
              </p>
            </div>
          )}

          {isGenerating && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Loader2 className="animate-spin text-blue-500 mb-4" size={36} role="status" aria-label="Cargando" />
              <p className="text-slate-500 font-black text-[11px] uppercase tracking-widest">Analizando proyecto...</p>
              <p className="text-slate-700 text-[10px] mt-2">Generando partidas y precios industriales</p>
            </div>
          )}

          {cotizacion && !isGenerating && (
            <div className="p-5 space-y-5">

              {/* Folio + Totals header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <FileText size={14} className="text-amber-400" />
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">{folio}</p>
                  </div>
                  <p className="text-xl font-black text-white">{cliente || 'Sin cliente'}</p>
                  {numeroParte && <p className="text-[10px] text-slate-500 uppercase mt-0.5">P/N: {numeroParte}{cantidad ? ` · Cant: ${cantidad}` : ''}</p>}
                </div>
                <div className="flex gap-3">
                  <div className="text-right px-4 py-2 bg-white/[0.02] border border-white/5 rounded-xl">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Subtotal</p>
                    <p className="text-base font-black text-white">{fmt(subtotal)}</p>
                  </div>
                  <div className="text-right px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-1">Total + IVA</p>
                    <p className="text-xl font-black text-blue-500">{fmt(total)}</p>
                  </div>
                </div>
              </div>

              {/* Partidas table */}
              <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-b border-white/5 bg-slate-900/60 flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Package size={12} className="text-blue-500" /> Partidas ({cotizacion.partidas.length})
                  </h3>
                  <button onClick={addPartida}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-600/20 border border-blue-500/30 text-blue-500 hover:bg-blue-600 hover:text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all">
                    <Plus size={10} /> Agregar
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                        <th className="px-3 py-2 w-8">#</th>
                        <th className="px-3 py-2">Concepto</th>
                        <th className="px-3 py-2 w-20">Cant.</th>
                        <th className="px-3 py-2 w-20">U.M.</th>
                        <th className="px-3 py-2 w-28 text-right">P. Unit.</th>
                        <th className="px-3 py-2 w-28 text-right">Subtotal</th>
                        <th className="px-3 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {cotizacion.partidas.map((p, i) => (
                        <tr key={i} className="hover:bg-blue-500/5 transition-colors group">
                          <td className="px-3 py-1.5 text-[10px] font-black text-slate-600">{i + 1}</td>
                          <td className="px-3 py-1.5">
                            <input
                              className="w-full bg-transparent text-[10px] text-white outline-none focus:bg-white/5 rounded px-1 py-0.5"
                              value={p.concepto}
                              onChange={e => updatePartida(i, 'concepto', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input type="number" min="0" step="0.01"
                              className="w-full bg-transparent text-[10px] text-white text-center outline-none focus:bg-white/5 rounded px-1 py-0.5"
                              value={p.cantidad}
                              onChange={e => updatePartida(i, 'cantidad', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              className="w-full bg-transparent text-[10px] text-slate-400 text-center outline-none focus:bg-white/5 rounded px-1 py-0.5 uppercase"
                              value={p.unidad}
                              onChange={e => updatePartida(i, 'unidad', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <input type="number" min="0" step="0.01"
                              className="w-full bg-transparent text-[10px] text-white text-right outline-none focus:bg-white/5 rounded px-1 py-0.5"
                              value={p.precio_unitario}
                              onChange={e => updatePartida(i, 'precio_unitario', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right text-[11px] font-black text-blue-500">
                            {fmt(p.subtotal)}
                          </td>
                          <td className="px-3 py-1.5">
                            <button onClick={() => removePartida(i)}
                              className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-all">
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals footer */}
                <div className="border-t border-white/5 px-4 py-3 flex justify-end">
                  <div className="space-y-1 min-w-[220px]">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500 font-black uppercase tracking-widest">Subtotal</span>
                      <span className="text-white font-black">{fmt(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500 font-black uppercase tracking-widest">IVA 16%</span>
                      <span className="text-slate-400 font-black">{fmt(iva)}</span>
                    </div>
                    <div className="flex justify-between text-[12px] pt-1 border-t border-white/10">
                      <span className="text-blue-500 font-black uppercase tracking-widest">Total MXN</span>
                      <span className="text-blue-500 font-black">{fmt(total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Proposal text */}
              {cotizacion.texto_propuesta && (
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block flex items-center gap-1.5">
                    <ChevronRight size={10} className="text-blue-500" /> Propuesta Comercial
                  </label>
                  <textarea rows={3} className="cyber-input w-full resize-none text-[11px]"
                    value={cotizacion.texto_propuesta}
                    onChange={e => setCotizacion({ ...cotizacion, texto_propuesta: e.target.value })} />
                </div>
              )}

              {/* Notes / conditions */}
              {cotizacion.notas && (
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
                    Condiciones Comerciales
                  </label>
                  <textarea rows={3} className="cyber-input w-full resize-none text-[11px]"
                    value={cotizacion.notas}
                    onChange={e => setCotizacion({ ...cotizacion, notas: e.target.value })} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// helper: convert "7 días" → hours
function parseViajeroHours(v: string): number {
  if (v.includes('hora')) return parseInt(v);
  if (v.includes('día')) return parseInt(v) * 24;
  return 168;
}

export default AgenteCotizacionesView;
