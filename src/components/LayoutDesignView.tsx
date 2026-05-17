import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Layout, MousePointer2, Info, RotateCcw, Save, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

type CellType = 'vacio' | 'cnc' | 'laser' | 'soldadura' | 'almacen' | 'calidad' | 'ensamble' | 'pasillo';

interface GridCell {
  id: string;
  tipo: CellType;
  etiqueta: string;
}

interface Maquina {
  tipo: CellType;
  etiqueta: string;
  color: string;
  bg: string;
}

const MAQUINAS: Maquina[] = [
  { tipo: 'cnc', etiqueta: 'CNC', color: 'text-cyan-400', bg: 'bg-cyan-500/20 border-cyan-500/30' },
  { tipo: 'laser', etiqueta: 'Láser', color: 'text-violet-400', bg: 'bg-violet-500/20 border-violet-500/30' },
  { tipo: 'soldadura', etiqueta: 'Solda', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/30' },
  { tipo: 'almacen', etiqueta: 'Almacén', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/30' },
  { tipo: 'calidad', etiqueta: 'Calidad', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30' },
  { tipo: 'ensamble', etiqueta: 'Ens.', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/30' },
  { tipo: 'pasillo', etiqueta: 'Pasillo', color: 'text-slate-500', bg: 'bg-slate-700/30 border-slate-600/30' },
  { tipo: 'vacio', etiqueta: 'Vacío', color: 'text-slate-600', bg: 'bg-transparent border-white/5' },
];

const cellConfig: Record<CellType, Maquina> = Object.fromEntries(MAQUINAS.map(m => [m.tipo, m])) as Record<CellType, Maquina>;

const getMachineLabel = (tipo: CellType, lang: 'es' | 'en'): string => {
  const labels: Record<CellType, { es: string; en: string }> = {
    cnc: { es: 'CNC', en: 'CNC' },
    laser: { es: 'Láser', en: 'Laser' },
    soldadura: { es: 'Solda', en: 'Weld' },
    almacen: { es: 'Almacén', en: 'Store' },
    calidad: { es: 'Calidad', en: 'Quality' },
    ensamble: { es: 'Ens.', en: 'Assembly' },
    pasillo: { es: 'Pasillo', en: 'Hallway' },
    vacio: { es: 'Vacío', en: 'Empty' },
  };
  return labels[tipo]?.[lang] || tipo;
};

function makeGrid(rows: number, cols: number): GridCell[][] {
  const layout: CellType[][] = [
    ['almacen','almacen','vacio','vacio','vacio','vacio','vacio','vacio','vacio','vacio'],
    ['almacen','almacen','pasillo','pasillo','pasillo','pasillo','pasillo','pasillo','pasillo','almacen'],
    ['vacio','vacio','cnc','cnc','vacio','laser','laser','vacio','calidad','almacen'],
    ['vacio','vacio','cnc','cnc','vacio','laser','laser','vacio','calidad','vacio'],
    ['vacio','pasillo','pasillo','pasillo','pasillo','pasillo','pasillo','pasillo','pasillo','vacio'],
    ['vacio','vacio','soldadura','soldadura','vacio','ensamble','ensamble','vacio','vacio','vacio'],
    ['vacio','vacio','soldadura','soldadura','vacio','ensamble','ensamble','vacio','vacio','vacio'],
    ['vacio','pasillo','pasillo','pasillo','pasillo','pasillo','pasillo','pasillo','pasillo','vacio'],
  ];
  return layout.slice(0, rows).map((row, r) =>
    row.slice(0, cols).map((tipo, c) => ({
      id: `${r}-${c}`,
      tipo: tipo as CellType,
      etiqueta: cellConfig[tipo as CellType]?.etiqueta || '',
    }))
  );
}

const ROWS = 8;
const COLS = 10;

const panel = 'bg-slate-900/40 border border-white/5 rounded-xl';

export const LayoutDesignView: React.FC = () => {
  const { language } = useLanguage();
  const [grid, setGrid] = useState<GridCell[][]>(makeGrid(ROWS, COLS));
  const [selectedTool, setSelectedTool] = useState<CellType>('cnc');
  const [painting, setPainting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Dynamic calculations for layout metrics based on grid stations
  const metrics = useMemo(() => {
    const counts: Record<CellType, number> = {
      vacio: 0,
      cnc: 0,
      laser: 0,
      soldadura: 0,
      almacen: 0,
      calidad: 0,
      ensamble: 0,
      pasillo: 0,
    };

    grid.forEach(row => {
      row.forEach(cell => {
        counts[cell.tipo] = (counts[cell.tipo] || 0) + 1;
      });
    });

    // 1. Calculate Main Flow Distance (Manhattan distance between station centroids)
    const flowOrder: CellType[] = ['almacen', 'cnc', 'laser', 'soldadura', 'ensamble', 'calidad', 'almacen'];
    const coords: Record<string, { r: number; c: number }> = {};

    Object.keys(counts).forEach(tipo => {
      let sumR = 0, sumC = 0, count = 0;
      grid.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell.tipo === tipo) {
            sumR += r;
            sumC += c;
            count++;
          }
        });
      });
      if (count > 0) {
        coords[tipo] = { r: sumR / count, c: sumC / count };
      }
    });

    let totalManhattan = 0;
    let legsCount = 0;
    for (let i = 0; i < flowOrder.length - 1; i++) {
      const fromType = flowOrder[i];
      const toType = flowOrder[i + 1];
      const fromCoord = coords[fromType];
      const toCoord = coords[toType];
      if (fromCoord && toCoord) {
        totalManhattan += Math.abs(fromCoord.r - toCoord.r) + Math.abs(fromCoord.c - toCoord.c);
        legsCount++;
      }
    }

    let distance = legsCount > 0 ? Math.round(totalManhattan * 5.5) : 0;
    if (distance === 0) distance = 42;

    const distTrend = Math.round(((distance - 48) / 48) * 100);

    // 2. Bottlenecks (dependent on station balance)
    let bottlenecks = 0;
    if (counts.cnc < 2) bottlenecks++;
    if (counts.laser < 2) bottlenecks++;
    if (counts.soldadura < 2) bottlenecks++;
    const bottleneckTrend = bottlenecks - 2;

    // 3. Required Operators
    const operators = Math.round(
      counts.cnc * 1.0 +
      counts.laser * 1.0 +
      counts.soldadura * 1.0 +
      counts.ensamble * 1.0 +
      counts.calidad * 1.0 +
      counts.almacen * 0.5
    );
    const operatorsTrend = operators - 7;

    // 4. Estimated OEE
    let oee = 72;
    oee += Math.min(5, counts.pasillo * 0.5);
    const minCap = Math.min(counts.cnc, counts.laser, counts.soldadura);
    if (minCap > 0) {
      oee += Math.min(10, minCap * 3);
    }
    if (distance < 35) oee += 5;
    else if (distance > 50) oee -= 5;
    
    oee = Math.min(95, Math.max(55, Math.round(oee)));
    const oeeTrend = oee - 84;

    return [
      {
        label: language === 'en' ? 'Main Flow Distance' : 'Distancia flujo principal',
        value: `${distance} m`,
        trend: distTrend,
        unit: language === 'en' ? '% vs. baseline' : '% vs. layout actual',
      },
      {
        label: language === 'en' ? 'Bottlenecks' : 'Cuellos de botella',
        value: String(bottlenecks),
        trend: bottleneckTrend,
        unit: language === 'en' ? 'vs. baseline' : 'vs. layout actual',
      },
      {
        label: language === 'en' ? 'Required Operators' : 'Operadores requeridos',
        value: String(operators),
        trend: operatorsTrend,
        unit: operatorsTrend === 0
          ? (language === 'en' ? 'no change' : 'sin cambio')
          : (language === 'en' ? 'vs. baseline' : 'vs. layout actual'),
      },
      {
        label: language === 'en' ? 'Estimated OEE' : 'OEE estimado',
        value: `${oee}%`,
        trend: oeeTrend,
        unit: language === 'en' ? 'improvement' : '% mejora',
      },
    ];
  }, [grid, language]);

  const paint = (r: number, c: number) => {
    setSaved(false);
    setGrid(g => g.map((row, ri) => row.map((cell, ci) =>
      ri === r && ci === c ? { ...cell, tipo: selectedTool, etiqueta: cellConfig[selectedTool].etiqueta } : cell
    )));
  };

  const reset = () => { setGrid(makeGrid(ROWS, COLS)); setSaved(false); };

  const saveLayout = useCallback(async () => {
    setSaving(true);
    try {
      const { data: tenant } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
      const { data: userRes } = await supabase.auth.getUser();
      const payload = {
        tenant_id: tenant?.id,
        nombre: `Layout ${new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX')}`,
        grid: grid as unknown as object,
        rows: ROWS,
        cols: COLS,
        created_by: userRes?.user?.email ?? 'sistema',
      };
      const { error } = await supabase.from('plant_layouts').insert(payload);
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }, [grid, language]);

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {/* Header */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center gap-4 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
          <Layout size={16} className="text-indigo-400" />
        </div>
        <div>
          <h1 className="text-sm font-black text-white uppercase tracking-[0.15em]">
            {language === 'en' ? 'Station Flow Design' : 'Diseño de Flujo de Estaciones'}
          </h1>
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
            {language === 'en' ? 'Plant Layout — Interactive Editor' : 'Layout de Planta — Editor Interactivo'}
          </span>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={reset}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-slate-300 text-xs hover:border-white/20 transition-all">
            <RotateCcw size={12} /> {language === 'en' ? 'Reset' : 'Reset'}
          </button>
          <button onClick={saveLayout} disabled={saving}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-xs font-bold hover:bg-indigo-500/30 transition-all disabled:opacity-50">
            {saved ? <CheckCircle size={12} className="text-emerald-400" /> : <Save size={12} />}
            {saving ? (language === 'en' ? 'Saving...' : 'Guardando…') : saved ? (language === 'en' ? 'Saved' : 'Guardado') : (language === 'en' ? 'Save Layout' : 'Guardar Layout')}
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden p-4 min-h-0">
        {/* Toolbox */}
        <div className="w-40 shrink-0 flex flex-col gap-2 overflow-y-auto">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">
            {language === 'en' ? 'Station Palette' : 'Paleta de estaciones'}
          </p>
          {MAQUINAS.map(m => (
            <button key={m.tipo} onClick={() => setSelectedTool(m.tipo)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left ${selectedTool === m.tipo ? m.bg + ' ring-1 ring-white/20' : 'border-white/5 bg-slate-900/40 hover:border-white/10'}`}>
              <div className={`w-3.5 h-3.5 rounded border ${m.bg} shrink-0`} />
              <span className={`text-xs font-bold ${selectedTool === m.tipo ? m.color : 'text-slate-400'}`}>
                {getMachineLabel(m.tipo, language)}
              </span>
              {selectedTool === m.tipo && <MousePointer2 size={11} className={m.color + ' ml-auto'} />}
            </button>
          ))}
          <div className="mt-auto pt-3 border-t border-white/5">
            <p className="text-[9px] text-slate-500 flex items-center gap-1">
              <Info size={9} /> {language === 'en' ? 'Click or drag to paint' : 'Click o arrastra para pintar'}
            </p>
          </div>
        </div>

        {/* Grid editor + Metrics */}
        <div className="flex-1 flex flex-col gap-3 overflow-hidden">
          <div className={`${panel} p-3 flex-1 overflow-auto`}>
            <div className="inline-block" onMouseLeave={() => setPainting(false)}>
              {grid.map((row, r) => (
                <div key={r} className="flex">
                  {row.map((cell, c) => {
                    const cfg = cellConfig[cell.tipo];
                    return (
                      <div key={cell.id}
                        className={`w-12 h-12 border rounded-lg m-0.5 flex items-center justify-center cursor-pointer transition-all select-none ${cfg.bg} hover:ring-1 hover:ring-white/20`}
                        onMouseDown={() => { setPainting(true); paint(r, c); }}
                        onMouseEnter={() => painting && paint(r, c)}
                        onMouseUp={() => setPainting(false)}>
                        {cell.tipo !== 'vacio' && (
                          <span className={`text-[9px] font-black ${cfg.color} text-center leading-tight`}>
                            {getMachineLabel(cell.tipo, language)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-4 gap-3 shrink-0">
            {metrics.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`${panel} p-3`}>
                <p className="text-[9px] text-slate-500 uppercase mb-1">{m.label}</p>
                <p className="text-lg font-black text-white">{m.value}</p>
                <p className={`text-[9px] font-bold mt-1 ${m.trend < 0 ? 'text-emerald-400' : m.trend > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                  {m.trend !== 0 ? (m.trend > 0 ? '▲' : '▼') + ' ' + Math.abs(m.trend) : '—'} {m.unit}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LayoutDesignView;
