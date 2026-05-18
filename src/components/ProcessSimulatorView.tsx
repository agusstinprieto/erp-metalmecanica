import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, Play, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface SimParam {
  id: string;
  label: string;
  min: number;
  max: number;
  value: number;
  unit: string;
  step: number;
}

interface SimResult {
  throughput: number;
  cycleTime: number;
  wip: number;
  utilizacion: number;
  pctDefectos: number;
  distribucion: { tiempo: number; frecuencia: number }[];
  iteraciones: number;
}

const ESCENARIOS = [
  { label: 'Actual', params: [3, 12, 8, 95, 3.2] },
  { label: '+1 Estación CNC', params: [4, 12, 8, 95, 3.2] },
  { label: 'Turno nocturno', params: [3, 20, 8, 95, 3.2] },
  { label: 'Material premium', params: [3, 12, 8, 95, 1.5] },
];

function monteCarlo(params: SimParam[], iterations = 1000): SimResult {
  const [estaciones, horasTurno, cicloBase, disponibilidad, pctDef] = params.map(p => p.value);
  const results: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const variabilidad = 0.85 + Math.random() * 0.30;
    const dispReal = (disponibilidad / 100) * (0.90 + Math.random() * 0.15);
    const cicloReal = cicloBase * variabilidad;
    const tiempoDisponible = horasTurno * 60 * dispReal;
    const piezas = Math.floor((tiempoDisponible / cicloReal) * estaciones);
    results.push(piezas);
  }

  results.sort((a, b) => a - b);
  const mean = results.reduce((s, v) => s + v, 0) / results.length;
  const minR = results[Math.floor(results.length * 0.1)];
  const maxR = results[Math.floor(results.length * 0.9)];

  const buckets = 12;
  const bSize = (maxR - minR) / buckets;
  const dist = Array.from({ length: buckets }, (_, i) => ({
    tiempo: Math.round(minR + bSize * i),
    frecuencia: results.filter(r => r >= minR + bSize * i && r < minR + bSize * (i + 1)).length,
  }));

  return {
    throughput: Math.round(mean),
    cycleTime: Math.round(params[2].value * 10) / 10,
    wip: Math.round(params[0].value * params[2].value / 60 * 10) / 10,
    utilizacion: Math.round(params[3].value * 0.92 * 10) / 10,
    pctDefectos: params[4].value,
    distribucion: dist,
    iteraciones: iterations,
  };
}

const panel = 'bg-slate-900/40 border border-white/5 rounded-xl';

export const ProcessSimulatorView: React.FC = () => {
  const [params, setParams] = useState<SimParam[]>([
    { id: 'estaciones', label: 'Estaciones CNC activas', min: 1, max: 8, value: 3, unit: 'uds', step: 1 },
    { id: 'horas', label: 'Horas de turno', min: 6, max: 24, value: 12, unit: 'h', step: 1 },
    { id: 'ciclo', label: 'Tiempo de ciclo base', min: 3, max: 30, value: 8, unit: 'min', step: 0.5 },
    { id: 'disponibilidad', label: 'Disponibilidad de maquinaria', min: 60, max: 99, value: 95, unit: '%', step: 1 },
    { id: 'defectos', label: '% defectos estimado', min: 0.5, max: 10, value: 3.2, unit: '%', step: 0.1 },
  ]);
  const [result, setResult] = useState<SimResult | null>(null);
  const [baseline, setBaseline] = useState<SimResult | null>(null);
  const [running, setRunning] = useState(false);
  const [iterations, setIterations] = useState(500);

  const run = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const r = monteCarlo(params, iterations);
      if (!baseline) setBaseline(r);
      setResult(r);
      setRunning(false);
    }, 600);
  }, [params, iterations, baseline]);

  const reset = () => { setResult(null); setBaseline(null); };

  const loadEscenario = (idx: number) => {
    const vals = ESCENARIOS[idx].params;
    setParams(p => p.map((param, i) => ({ ...param, value: vals[i] })));
  };

  const delta = (key: keyof SimResult) => {
    if (!result || !baseline || result === baseline) return null;
    const r = result[key] as number;
    const b = baseline[key] as number;
    return b !== 0 ? ((r - b) / b) * 100 : 0;
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {/* Header */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center gap-4 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
          <FlaskConical size={16} className="text-purple-400" />
        </div>
        <div>
          <h1 className="text-sm font-black text-white uppercase tracking-[0.15em]">Simulación de Procesos</h1>
          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Monte Carlo — Análisis What-If</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select value={iterations} onChange={e => setIterations(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg bg-slate-800/60 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-purple-500/50">
            <option value={200}>200 iteraciones</option>
            <option value={500}>500 iteraciones</option>
            <option value={1000}>1,000 iteraciones</option>
          </select>
          <button onClick={reset} className="p-1.5 rounded-lg bg-slate-800 border border-white/10 text-slate-300 hover:border-white/20 transition-all">
            <RefreshCw size={13} />
          </button>
          <button onClick={run} disabled={running}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 font-bold text-xs hover:bg-purple-500/30 transition-all disabled:opacity-50">
            <Play size={13} className={running ? 'animate-spin' : ''} />
            {running ? 'Simulando...' : 'Simular'}
          </button>
        </div>
      </div>
      <div className="flex-1 flex gap-4 overflow-hidden p-4 min-h-0">
        {/* Controls */}
        <div className="w-64 shrink-0 flex flex-col gap-4 overflow-y-auto">
          <div>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Escenarios predefinidos</p>
            <div className="grid grid-cols-2 gap-2">
              {ESCENARIOS.map((e, i) => (
                <button key={i} onClick={() => loadEscenario(i)}
                  className="px-2 py-2 rounded-lg bg-slate-800/60 border border-white/5 text-[10px] text-slate-300 hover:border-purple-500/30 hover:text-purple-400 transition-all text-left">
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Parámetros</p>
            <div className="space-y-4">
              {params.map(p => (
                <div key={p.id}>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] text-slate-400">{p.label}</label>
                    <span className="text-sm font-black text-white">{p.value} <span className="text-[10px] text-slate-500">{p.unit}</span></span>
                  </div>
                  <input type="range" min={p.min} max={p.max} step={p.step} value={p.value}
                    onChange={e => setParams(prev => prev.map(pp => pp.id === p.id ? { ...pp, value: Number(e.target.value) } : pp))}
                    className="w-full h-1.5 rounded-full bg-slate-700 appearance-none cursor-pointer"
                    style={{ accentColor: 'var(--theme-accent)' }} />
                  <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
                    <span>{p.min}</span><span>{p.max}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
          {!result && (
            <div className={`flex-1 ${panel} flex flex-col items-center justify-center gap-3`}>
              <FlaskConical size={40} className="text-purple-400/20" />
              <p className="text-slate-400 text-sm">Configura los parámetros y presiona Simular</p>
            </div>
          )}

          {result && (
            <>
              <div className="grid grid-cols-4 gap-3 shrink-0">
                {[
                  { label: 'Throughput', value: result.throughput + ' pzs/turno', key: 'throughput', good: true },
                  { label: 'Tiempo de ciclo', value: result.cycleTime + ' min', key: 'cycleTime', good: false },
                  { label: 'Utilización', value: result.utilizacion + '%', key: 'utilizacion', good: true },
                  { label: '% Defectos', value: result.pctDefectos + '%', key: 'pctDefectos', good: false },
                ].map(({ label, value, key, good }) => {
                  const d = delta(key as keyof SimResult);
                  const improved = d !== null && ((good && d > 0) || (!good && d < 0));
                  return (
                    <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className={`${panel} p-3`}>
                      <p className="text-[9px] text-slate-500 uppercase mb-1">{label}</p>
                      <p className="text-lg font-black text-white">{value}</p>
                      {d !== null && d !== 0 && (
                        <p className={`text-[10px] font-bold mt-1 flex items-center gap-1 ${improved ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {improved ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {d > 0 ? '+' : ''}{d.toFixed(1)}% vs. base
                        </p>
                      )}
                      {d === 0 && <p className="text-[10px] text-slate-600 mt-1 flex items-center gap-1"><Minus size={9} /> Sin cambio</p>}
                    </motion.div>
                  );
                })}
              </div>

              <div className={`${panel} p-4 flex-1`}>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">
                  Distribución de throughput — {result.iteraciones} iteraciones Monte Carlo
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={result.distribucion} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="tiempo" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 10 }}
                      label={{ value: 'Piezas/turno', position: 'insideBottom', fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                    <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 11 }}
                      formatter={(v: number) => [v, 'Iteraciones']} />
                    <ReferenceLine x={result.throughput} stroke="var(--theme-accent)" strokeDasharray="4 4"
                      label={{ value: 'Media', fill: 'var(--theme-accent)', fontSize: 10 }} />
                    <Bar dataKey="frecuencia" fill="var(--theme-accent)" opacity={0.7} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-slate-500 mt-2 text-center">
                  P10: {result.distribucion[1]?.tiempo} pzs · Media: {result.throughput} pzs · P90: {result.distribucion[result.distribucion.length - 2]?.tiempo} pzs
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProcessSimulatorView;
