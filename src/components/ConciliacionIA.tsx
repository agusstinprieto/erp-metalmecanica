import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitMerge, Upload, CheckCircle2, AlertCircle, XCircle,
  ChevronDown, ChevronRight, Brain, Sparkles, FileText,
  ArrowRight, RotateCcw, Lock, Download, Info,
} from 'lucide-react';
import clsx from 'clsx';
import { aiService } from '../services/aiService';
import type { BankAccount, BankTx } from './BancoView';

/* ─── Types ─── */
interface BankLine {
  id: string;
  fecha: string;
  descripcion: string;
  monto: number;       // positive = ingreso, negative = egreso
  referencia?: string;
}

type MatchStatus = 'auto' | 'sugerido' | 'sin_match_banco' | 'sin_match_erp' | 'aprobado' | 'rechazado';

interface MatchResult {
  id: string;
  bankLine: BankLine | null;
  erpTx: BankTx | null;
  confidence: number;
  razon: string;
  status: MatchStatus;
}

interface ConciliacionIAProps {
  accounts: BankAccount[];
  txs: BankTx[];
  onMarkConciliado: (ids: string[]) => Promise<void>;
}

const fmt = (n: number) => Math.abs(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
const fmtDate = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });

/* ─── CSV Parser ─── */
function parseCSV(raw: string): BankLine[] {
  const lines = raw.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const sep = [';', ',', '\t'].find(s => lines[0].split(s).length > 2) ?? ',';
  const rows = lines.map(l => l.split(sep).map(c => c.replace(/^"|"$/g, '').trim()));
  const header = rows[0].map(h => h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));

  const idx = (keys: string[]) => keys.reduce((found, k) => found !== -1 ? found : header.findIndex(h => h.includes(k)), -1);

  const fechaIdx   = idx(['fecha', 'date', 'fec']);
  const descIdx    = idx(['descripcion', 'concepto', 'detalle', 'desc', 'operacion', 'movimiento']);
  const montoIdx   = idx(['monto', 'importe', 'amount', 'valor']);
  const cargoIdx   = idx(['cargo', 'retiro', 'debito', 'egreso']);
  const abonoIdx   = idx(['abono', 'deposito', 'credito', 'ingreso']);
  const refIdx     = idx(['referencia', 'ref', 'folio', 'num']);

  const results: BankLine[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every(c => !c)) continue;

    const fechaRaw = fechaIdx !== -1 ? r[fechaIdx] : '';
    const desc     = descIdx  !== -1 ? r[descIdx]  : r[1] ?? '';
    const ref      = refIdx   !== -1 ? r[refIdx]   : undefined;

    let monto = 0;
    if (montoIdx !== -1) {
      monto = parseFloat(r[montoIdx].replace(/[$,\s]/g, '').replace(',', '.')) || 0;
    } else if (cargoIdx !== -1 || abonoIdx !== -1) {
      const cargo  = cargoIdx  !== -1 ? parseFloat(r[cargoIdx].replace(/[$,\s]/g, '') || '0') || 0 : 0;
      const abono  = abonoIdx  !== -1 ? parseFloat(r[abonoIdx].replace(/[$,\s]/g, '') || '0') || 0 : 0;
      monto = abono > 0 ? abono : -cargo;
    } else {
      monto = parseFloat(r[2]?.replace(/[$,\s]/g, '') || '0') || 0;
    }

    if (!monto || !desc) continue;

    // Normalize date to YYYY-MM-DD
    let fecha = fechaRaw;
    const m = fechaRaw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (m) {
      const [, d, mo, y] = m;
      const year = y.length === 2 ? `20${y}` : y;
      fecha = `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    results.push({ id: `b${i}`, fecha, descripcion: desc, monto, referencia: ref });
  }

  return results;
}

/* ─── Local scoring ─── */
function scoreMatch(bank: BankLine, erp: BankTx): number {
  const bankAmt = Math.abs(bank.monto);
  const erpAmt  = erp.monto;
  const bankIsIngreso = bank.monto > 0;
  const erpIsIngreso  = erp.tipo === 'ingreso';

  if (bankIsIngreso !== erpIsIngreso) return 0;

  const amtDiff = Math.abs(bankAmt - erpAmt) / Math.max(erpAmt, 1);
  let score = 0;
  if (amtDiff === 0)      score += 50;
  else if (amtDiff < 0.01) score += 42;
  else if (amtDiff < 0.05) score += 25;
  else return 0;

  const bankD = new Date(bank.fecha + 'T12:00:00').getTime();
  const erpD  = new Date(erp.fecha  + 'T12:00:00').getTime();
  const days  = Math.abs((bankD - erpD) / 86_400_000);
  if (days === 0)     score += 30;
  else if (days <= 1) score += 22;
  else if (days <= 3) score += 12;
  else if (days <= 7) score += 4;

  if (bank.referencia && erp.referencia &&
      bank.referencia.toLowerCase().includes(erp.referencia.toLowerCase())) score += 12;

  const bDesc = bank.descripcion.toLowerCase();
  const eDesc = erp.concepto.toLowerCase();
  const words = eDesc.split(/\s+/).filter(w => w.length > 3);
  const hits  = words.filter(w => bDesc.includes(w)).length;
  score += Math.min(hits * 4, 8);

  return Math.min(score, 100);
}

function runLocalMatch(bankLines: BankLine[], erpTxs: BankTx[]): {
  results: MatchResult[];
  unmatchedBank: BankLine[];
  unmatchedERP: BankTx[];
} {
  const usedErp = new Set<string>();
  const results: MatchResult[] = [];
  const unmatchedBank: BankLine[] = [];

  for (const bank of bankLines) {
    let best: BankTx | null = null;
    let bestScore = 0;

    for (const erp of erpTxs) {
      if (usedErp.has(erp.id!)) continue;
      const s = scoreMatch(bank, erp);
      if (s > bestScore) { bestScore = s; best = erp; }
    }

    if (best && bestScore >= 90) {
      usedErp.add(best.id!);
      results.push({ id: `m-${bank.id}`, bankLine: bank, erpTx: best, confidence: bestScore, razon: 'Monto exacto + fecha coincide', status: 'auto' });
    } else if (best && bestScore >= 55) {
      results.push({ id: `m-${bank.id}`, bankLine: bank, erpTx: best, confidence: bestScore, razon: 'Match parcial — requiere revisión', status: 'sugerido' });
    } else {
      unmatchedBank.push(bank);
    }
  }

  const unmatchedERP = erpTxs.filter(t => !usedErp.has(t.id!) && !t.conciliado);
  return { results, unmatchedBank, unmatchedERP };
}

/* ─── AI call for uncertain items ─── */
async function callAIMatch(
  unmatchedBank: BankLine[],
  unmatchedERP: BankTx[],
  partialResults: MatchResult[]
): Promise<MatchResult[]> {
  if (!unmatchedBank.length && !partialResults.filter(r => r.status === 'sugerido').length) return [];

  const SYSTEM = `Eres un agente contable especializado en conciliación bancaria para empresas metalmecánicas mexicanas.
Tu tarea es emparejar movimientos del estado de cuenta bancario con movimientos registrados en el ERP.
Responde ÚNICAMENTE con JSON válido, sin markdown, sin explicaciones fuera del JSON.`;

  const toReview = [
    ...unmatchedBank.map(b => ({ tipo: 'banco_sin_match', id: b.id, fecha: b.fecha, monto: b.monto, descripcion: b.descripcion, ref: b.referencia })),
    ...partialResults.filter(r => r.status === 'sugerido').map(r => ({
      tipo: 'match_incierto',
      bank_id: r.bankLine?.id,
      erp_id: r.erpTx?.id,
      confidence_actual: r.confidence,
      bank: { fecha: r.bankLine?.fecha, monto: r.bankLine?.monto, desc: r.bankLine?.descripcion },
      erp:  { fecha: r.erpTx?.fecha,  monto: r.erpTx?.monto,  concepto: r.erpTx?.concepto, ref: r.erpTx?.referencia }
    })),
  ];

  const prompt = `Analiza estos movimientos del banco sin match o con match incierto:
${JSON.stringify(toReview, null, 2)}

Movimientos ERP disponibles (no conciliados):
${JSON.stringify(unmatchedERP.slice(0, 40).map(e => ({ id: e.id, fecha: e.fecha, monto: e.monto, tipo: e.tipo, concepto: e.concepto, ref: e.referencia })), null, 2)}

Para cada item, determina el mejor match posible del ERP, o indica sin_match.
Responde con este JSON exacto:
[
  {
    "bank_id": "b1",
    "erp_id": "uuid-o-null",
    "confidence": 85,
    "razon": "Explicación breve en español",
    "accion": "auto|sugerido|sin_match"
  }
]`;

  try {
    const raw = await aiService.askGemini(prompt, undefined, [], SYSTEM);
    const clean = raw.replace(/```json|```/g, '').trim();
    const aiMatches: { bank_id: string; erp_id: string | null; confidence: number; razon: string; accion: string }[] = JSON.parse(clean);

    const aiResults: MatchResult[] = [];
    for (const ai of aiMatches) {
      const bank = unmatchedBank.find(b => b.id === ai.bank_id)
        ?? partialResults.find(r => r.bankLine?.id === ai.bank_id)?.bankLine
        ?? null;
      const erp = ai.erp_id ? unmatchedERP.find(e => e.id === ai.erp_id) ?? null : null;

      if (!bank) continue;
      aiResults.push({
        id: `ai-${ai.bank_id}`,
        bankLine: bank,
        erpTx: erp,
        confidence: ai.confidence,
        razon: ai.razon,
        status: erp ? (ai.accion === 'auto' ? 'auto' : 'sugerido') : 'sin_match_banco',
      });
    }
    return aiResults;
  } catch {
    return unmatchedBank.map(b => ({
      id: `ai-${b.id}`, bankLine: b, erpTx: null,
      confidence: 0, razon: 'Sin match encontrado', status: 'sin_match_banco' as MatchStatus,
    }));
  }
}

/* ─── MatchCard ─── */
const CONF_COLOR = (c: number) => c >= 90 ? 'text-emerald-400' : c >= 70 ? 'text-amber-400' : 'text-rose-400';
const CONF_BG    = (c: number) => c >= 90 ? 'bg-emerald-500/10 border-emerald-500/20' : c >= 70 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-rose-500/10 border-rose-500/20';

const MatchCard = ({
  match, onApprove, onReject, expanded, onToggle,
}: {
  match: MatchResult;
  onApprove?: () => void;
  onReject?: () => void;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const isApproved  = match.status === 'aprobado' || match.status === 'auto';
  const isRejected  = match.status === 'rechazado';
  const noMatch     = match.status === 'sin_match_banco' || match.status === 'sin_match_erp';

  return (
    <div className={clsx('rounded-xl border transition-all overflow-hidden',
      isApproved  ? 'border-emerald-500/20 bg-emerald-500/5'  :
      isRejected  ? 'border-white/5 bg-slate-900/20 opacity-40' :
      noMatch     ? 'border-rose-500/20 bg-rose-500/5'         :
      'border-amber-500/20 bg-amber-500/5'
    )}>
      <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none" onClick={onToggle}>
        {/* Status icon */}
        <div className="shrink-0">
          {isApproved ? <CheckCircle2 size={14} className="text-emerald-400" /> :
           isRejected ? <XCircle      size={14} className="text-slate-500"   /> :
           noMatch    ? <AlertCircle  size={14} className="text-rose-400"    /> :
                        <Brain        size={14} className="text-amber-400"   />}
        </div>

        {/* Bank line */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black text-white truncate max-w-[160px]">{match.bankLine?.descripcion ?? '—'}</span>
            <span className={clsx('text-[9px] font-black', match.bankLine && match.bankLine.monto > 0 ? 'text-emerald-400' : 'text-rose-400')}>
              {match.bankLine ? `${match.bankLine.monto > 0 ? '+' : '-'}${fmt(match.bankLine.monto)}` : '—'}
            </span>
            <span className="text-[8px] text-slate-500">{match.bankLine ? fmtDate(match.bankLine.fecha) : ''}</span>
          </div>
          {match.erpTx && (
            <div className="flex items-center gap-1 mt-0.5">
              <ArrowRight size={9} className="text-slate-600 shrink-0" />
              <span className="text-[9px] text-slate-400 truncate">{match.erpTx.concepto}</span>
              <span className="text-[8px] text-slate-500">{fmtDate(match.erpTx.fecha)}</span>
            </div>
          )}
        </div>

        {/* Confidence + actions */}
        <div className="flex items-center gap-2 shrink-0">
          {!noMatch && match.erpTx && (
            <span className={clsx('text-[8px] font-black px-1.5 py-0.5 rounded-lg border', CONF_BG(match.confidence))}>
              <span className={CONF_COLOR(match.confidence)}>{match.confidence}%</span>
            </span>
          )}
          {match.status === 'sugerido' && (
            <>
              <button onClick={e => { e.stopPropagation(); onApprove?.(); }}
                className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                <CheckCircle2 size={12} />
              </button>
              <button onClick={e => { e.stopPropagation(); onReject?.(); }}
                className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all">
                <XCircle size={12} />
              </button>
            </>
          )}
          {expanded ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 pt-1 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {match.bankLine && (
                <div className="bg-black/20 rounded-lg p-2.5 space-y-1">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Estado de cuenta banco</p>
                  <p className="text-[10px] text-white font-bold">{match.bankLine.descripcion}</p>
                  <div className="flex gap-3">
                    <span className="text-[9px] text-slate-400">{fmtDate(match.bankLine.fecha)}</span>
                    {match.bankLine.referencia && <span className="text-[9px] text-slate-500 font-mono">Ref: {match.bankLine.referencia}</span>}
                  </div>
                  <p className={clsx('text-base font-black', match.bankLine.monto > 0 ? 'text-emerald-400' : 'text-rose-400')}>
                    {match.bankLine.monto > 0 ? '+' : '-'}{fmt(match.bankLine.monto)}
                  </p>
                </div>
              )}
              {match.erpTx && (
                <div className="bg-black/20 rounded-lg p-2.5 space-y-1">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Movimiento ERP</p>
                  <p className="text-[10px] text-white font-bold">{match.erpTx.concepto}</p>
                  <div className="flex gap-3">
                    <span className="text-[9px] text-slate-400">{fmtDate(match.erpTx.fecha)}</span>
                    {match.erpTx.referencia && <span className="text-[9px] text-slate-500 font-mono">Ref: {match.erpTx.referencia}</span>}
                  </div>
                  <p className={clsx('text-base font-black', match.erpTx.tipo === 'ingreso' ? 'text-emerald-400' : 'text-rose-400')}>
                    {match.erpTx.tipo === 'ingreso' ? '+' : '-'}{fmt(match.erpTx.monto)}
                  </p>
                </div>
              )}
              <div className="sm:col-span-2 flex items-start gap-2 bg-blue-500/5 border border-blue-500/10 rounded-lg px-3 py-2">
                <Info size={11} className="text-blue-400 mt-0.5 shrink-0" />
                <p className="text-[9px] text-blue-300">{match.razon}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Main Component ─── */
const ConciliacionIA: React.FC<ConciliacionIAProps> = ({ accounts, txs, onMarkConciliado }) => {
  const [step, setStep]             = useState<'import' | 'analyzing' | 'review' | 'done'>('import');
  const [csvText, setCsvText]       = useState('');
  const [bankLines, setBankLines]   = useState<BankLine[]>([]);
  const [matches, setMatches]       = useState<MatchResult[]>([]);
  const [selectedAccId, setSelectedAccId] = useState('');
  const [saldoExtracto, setSaldoExtracto] = useState('');
  const [periodo, setPeriodo]       = useState(() => new Date().toISOString().slice(0, 7));
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [aiProgress, setAiProgress] = useState('');
  const [saving, setSaving]         = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const erpTxsForAccount = txs.filter(t =>
    (!selectedAccId || t.account_id === selectedAccId) && !t.conciliado
  );

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => setCsvText(e.target?.result as string ?? '');
    reader.readAsText(file, 'utf-8');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleRun = async () => {
    const lines = parseCSV(csvText);
    if (!lines.length) return;
    setBankLines(lines);
    setStep('analyzing');

    // Step 1: local match
    setAiProgress('Ejecutando matching local por monto y fecha…');
    await new Promise(r => setTimeout(r, 600));

    const { results, unmatchedBank, unmatchedERP } = runLocalMatch(lines, erpTxsForAccount);

    setAiProgress(`${results.filter(r => r.status === 'auto').length} matches exactos. Enviando ${unmatchedBank.length + results.filter(r => r.status === 'sugerido').length} items dudosos a la IA…`);
    await new Promise(r => setTimeout(r, 400));

    // Step 2: AI for uncertain
    const aiResults = await callAIMatch(unmatchedBank, unmatchedERP, results);

    // Merge: replace 'sugerido' with AI-enriched version, add new AI results
    const finalResults: MatchResult[] = [
      ...results.filter(r => r.status === 'auto'),
      ...results.filter(r => r.status === 'sugerido').map(r => {
        const ai = aiResults.find(a => a.bankLine?.id === r.bankLine?.id);
        return ai ? { ...r, razon: ai.razon, confidence: ai.confidence, status: ai.status } : r;
      }),
      ...aiResults.filter(a => !results.some(r => r.bankLine?.id === a.bankLine?.id)),
      ...unmatchedERP.map((e): MatchResult => ({
        id: `erp-${e.id}`, bankLine: null, erpTx: e,
        confidence: 0, razon: 'Sin movimiento bancario correspondiente', status: 'sin_match_erp',
      })),
    ];

    setMatches(finalResults);
    setStep('review');
  };

  const updateMatch = (id: string, status: MatchStatus) =>
    setMatches(prev => prev.map(m => m.id === id ? { ...m, status } : m));

  const handleClose = async () => {
    setSaving(true);
    const approved = matches.filter(m => m.status === 'auto' || m.status === 'aprobado');
    const ids = approved.map(m => m.erpTx?.id).filter(Boolean) as string[];
    await onMarkConciliado(ids);
    setSaving(false);
    setStep('done');
  };

  const handleReset = () => {
    setCsvText(''); setBankLines([]); setMatches([]); setStep('import'); setAiProgress('');
  };

  /* ── Stats ── */
  const autoCount     = matches.filter(m => m.status === 'auto').length;
  const approvedCount = matches.filter(m => m.status === 'aprobado').length;
  const reviewCount   = matches.filter(m => m.status === 'sugerido').length;
  const noMatchBank   = matches.filter(m => m.status === 'sin_match_banco').length;
  const noMatchERP    = matches.filter(m => m.status === 'sin_match_erp').length;
  const totalConciled = autoCount + approvedCount;

  const saldoERP = erpTxsForAccount.reduce((s, t) =>
    s + (t.tipo === 'ingreso' ? t.monto : -t.monto), 0);
  const saldoBanco = parseFloat(saldoExtracto) || 0;
  const diferencia = saldoBanco - saldoERP;

  return (
    <div className="flex flex-col h-full bg-[#060b18] text-white">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-white/5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <GitMerge size={16} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-[12px] font-black text-white uppercase tracking-widest">Conciliación IA</h2>
            <p className="text-[8px] text-slate-500">Matching automático + revisión inteligente</p>
          </div>
        </div>
        {step !== 'import' && (
          <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white text-[9px] font-black uppercase transition-all">
            <RotateCcw size={11} /> Nueva conciliación
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">

          {/* ── STEP: IMPORT ── */}
          {step === 'import' && (
            <motion.div key="import" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 space-y-4">

              {/* Config row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Cuenta bancaria</label>
                  <select value={selectedAccId} onChange={e => setSelectedAccId(e.target.value)} className="cyber-select w-full">
                    <option value="">Todas las cuentas</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.nombre} — {a.banco}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Período</label>
                  <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} className="cyber-input w-full" />
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Saldo extracto bancario</label>
                  <input type="number" placeholder="0.00" value={saldoExtracto} onChange={e => setSaldoExtracto(e.target.value)} className="cyber-input w-full font-mono text-emerald-400" />
                </div>
              </div>

              {/* ERP preview */}
              <div className="flex items-center gap-3 bg-blue-500/5 border border-blue-500/15 rounded-xl px-4 py-2.5">
                <Info size={13} className="text-blue-400 shrink-0" />
                <div>
                  <p className="text-[9px] text-blue-300 font-bold">
                    {erpTxsForAccount.length} movimientos ERP sin conciliar{selectedAccId ? ` en la cuenta seleccionada` : ''}.
                    Saldo ERP acumulado: <span className={diferencia !== 0 && saldoExtracto ? 'text-amber-400' : 'text-emerald-400'}>{saldoERP.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</span>
                  </p>
                </div>
              </div>

              {/* CSV drop zone */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Estado de cuenta (CSV)</label>
                  <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 text-[8px] text-mcvill-accent font-black uppercase tracking-widest hover:opacity-80 transition-opacity">
                    <Upload size={10} /> Subir archivo
                  </button>
                  <input ref={fileRef} type="file" accept=".csv,.txt,.xls,.xlsx" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
                </div>
                <div
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  className={clsx(
                    'rounded-xl border-2 border-dashed transition-all min-h-[120px] flex flex-col',
                    csvText ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 hover:border-mcvill-accent/30 bg-white/[0.02]'
                  )}>
                  {csvText ? (
                    <div className="flex-1 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] text-emerald-400 font-black uppercase">{parseCSV(csvText).length} líneas detectadas</span>
                        <button onClick={() => setCsvText('')} className="text-[8px] text-slate-500 hover:text-rose-400 transition-colors">Limpiar</button>
                      </div>
                      <pre className="text-[8px] text-slate-500 overflow-x-auto max-h-[80px] font-mono leading-relaxed">
                        {csvText.split('\n').slice(0, 5).join('\n')}
                        {csvText.split('\n').length > 5 && '\n...'}
                      </pre>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4">
                      <FileText size={24} className="text-slate-600" />
                      <p className="text-[9px] text-slate-500 text-center font-bold">Arrastra el CSV del banco aquí o pega el contenido abajo</p>
                      <p className="text-[8px] text-slate-600 text-center">Formatos: BBVA · Banorte · HSBC · Santander · Genérico</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Paste area */}
              {!csvText && (
                <textarea
                  rows={4}
                  placeholder={'Fecha;Descripcion;Cargo;Abono\n12/05/2026;PAGO PROVEEDOR ACERO;;15000.00\n13/05/2026;NOMINA QUINCENAL;45000.00;'}
                  onChange={e => setCsvText(e.target.value)}
                  className="w-full cyber-input resize-none font-mono text-[9px] text-slate-400 placeholder:text-slate-700"
                />
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleRun}
                  disabled={!csvText.trim() || !erpTxsForAccount.length}
                  className="btn-ia flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-[10px] uppercase tracking-widest transition-all">
                  <Sparkles size={14} /> Conciliar con IA
                </button>
                <p className="text-[8px] text-slate-600">
                  El AI revisará {erpTxsForAccount.length} movimiento{erpTxsForAccount.length !== 1 ? 's' : ''} del ERP
                </p>
              </div>
            </motion.div>
          )}

          {/* ── STEP: ANALYZING ── */}
          {step === 'analyzing' && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-6 py-24 px-8">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Brain size={28} className="text-emerald-400" />
                </div>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute -inset-1 rounded-2xl border-2 border-transparent border-t-emerald-400 border-r-emerald-400/30" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-black text-white uppercase tracking-widest">Analizando con IA</p>
                <motion.p key={aiProgress} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] text-emerald-400 font-bold max-w-xs text-center">
                  {aiProgress || 'Iniciando análisis…'}
                </motion.p>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── STEP: REVIEW ── */}
          {step === 'review' && (
            <motion.div key="review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 space-y-4">

              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Auto-conciliados', value: autoCount,     color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                  { label: 'Aprobados',         value: approvedCount, color: 'text-sky-400',     bg: 'bg-sky-500/10 border-sky-500/20'         },
                  { label: 'Revisión pendiente',value: reviewCount,   color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20'      },
                  { label: 'Sin match',          value: noMatchBank + noMatchERP, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
                ].map((k, i) => (
                  <div key={i} className={clsx('rounded-xl border px-3 py-2', k.bg)}>
                    <p className="text-[8px] text-slate-500 uppercase tracking-widest">{k.label}</p>
                    <p className={clsx('text-xl font-black', k.color)}>{k.value}</p>
                  </div>
                ))}
              </div>

              {/* Diferencia saldo */}
              {saldoExtracto && (
                <div className={clsx('flex items-center gap-3 rounded-xl px-4 py-2.5 border',
                  Math.abs(diferencia) < 0.01 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20')}>
                  <div className={clsx(Math.abs(diferencia) < 0.01 ? 'text-emerald-400' : 'text-amber-400')}>
                    {Math.abs(diferencia) < 0.01 ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-white">
                      {Math.abs(diferencia) < 0.01 ? 'Saldos cuadrados' : `Diferencia: ${diferencia > 0 ? '+' : ''}${fmt(diferencia)}`}
                    </p>
                    <p className="text-[8px] text-slate-400">
                      Banco: {fmt(saldoBanco)} · ERP: {fmt(saldoERP)}
                    </p>
                  </div>
                </div>
              )}

              {/* Auto-matched (collapsed) */}
              {autoCount > 0 && (
                <details className="group">
                  <summary className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/15 cursor-pointer list-none">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex-1">
                      {autoCount} Auto-conciliados (confianza ≥ 90%)
                    </span>
                    <ChevronDown size={12} className="text-slate-500 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="mt-2 space-y-1.5 pl-2">
                    {matches.filter(m => m.status === 'auto').map(m => (
                      <MatchCard key={m.id} match={m} expanded={expanded === m.id} onToggle={() => setExpanded(expanded === m.id ? null : m.id)} />
                    ))}
                  </div>
                </details>
              )}

              {/* Needs review */}
              {reviewCount > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Brain size={13} className="text-amber-400" />
                    <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">{reviewCount} sugerencias IA — requieren aprobación</p>
                  </div>
                  <div className="space-y-1.5">
                    {matches.filter(m => m.status === 'sugerido').map(m => (
                      <MatchCard
                        key={m.id} match={m}
                        onApprove={() => updateMatch(m.id, 'aprobado')}
                        onReject={() => updateMatch(m.id, 'rechazado')}
                        expanded={expanded === m.id}
                        onToggle={() => setExpanded(expanded === m.id ? null : m.id)}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setMatches(p => p.map(m => m.status === 'sugerido' ? { ...m, status: 'aprobado' } : m))}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase hover:bg-emerald-500/20 transition-all">
                      <CheckCircle2 size={10} /> Aprobar todos
                    </button>
                    <button onClick={() => setMatches(p => p.map(m => m.status === 'sugerido' ? { ...m, status: 'rechazado' } : m))}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[8px] font-black uppercase hover:bg-rose-500/20 transition-all">
                      <XCircle size={10} /> Rechazar todos
                    </button>
                  </div>
                </div>
              )}

              {/* No match bank */}
              {noMatchBank > 0 && (
                <details>
                  <summary className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/5 border border-rose-500/15 cursor-pointer list-none">
                    <AlertCircle size={13} className="text-rose-400" />
                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest flex-1">
                      {noMatchBank} en banco sin registro en ERP
                    </span>
                    <ChevronDown size={12} className="text-slate-500" />
                  </summary>
                  <div className="mt-2 space-y-1.5 pl-2">
                    {matches.filter(m => m.status === 'sin_match_banco').map(m => (
                      <MatchCard key={m.id} match={m} expanded={expanded === m.id} onToggle={() => setExpanded(expanded === m.id ? null : m.id)} />
                    ))}
                  </div>
                </details>
              )}

              {/* No match ERP */}
              {noMatchERP > 0 && (
                <details>
                  <summary className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/5 border border-rose-500/15 cursor-pointer list-none">
                    <AlertCircle size={13} className="text-rose-400" />
                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest flex-1">
                      {noMatchERP} en ERP sin movimiento bancario
                    </span>
                    <ChevronDown size={12} className="text-slate-500" />
                  </summary>
                  <div className="mt-2 space-y-1.5 pl-2">
                    {matches.filter(m => m.status === 'sin_match_erp').map(m => (
                      <MatchCard key={m.id} match={m} expanded={expanded === m.id} onToggle={() => setExpanded(expanded === m.id ? null : m.id)} />
                    ))}
                  </div>
                </details>
              )}

              {/* Close button */}
              <div className="sticky bottom-0 bg-[#060b18] pt-3 pb-2 border-t border-white/5">
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={handleClose}
                    disabled={saving || totalConciled === 0}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-[10px] uppercase tracking-widest transition-all">
                    {saving
                      ? <><Brain size={13} className="animate-pulse" /> Guardando…</>
                      : <><Lock size={13} /> Cerrar período · {totalConciled} movimientos</>}
                  </button>
                  <p className="text-[8px] text-slate-500">
                    Se marcarán {totalConciled} movimientos como conciliados en la base de datos.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP: DONE ── */}
          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-6 py-24 px-8 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10, stiffness: 200 }}>
                <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 size={36} className="text-emerald-400" />
                </div>
              </motion.div>
              <div>
                <p className="text-xl font-black text-white uppercase tracking-widest">Período Conciliado</p>
                <p className="text-[10px] text-emerald-400 font-bold mt-1">{totalConciled} movimientos marcados como conciliados · {periodo}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white text-[9px] font-black uppercase transition-all">
                  <RotateCcw size={12} /> Nueva conciliación
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase hover:bg-emerald-600/30 transition-all">
                  <Download size={12} /> Descargar reporte
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default ConciliacionIA;
