import React, { useState } from 'react';
import { Layers, Plus, Trash2, Database, TrendingDown, PackageCheck, X } from 'lucide-react';
import type { Scrap } from '../types/nesting';

interface ScrapManagerProps {
    scraps: Scrap[];
    onAddScrap: (scrap: Scrap) => void;
    onDeleteScrap: (id: string) => void;
    onUseScrap: (scrap: Scrap) => void;
}

export const ScrapManager: React.FC<ScrapManagerProps> = ({ scraps, onAddScrap, onDeleteScrap, onUseScrap }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newScrap, setNewScrap] = useState<Partial<Scrap>>({
        width: 1000,
        height: 500,
        material: 'Acero A36',
        thickness: '1/4"',
        status: 'available'
    });

    const handleAdd = () => {
        if (newScrap.width && newScrap.height) {
            onAddScrap({
                id: `scrap-${Date.now()}`,
                width: Number(newScrap.width),
                height: Number(newScrap.height),
                material: newScrap.material || 'Acero A36',
                thickness: newScrap.thickness || '1/4"',
                status: 'available',
                entryDate: new Date().toISOString()
            } as Scrap);
            setIsAdding(false);
        }
    };

    const totalScrapValue = scraps.length * 150; // Valor estimado representativo

    return (
        <div className="bg-mcvill-card border border-mcvill-card-border rounded-3xl overflow-hidden shadow-2xl flex flex-col h-full">
            <div className="p-6 border-b border-mcvill-card-border bg-mcvill-bg/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Database className="text-mcvill-accent w-4 h-4" />
                    <h3 className="text-xs font-black text-white uppercase tracking-widest italic">
                        GESTOR DE <span className="text-mcvill-accent">MERMAS (SCRAP)</span>
                    </h3>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-8 h-8 flex items-center justify-center bg-mcvill-accent/10 border border-mcvill-accent/20 rounded-xl text-mcvill-accent hover:bg-mcvill-accent hover:text-white transition-all shadow-lg"
                >
                    <Plus size={16} />
                </button>
            </div>

            <div className="p-6 bg-mcvill-accent/5 border-b border-mcvill-card-border/50">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Valor de Recuperación</span>
                    <TrendingDown size={14} className="text-emerald-500" />
                </div>
                <div className="text-3xl font-black text-white italic tracking-tighter">
                    ${totalScrapValue.toLocaleString()}<span className="text-xs ml-2 text-mcvill-accent opacity-60">MXN</span>
                </div>
                <p className="text-[9px] text-slate-600 mt-2 font-bold uppercase tracking-widest">Capital recuperado de material inactivo.</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-[300px]">
                {scraps.length === 0 ? (
                    <div className="py-20 text-center">
                        <PackageCheck className="w-12 h-12 text-slate-800 mx-auto mb-4 opacity-20" />
                        <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Sin retazos en inventario</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {scraps.map(scrap => (
                            <div key={scrap.id} className="bg-mcvill-bg/40 border border-mcvill-card-border rounded-2xl p-4 group hover:border-mcvill-accent/30 transition-all shadow-inner relative overflow-hidden">
                                <div className="flex justify-between items-start mb-3 relative z-10">
                                    <div>
                                        <div className="text-sm font-black text-white italic tracking-tighter">
                                            {scrap.width} × {scrap.height} <span className="text-[9px] text-slate-600 uppercase">mm</span>
                                        </div>
                                        <div className="text-[9px] text-mcvill-accent font-black uppercase tracking-widest mt-1">
                                            {scrap.material} • {scrap.thickness}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                        <button
                                            onClick={() => onUseScrap(scrap)}
                                            className="w-8 h-8 bg-mcvill-accent/10 text-mcvill-accent hover:bg-mcvill-accent hover:text-white rounded-lg transition-all flex items-center justify-center border border-mcvill-accent/20"
                                            title="Usar como lámina base"
                                        >
                                            <Layers size={14} />
                                        </button>
                                        <button
                                            onClick={() => onDeleteScrap(scrap.id)}
                                            className="w-8 h-8 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all flex items-center justify-center border border-rose-500/20"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-4 relative z-10">
                                    <span className="text-[8px] text-slate-600 font-black uppercase tracking-[0.2em]">
                                        {new Date(scrap.entryDate).toLocaleDateString()}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-[8px] text-emerald-500 font-black uppercase tracking-widest border border-emerald-500/20">
                                        DISPONIBLE
                                    </span>
                                </div>
                                {/* Background glow effect on hover */}
                                <div className="absolute top-0 right-0 w-16 h-16 bg-mcvill-accent/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isAdding && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <div className="bg-mcvill-card border border-mcvill-card-border rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-mcvill-card-border bg-mcvill-bg/40 flex items-center justify-between">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-3">
                                <Plus className="text-mcvill-accent" size={18} />
                                NUEVA MERMA (SCRAP)
                            </h3>
                            <button onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Ancho (mm)</label>
                                    <input
                                        type="number"
                                        value={newScrap.width}
                                        onChange={e => setNewScrap({ ...newScrap, width: Number(e.target.value) })}
                                        className="w-full bg-mcvill-bg/40 border border-mcvill-card-border rounded-xl px-4 py-3 text-sm text-white font-black italic focus:outline-none focus:border-mcvill-accent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Alto (mm)</label>
                                    <input
                                        type="number"
                                        value={newScrap.height}
                                        onChange={e => setNewScrap({ ...newScrap, height: Number(e.target.value) })}
                                        className="w-full bg-mcvill-bg/40 border border-mcvill-card-border rounded-xl px-4 py-3 text-sm text-white font-black italic focus:outline-none focus:border-mcvill-accent transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Especificación de Material</label>
                                <input
                                    type="text"
                                    value={newScrap.material}
                                    onChange={e => setNewScrap({ ...newScrap, material: e.target.value })}
                                    className="w-full bg-mcvill-bg/40 border border-mcvill-card-border rounded-xl px-4 py-3 text-xs text-white font-black uppercase italic focus:outline-none focus:border-mcvill-accent transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Calibre / Espesor</label>
                                <input
                                    type="text"
                                    value={newScrap.thickness}
                                    onChange={e => setNewScrap({ ...newScrap, thickness: e.target.value })}
                                    className="w-full bg-mcvill-bg/40 border border-mcvill-card-border rounded-xl px-4 py-3 text-xs text-white font-black italic focus:outline-none focus:border-mcvill-accent transition-all"
                                />
                            </div>
                        </div>
                        <div className="p-6 bg-mcvill-bg/40 border-t border-mcvill-card-border flex gap-4">
                            <button
                                onClick={() => setIsAdding(false)}
                                className="flex-1 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all"
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handleAdd}
                                className="flex-1 py-4 bg-mcvill-accent hover:shadow-[0_0_20px_rgba(var(--accent-rgb),0.4)] text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                            >
                                REGISTRAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
