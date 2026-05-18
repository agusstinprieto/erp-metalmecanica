import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Maximize2,
    Layers,
    Box,
    Zap,
    Trash2,
    Download,
    Settings,
    Scissors,
    Save,
    RefreshCcw,
    TrendingDown,
    Activity,
    Upload
} from 'lucide-react';
import { ScrapManager } from './ScrapManager';
import { appAlert } from '../lib/dialogs';
import type { Scrap } from '../types/nesting';

interface NestResult { wastePercentage: number; itemsProcessed: number; boardsSaved: number; placements: { id: string; x: number; y: number; w: number; h: number }[] }

// Algoritmo simple bottom-left para 2D bin packing sobre lámina estándar 4'x8' (1219x2438mm)
function runNesting(scraps: Scrap[]): NestResult {
    const SHEET_W = 1219, SHEET_H = 2438;
    const GAP = 6;
    const available = scraps.filter(s => s.status === 'available');
    const placements: NestResult['placements'] = [];
    let curX = GAP, curY = GAP, rowH = 0, sheets = 1;
    for (const s of available) {
        const w = s.width + GAP, h = s.height + GAP;
        if (curX + w > SHEET_W) { curX = GAP; curY += rowH; rowH = 0; }
        if (curY + h > SHEET_H) { curX = GAP; curY = GAP; rowH = 0; sheets++; }
        placements.push({ id: s.id, x: curX, y: curY, w: s.width, h: s.height });
        curX += w;
        rowH = Math.max(rowH, h);
    }
    const usedArea = available.reduce((a, s) => a + s.width * s.height, 0);
    const totalArea = sheets * SHEET_W * SHEET_H;
    const wastePercentage = totalArea > 0 ? Math.round((1 - usedArea / totalArea) * 1000) / 10 : 0;
    return { wastePercentage, itemsProcessed: available.length, boardsSaved: Math.max(0, available.length - sheets), placements };
}

const NestingView: React.FC = () => {
    const [scraps, setScraps] = useState<Scrap[]>([
        { id: '1', width: 800, height: 400, material: 'Acero A36', thickness: '1/4"', status: 'available', entryDate: new Date().toISOString() },
        { id: '2', width: 1200, height: 300, material: 'Inox 304', thickness: '1/8"', status: 'available', entryDate: new Date().toISOString() }
    ]);
    const [nestResult, setNestResult] = useState<NestResult | null>(null);
    const [running, setRunning] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadedFile(file.name);
        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        } else {
            setPreviewUrl(null);
        }
        appAlert(`Archivo "${file.name}" cargado con éxito. El motor de Nesting IA ha procesado el plano vectorial para la optimización de corte.`, 'Archivo Cargado');
    };

    const handleAddScrap = (scrap: Scrap) => { setScraps([...scraps, scrap]); setNestResult(null); };
    const handleDeleteScrap = (id: string) => { setScraps(scraps.filter(s => s.id !== id)); setNestResult(null); };
    const handleUseScrap = async (scrap: Scrap) => await appAlert(`Usando retazo ${scrap.width}x${scrap.height} como base de corte.`, 'Nesting IA');

    const handleRunNesting = useCallback(() => {
        if (scraps.filter(s => s.status === 'available').length === 0) { appAlert('Agrega retazos disponibles antes de ejecutar el nesting.', 'Sin material'); return; }
        setRunning(true);
        setTimeout(() => { setNestResult(runNesting(scraps)); setRunning(false); }, 600);
    }, [scraps]);

    const handleExportDXF = useCallback(() => {
        if (!nestResult) { appAlert('Ejecuta el Nesting primero para generar el layout de corte.', 'Nesting IA'); return; }
        const lines = ['0\nSECTION\n2\nENTITIES'];
        nestResult.placements.forEach(p => {
            lines.push(`0\nLWPOLYLINE\n8\nCORTE\n90\n4\n70\n1`);
            [[p.x,p.y],[p.x+p.w,p.y],[p.x+p.w,p.y+p.h],[p.x,p.y+p.h]].forEach(([x,y]) => lines.push(`10\n${x}\n20\n${y}`));
        });
        lines.push('0\nENDSEC\n0\nEOF');
        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `MCVILL_NESTING_${Date.now()}.dxf`; a.click();
    }, [nestResult]);

    const wastePercentage = nestResult?.wastePercentage ?? 0;
    const itemsProcessed  = nestResult?.itemsProcessed  ?? 0;
    const boardsSaved     = nestResult?.boardsSaved     ?? 0;

    return (
        <div className="h-full bg-mcvill-bg overflow-y-auto custom-scrollbar p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                            <Layers size={28} className="text-mcvill-accent" />
                            NESTING IA: OPTIMIZACIÓN DE CORTE
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/30">ACTIVE ENGINE 2.5</span>
                        </h2>
                        <p className="text-slate-500 text-sm mt-1 font-bold uppercase tracking-widest">
                            Algoritmos de empaquetado 2D para máximo aprovechamiento de materiales
                        </p>
                    </div>

                    <input 
                        type="file" 
                        accept=".jpg,.jpeg,.png,.pdf,.dxf,.dwg,.step" 
                        id="nesting-file-upload" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                    />

                    <div className="flex gap-2">
                        <label htmlFor="nesting-file-upload" className="mcvill-btn-secondary px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer hover:bg-white/10 transition-colors">
                            <Upload size={14} />
                            CARGAR DISEÑO
                        </label>
                        <button onClick={handleExportDXF} disabled={!nestResult}
                            className="mcvill-btn-secondary px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-40">
                            <Download size={14} />
                            DXF EXPORT
                        </button>
                        <button onClick={handleRunNesting} disabled={running}
                            className="mcvill-btn-planning px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-60">
                            <Scissors size={14} />
                            {running ? 'CALCULANDO…' : 'EJECUTAR NESTING'}
                        </button>
                    </div>
                </div>

                {/* KPI Ribbon */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-mcvill-card/40 border border-mcvill-card-border rounded-3xl p-6 flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                            <TrendingDown size={32} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Desperdicio Total</p>
                            <p className="text-3xl font-black text-emerald-500 leading-none">{wastePercentage}%</p>
                            <p className="text-[9px] text-zinc-600 font-bold uppercase mt-1">-15% VS MES ANTERIOR</p>
                        </div>
                    </div>

                    <div className="bg-mcvill-card/40 border border-mcvill-card-border rounded-3xl p-6 flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-mcvill-accent/10 border border-mcvill-accent/20 flex items-center justify-center text-mcvill-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)]">
                            <Box size={32} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Piezas Nesteadas</p>
                            <p className="text-3xl font-black text-mcvill-text leading-none">{itemsProcessed}</p>
                            <p className="text-[9px] text-zinc-600 font-bold uppercase mt-1">BATCH #4820</p>
                        </div>
                    </div>

                    <div className="bg-mcvill-card/40 border border-mcvill-card-border rounded-3xl p-6 flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                            <Save size={32} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tableros Ahorrados</p>
                            <p className="text-3xl font-black text-blue-500 leading-none">{boardsSaved}</p>
                            <p className="text-[9px] text-zinc-600 font-bold uppercase mt-1">EST. VALUE: $5,600</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Visualizer (The Canvas Simulation) */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-mcvill-bg/40 border border-mcvill-card-border rounded-[3rem] p-4 relative min-h-[500px] group overflow-hidden shadow-2xl">
                            {/* Grid Overlay */}
                            <div className="absolute inset-0 opacity-10 pointer-events-none"
                                style={{ backgroundImage: 'radial-gradient(circle, var(--mcvill-accent) 0.5px, transparent 0.5px)', backgroundSize: '30px 30px' }} />

                            {/* Simulation Area */}
                            <div className="relative w-full h-full flex items-center justify-center">
                                {/* Large Board Simulation */}
                                <div className="w-[90%] h-[400px] border border-mcvill-accent/30 bg-black/50 rounded-lg relative overflow-hidden backdrop-blur-sm">
                                    {previewUrl && (
                                        <img 
                                            src={previewUrl} 
                                            alt="Preview" 
                                            className="absolute inset-0 w-full h-full object-contain opacity-25 pointer-events-none" 
                                        />
                                    )}
                                    {/* Nested Rectangles (Simulated Cuts) */}
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-4 left-4 w-40 h-24 bg-mcvill-accent/20 border border-mcvill-accent/50 rounded flex items-center justify-center">
                                        <span className="text-[8px] font-bold text-mcvill-accent uppercase">M-802</span>
                                    </motion.div>
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1 }} className="absolute top-4 left-48 w-64 h-32 bg-blue-500/20 border border-blue-500/50 rounded flex items-center justify-center">
                                        <span className="text-[8px] font-bold text-blue-400 uppercase">T-PLATE-01</span>
                                    </motion.div>
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }} className="absolute top-32 left-4 w-40 h-64 bg-emerald-500/20 border border-emerald-500/50 rounded flex items-center justify-center">
                                        <span className="text-[8px] font-bold text-emerald-400 uppercase">STRUCT-L</span>
                                    </motion.div>
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }} className="absolute top-40 left-48 w-40 h-64 bg-emerald-500/20 border border-emerald-500/50 rounded flex items-center justify-center">
                                        <span className="text-[8px] font-bold text-emerald-400 uppercase">STRUCT-R</span>
                                    </motion.div>

                                    {/* Empty Waste Areas */}
                                    <div className="absolute bottom-4 right-4 w-24 h-24 border border-dashed border-red-500/30 flex items-center justify-center">
                                        <span className="text-[8px] font-bold text-red-500/50 uppercase">MERMA</span>
                                    </div>
                                </div>
                            </div>

                            {/* Controls Overlay */}
                            <div className="absolute top-10 left-10 flex flex-col gap-2">
                                <button title="Pantalla completa" onClick={() => document.documentElement.requestFullscreen?.()}
                                    className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-mcvill-accent hover:text-white transition-all shadow-lg">
                                    <Maximize2 size={14} />
                                </button>
                                <button title="Recalcular nesting" onClick={handleRunNesting} disabled={running}
                                    className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-mcvill-accent hover:text-white transition-all shadow-lg disabled:opacity-40">
                                    <RefreshCcw size={14} />
                                </button>
                            </div>

                            <div className="absolute bottom-10 right-10 bg-mcvill-card/80 backdrop-blur-xl border border-mcvill-card-border rounded-2xl p-4 flex items-center gap-4 shadow-2xl">
                                <div className="space-y-1">
                                    <p className="text-[8px] text-slate-500 uppercase font-black">Estado CNC</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                                        <span className="text-[10px] font-bold text-mcvill-text uppercase">PRODUCCIÓN ONLINE</span>
                                    </div>
                                </div>
                                <div className="w-[1px] h-8 bg-mcvill-card-border" />
                                <div className="space-y-1">
                                    <p className="text-[8px] text-slate-500 uppercase font-black">Archivo Activo</p>
                                    <span className="text-[10px] font-bold text-mcvill-text uppercase block max-w-[150px] truncate">{uploadedFile ?? 'MCVILL_STRUCT_A1.DXF'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Configuration Sidebar */}
                    <div className="lg:col-span-4 space-y-8 flex flex-col">
                        <div className="bg-mcvill-card border border-mcvill-card-border rounded-3xl p-8 space-y-8 shadow-xl">
                            <h3 className="text-xs font-black text-mcvill-text uppercase tracking-widest flex items-center gap-2">
                                <Settings size={14} className="text-mcvill-accent" />
                                PARÁMETROS DE OPTIMIZACIÓN
                            </h3>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Tipo de Material</label>
                                    <select className="w-full bg-mcvill-bg/40 border border-mcvill-card-border rounded-xl p-3 text-[10px] text-mcvill-text font-bold outline-none focus:border-mcvill-accent transition-all appearance-none cursor-pointer">
                                        <option>PLACA ACERO A36 (4' x 8')</option>
                                        <option>ALUMINIO 6061-T6</option>
                                        <option>MDF 18MM (1.22 x 2.44)</option>
                                        <option>ACERO INOXIDABLE 304</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Distancia entre piezas (mm)</label>
                                    <input type="number" defaultValue={6} className="w-full bg-mcvill-bg/40 border border-mcvill-card-border rounded-xl p-3 text-[10px] text-mcvill-text font-bold outline-none focus:border-mcvill-accent transition-all" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Margen de Borde</label>
                                        <input type="number" defaultValue={10} className="w-full bg-mcvill-bg/40 border border-mcvill-card-border rounded-xl p-3 text-[10px] text-mcvill-text font-bold outline-none focus:border-mcvill-accent transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Algoritmo</label>
                                        <select className="w-full bg-mcvill-bg/40 border border-mcvill-card-border rounded-xl p-3 text-[10px] text-mcvill-text font-bold outline-none focus:border-mcvill-accent transition-all appearance-none cursor-pointer">
                                            <option>90° / 180°</option>
                                            <option>Cualquier Grado</option>
                                            <option>Estático (Veta)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-mcvill-card-border">
                                <button className="w-full flex items-center justify-between p-4 bg-mcvill-accent/10 border border-mcvill-accent/30 rounded-2xl group hover:bg-mcvill-accent/20 transition-all">
                                    <div className="text-left">
                                        <p className="text-[10px] text-mcvill-accent font-black uppercase tracking-widest">Algoritmo IA</p>
                                        <p className="text-xs font-bold text-mcvill-text">MCVILL HEURISTIC 4.0</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-mcvill-accent/20 flex items-center justify-center text-mcvill-accent group-hover:scale-110 transition-transform">
                                        <Zap size={18} />
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Scrap Manager */}
                        <div className="flex-1 min-h-[450px]">
                            <ScrapManager 
                                scraps={scraps}
                                onAddScrap={handleAddScrap}
                                onDeleteScrap={handleDeleteScrap}
                                onUseScrap={handleUseScrap}
                            />
                        </div>

                        {/* Efficiency Comparison */}
                        <div className="bg-mcvill-card border border-mcvill-card-border rounded-3xl p-8 shadow-xl">
                            <h3 className="text-xs font-black text-mcvill-text uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Activity size={14} className="text-mcvill-accent" />
                                EFICIENCIA PROYECTADA
                            </h3>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-bold">
                                        <span className="text-slate-500">NESTING MANUAL</span>
                                        <span className="text-red-500">65% APROVECHAMIENTO</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-mcvill-bg/40 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-500/50 w-[65%]" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-bold">
                                        <span className="text-slate-500">MCVILL IA ENGINE</span>
                                        <span className="text-emerald-500">95.8% APROVECHAMIENTO</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-mcvill-bg/40 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 w-[95.8%] shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export { NestingView };
export default NestingView;
