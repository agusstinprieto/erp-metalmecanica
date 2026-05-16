import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FormulaVar {
  readonly symbol: string;
  readonly desc: string;
}

export interface FormulaEntry {
  readonly name: string;
  readonly formula: string;
  readonly vars?: readonly FormulaVar[];
  readonly source?: string;
  readonly note?: string;
}

// ─── Tooltip inline ──────────────────────────────────────────────────────────
// Wrap any JSX child to show a formula hint on hover.

interface FormulaTooltipProps {
  formula: string;
  label?: string;
  children: React.ReactNode;
}

export const FormulaTooltip: React.FC<FormulaTooltipProps> = ({ formula, label, children }) => {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex items-center gap-1 cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <Info size={9} className="text-slate-600 shrink-0" />
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 min-w-[180px] max-w-[260px] bg-slate-900 border border-white/10 rounded-xl px-3 py-2 shadow-2xl pointer-events-none">
          {label && <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>}
          <code className="block text-[10px] font-mono text-blue-300 leading-snug whitespace-pre-wrap">{formula}</code>
        </span>
      )}
    </span>
  );
};

// ─── Color variants ───────────────────────────────────────────────────────────

type ColorVariant = 'blue' | 'emerald' | 'amber' | 'violet' | 'rose' | 'cyan' | 'orange';

const VARIANTS: Record<ColorVariant, { trigger: string; panel: string; code: string; badge: string }> = {
  blue:    { trigger: 'text-blue-400 bg-blue-500/10 border-blue-500/30',    panel: 'bg-blue-500/5 border-blue-500/15',    code: 'text-blue-300',    badge: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  emerald: { trigger: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', panel: 'bg-emerald-500/5 border-emerald-500/15', code: 'text-emerald-300', badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  amber:   { trigger: 'text-amber-400 bg-amber-500/10 border-amber-500/30',  panel: 'bg-amber-500/5 border-amber-500/15',  code: 'text-amber-300',  badge: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  violet:  { trigger: 'text-violet-400 bg-violet-500/10 border-violet-500/30', panel: 'bg-violet-500/5 border-violet-500/15', code: 'text-violet-300', badge: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  rose:    { trigger: 'text-rose-400 bg-rose-500/10 border-rose-500/30',    panel: 'bg-rose-500/5 border-rose-500/15',    code: 'text-rose-300',    badge: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  cyan:    { trigger: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',    panel: 'bg-cyan-500/5 border-cyan-500/15',    code: 'text-cyan-300',    badge: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  orange:  { trigger: 'text-orange-400 bg-orange-500/10 border-orange-500/30', panel: 'bg-orange-500/5 border-orange-500/15', code: 'text-orange-300', badge: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
};

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface FormulaPanelProps {
  formulas: readonly FormulaEntry[];
  variant?: ColorVariant;
  label?: string;
  className?: string;
}

export const FormulaPanel: React.FC<FormulaPanelProps> = ({
  formulas,
  variant = 'blue',
  label = 'Fórmulas',
  className,
}) => {
  const [open, setOpen] = useState(false);
  const v = VARIANTS[variant];

  return (
    <div className={clsx('w-full', className)}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(p => !p)}
        className={clsx(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all',
          open ? v.trigger : 'bg-white/[0.03] border-white/10 text-slate-500 hover:text-white hover:border-white/20'
        )}
      >
        <span className="font-mono text-[11px] leading-none">∑</span>
        {label}
        {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>

      {/* Slide-down panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="formula-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={clsx('mt-2 p-4 rounded-xl border', v.panel)}>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">
                Metodología de cálculo — para revisión y validación
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {formulas.map((f, i) => (
                  <div
                    key={i}
                    className="bg-slate-950/70 border border-white/[0.06] rounded-xl p-3 space-y-1.5"
                  >
                    {/* Name + badge */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-tight">{f.name}</p>
                      {f.source && (
                        <span className={clsx('shrink-0 text-[7px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest', v.badge)}>
                          {f.source}
                        </span>
                      )}
                    </div>

                    {/* Formula */}
                    <code className={clsx('block text-[10px] font-mono font-semibold leading-snug break-words', v.code)}>
                      {f.formula}
                    </code>

                    {/* Variables */}
                    {f.vars && f.vars.length > 0 && (
                      <div className="space-y-0.5 pt-1.5 border-t border-white/[0.05]">
                        {f.vars.map((vr, j) => (
                          <p key={j} className="text-[8px] text-slate-600 leading-snug">
                            <span className="font-mono text-slate-500 mr-1">{vr.symbol}</span>
                            {vr.desc}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Note */}
                    {f.note && (
                      <p className="text-[8px] text-slate-600 italic pt-1 border-t border-white/[0.05]">
                        ⚠ {f.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-[7px] text-slate-700 uppercase tracking-widest mt-3 text-right font-black">
                Estas fórmulas pueden ser ajustadas — consultar con el equipo antes de cambios
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Pre-built formula sets por módulo ───────────────────────────────────────

export const FORMULAS = {

  nomina: [
    { name: 'Salario Base',       formula: 'Base = SD × Días',
      vars: [{ symbol: 'SD', desc: 'salario diario configurado' }, { symbol: 'Días', desc: 'días laborados en el período' }] },
    { name: 'Hora Extra',         formula: 'HE = H × (SD/8 × 2)',
      vars: [{ symbol: 'H', desc: 'horas extra trabajadas' }],
      source: 'Art. 67 LFT',      note: 'Doble del valor de la hora normal' },
    { name: 'Bono OEE',           formula: 'B_OEE = (Base + HE) × 5%',
      note: 'Solo aplica si OEE ≥ 85% en el período', source: 'Política interna' },
    { name: 'ISR Mensual',        formula: 'ISR = CF + (Bruto − LI) × %t − Subsidio',
      vars: [{ symbol: 'CF', desc: 'cuota fija del rango' }, { symbol: 'LI', desc: 'límite inferior del rango' }, { symbol: '%t', desc: 'tasa marginal del rango' }],
      source: 'SAT 2026',          note: '10 rangos de ingresos + subsidio al empleo' },
    { name: 'IMSS Obrero',        formula: 'IMSS = Bruto × 1.75% + max(0, Bruto − 3×UMA_mes) × 0.40%',
      vars: [{ symbol: 'UMA_mes', desc: '≈ $3,300/mes (UMA 2026 diaria × 30.4)' }],
      source: 'IMSS 2026',          note: 'IV + CV (1.75%) + EM excedente (0.40%)' },
    { name: 'Neto a Pagar',       formula: 'Neto = Bruto − ISR − IMSS − Faltas',
      vars: [{ symbol: 'Faltas', desc: '1 salario diario por falta injustificada' }] },
  ],

  cotizacion: [
    { name: 'Subtotal',           formula: 'Sub = Costo_Mat + Costo_MO' },
    { name: 'Overhead',           formula: 'OH = Sub × %Overhead',
      vars: [{ symbol: '%Overhead', desc: 'default 15% — ajustable por proyecto' }],
      note: 'Incluye gastos indirectos: renta, energía, administración' },
    { name: 'Costo Total',        formula: 'CT = Sub + OH' },
    { name: 'Precio Sugerido',    formula: 'P = CT ÷ (1 − %Margen)',
      vars: [{ symbol: '%Margen', desc: 'margen de utilidad deseado (ej. 30%)' }],
      note: 'Método mark-up inverso — garantiza el % sobre precio de venta' },
    { name: 'Utilidad Bruta',     formula: 'UB = P − CT' },
    { name: '% Utilidad Real',    formula: '%U = UB / P × 100%' },
  ],

  metalQuoter: [
    { name: 'Peso del blank',     formula: 'W = Vol_cm³ × ρ / 1000',
      vars: [{ symbol: 'ρ', desc: 'densidad del material (g/cm³). Acero ≈ 7.85, Alum ≈ 2.70, Inox ≈ 8.00' }],
      note: 'Gemini extrae dimensiones del plano técnico' },
    { name: 'Costo Material',     formula: 'CM = W_kg × Precio_kg',
      note: 'Precio_kg estimado por IA según material detectado' },
    { name: 'Costo Máquina',      formula: 'CK = T_min × Tarifa_hr / 60',
      vars: [{ symbol: 'T_min', desc: 'tiempo de proceso estimado por IA' }] },
    { name: 'Costo Mano de Obra', formula: 'CMO = T_min × Tarifa_op / 60' },
    { name: 'Total',              formula: 'Total = CM + CK + CMO',
      note: 'Estimación automática — validar con ingeniero antes de cotizar' },
  ],

  inventario: [
    { name: 'Estado Stock',       formula: 'Crítico = (Actual = 0)\nBajo    = (0 < Actual ≤ Mín)\nÓptimo  = (Actual > Mín)' },
    { name: 'Cantidad Sugerida',  formula: 'QS = max(Mín × 3 − Actual, Mín)',
      note: 'Apunta a 3× el stock mínimo como colchón de seguridad' },
    { name: 'Urgencia OC',        formula: 'Crítico si Actual = 0\nBajo si 0 < Actual ≤ Mín' },
  ],

  finanzas: [
    { name: 'Posición Neta 30d',  formula: 'PN = Cobros_30d − Pagos_30d',
      note: 'Indica liquidez neta en los próximos 30 días' },
    { name: 'Aging Corriente',    formula: 'Vencimiento ≥ Hoy' },
    { name: 'Aging 1-30 días',    formula: '1 ≤ (Hoy − Venc) ≤ 30 días' },
    { name: 'Aging 31-60 días',   formula: '31 ≤ (Hoy − Venc) ≤ 60 días' },
    { name: 'Aging 61-90 días',   formula: '61 ≤ (Hoy − Venc) ≤ 90 días' },
    { name: 'Aging +90 días',     formula: '(Hoy − Venc) > 90 días',
      note: 'Riesgo alto de incobrabilidad — revisar acción legal' },
  ],

  produccion: [
    { name: 'OEE Global',         formula: 'OEE = D × R × Q × 100%',
      source: 'ISO 22400',         note: 'World-class ≥ 85%' },
    { name: 'Disponibilidad',     formula: 'D = T_Productivo / T_Planificado',
      vars: [{ symbol: 'T_Productivo', desc: 'tiempo real sin paros' }, { symbol: 'T_Planificado', desc: 'turno programado' }] },
    { name: 'Rendimiento',        formula: 'R = (Piezas × T_Ciclo_Ideal) / T_Productivo' },
    { name: 'Calidad',            formula: 'Q = Piezas_Buenas / Total_Piezas' },
    { name: 'Bono OEE activa',    formula: 'OEE ≥ 85% → +5% sobre salario bruto',
      source: 'Política interna' },
  ],

  calidad: [
    { name: 'Tasa de Aprobación', formula: 'TA = Passed / Total × 100%' },
    { name: 'NC Crítica (IA)',     formula: 'Confianza_IA ≥ 85%',
      note: 'Genera NC Crítica automáticamente al guardar inspección IA' },
    { name: 'NC Mayor (IA)',       formula: '60% ≤ Confianza_IA < 85%' },
    { name: 'NC Menor (IA)',       formula: 'Confianza_IA < 60%' },
    { name: 'SPC — UCL/LCL',      formula: 'UCL = X̄ + 3σ\nLCL = X̄ − 3σ',
      source: 'AIAG MSA',          note: 'Basado en ±3 sigma (99.73% de cobertura)' },
    { name: 'Cp (capacidad)',      formula: 'Cp = (USL − LSL) / (6σ)',
      note: 'Cp ≥ 1.33 = proceso capaz' },
    { name: 'Cpk (centrado)',      formula: 'Cpk = min[(USL−X̄)/3σ, (X̄−LSL)/3σ]',
      note: 'Cpk ≥ 1.33 = proceso capaz y centrado' },
  ],

  mantenimiento: [
    { name: 'Health Score',        formula: 'HS = valor directo [0-100]',
      note: 'Alimentado por sensor IoT o captura manual del operador' },
    { name: 'Estado por HS',       formula: 'HS > 70  → Operacional\n40 ≤ HS ≤ 70 → Advertencia\nHS < 40  → Requiere Mtto' },
    { name: 'Días a Próximo Mtto', formula: 'Δ = Fecha_Próx_Mtto − Hoy',
      note: 'Alerta en rojo si Δ < 7 días' },
  ],
} as const;
