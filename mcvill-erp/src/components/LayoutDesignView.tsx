import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Layout, MousePointer2, Info, RotateCcw, Save } from 'lucide-react';

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

const METRICS = [
  { label: 'Distancia flujo principal', value: '42 m', trend: -12, unit: '% vs. layout actual' },
  { label: 'Cuellos de botella', value: '2', trend: -1, unit: 'vs. layout actual' },
  { label: 'Operadores requeridos', value: '7', trend: 0, unit: 'sin cambio' },
  { label: 'OEE estimado', value: '84%', trend: +6, unit: '% mejora' },
];

const panel = 'bg-slate-900/40 border border-white/5 rounded-xl';

export const LayoutDesignView: React.FC = () => {
  const [grid, setGrid] = useState<GridCell[][]>(makeGrid(ROWS, COLS));
  const [selectedTool, setSelectedTool] = useState<CellType>('cnc');
  const [painting, setPainting] = useState(false);

  const paint = (r: number, c: number) => {
    setGrid(g => g.map((row, ri) => row.map((cell, ci) =>
      ri === r && ci === c ? { ...cell, tipo: selectedTool, etiqueta: cellConfig[selectedTool].etiqueta } : cell
    )));
  };

  const reset = () => setGrid(makeGrid(ROWS, COLS));

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {/* Header */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center gap-4 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
          <Layout size={16} className="text-indigo-400" />
        </div>
        <div>
          <h1 className="text-sm font-black text-white uppercase tracking-[0.15em]">Diseño de Flujo de Estaciones</h1>
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Layout de Planta — Editor Interactivo</span>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={reset}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-slate-300 text-xs hover:border-white/20 transition-all">
            <RotateCcw size={12} /> Reset
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-xs font-bold hover:bg-indigo-500/30 transition-all">
            <Save size={12} /> Guardar Layout
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden p-4 min-h-0">
        {/* Toolbox */}
        <div className="w-40 shrink-0 flex flex-col gap-2 overflow-y-auto">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Paleta de estaciones</p>
          {MAQUINAS.map(m => (
            <button key={m.tipo} onClick={() => setSelectedTool(m.tipo)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left ${selectedTool === m.tipo ? m.bg + ' ring-1 ring-white/20' : 'border-white/5 bg-slate-900/40 hover:border-white/10'}`}>
              <div className={`w-3.5 h-3.5 rounded border ${m.bg} shrink-0`} />
              <span className={`text-xs font-bold ${selectedTool === m.tipo ? m.color : 'text-slate-400'}`}>{m.etiqueta}</span>
              {selectedTool === m.tipo && <MousePointer2 size={11} className={m.color + ' ml-auto'} />}
            </button>
          ))}
          <div className="mt-auto pt-3 border-t border-white/5">
            <p className="text-[9px] text-slate-500 flex items-center gap-1"><Info size={9} /> Click o arrastra para pintar</p>
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
                          <span className={`text-[9px] font-black ${cfg.color} text-center leading-tight`}>{cfg.etiqueta}</span>
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
            {METRICS.map((m, i) => (
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
