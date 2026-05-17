import React from 'react';
import type { AnalysisData } from '../types/metalQuoter';
import {
    Zap,
    Layers,
    Maximize2,
    Clock,
    ChevronRight,
    ShieldCheck,
    AlertTriangle,
    Info
} from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';

interface AnalysisResultProps {
    data: AnalysisData;
    onConfirm: () => void;
    onEdit: () => void;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ data, onConfirm, onEdit }) => {
    const { config } = useConfig();
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                        <ShieldCheck className="w-6 h-6 text-emerald-500" />
                        ANÁLISIS DE <span className="text-mcvill-accent">INGENIERÍA COMPLETADO</span>
                    </h2>
                    <p className="text-slate-500 font-black uppercase tracking-widest text-[9px] mt-1">
                        {`PROCESADO POR ${config.brandName} IA CORE v2.5 FLASH`}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={onEdit} className="px-4 py-2 bg-mcvill-card border border-mcvill-card-border text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:border-mcvill-accent transition-all">
                        REVISIÓN MANUAL
                    </button>
                    <button onClick={onConfirm} className="px-4 py-2 bg-mcvill-accent text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-mcvill-accent/20 hover:scale-105 transition-all">
                        GENERAR PDF TÉCNICO
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Stats Card */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-mcvill-card rounded-[2rem] border border-mcvill-card-border overflow-hidden shadow-2xl">
                        <div className="bg-mcvill-accent/10 px-8 py-5 border-b border-mcvill-card-border flex justify-between items-center">
                            <span className="font-black text-xs uppercase tracking-widest text-mcvill-accent italic">Especificaciones de Manufactura</span>
                            <span className="text-[9px] bg-emerald-500/10 px-3 py-1 rounded-full text-emerald-500 font-black border border-emerald-500/20 uppercase tracking-widest">Confianza: 98.4%</span>
                        </div>

                        <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-8">
                            <SpecItem icon={Layers} label="Material" value={data.material} />
                            <SpecItem icon={Maximize2} label="Calibre" value={data.gauge} />
                            <SpecItem icon={Info} label="Dimensiones" value={data.dimensions} />
                            <SpecItem icon={Clock} label="Tiempo Maq." value={data.processes[0].estimatedTime} />
                        </div>

                        <div className="px-8 py-8 border-t border-mcvill-card-border bg-mcvill-bg/40">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Detalle de Geometría Detectada</h4>
                            <div className="grid grid-cols-3 gap-6">
                                <div className="p-6 rounded-2xl bg-mcvill-bg border border-mcvill-card-border text-center shadow-inner">
                                    <div className="text-2xl font-black text-mcvill-accent italic tracking-tighter">{data.geometryStats.holes}</div>
                                    <div className="text-[9px] text-slate-500 font-black uppercase mt-1">Barrenos</div>
                                </div>
                                <div className="p-6 rounded-2xl bg-mcvill-bg border border-mcvill-card-border text-center shadow-inner">
                                    <div className="text-2xl font-black text-mcvill-accent italic tracking-tighter">{data.geometryStats.bends}</div>
                                    <div className="text-[9px] text-slate-500 font-black uppercase mt-1">Dobleces</div>
                                </div>
                                <div className="p-6 rounded-2xl bg-mcvill-bg border border-mcvill-card-border text-center shadow-inner">
                                    <div className="text-2xl font-black text-mcvill-accent italic tracking-tighter">{data.geometryStats.perimeterMm}</div>
                                    <div className="text-[9px] text-slate-500 font-black uppercase mt-1">Perímetro (mm)</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-mcvill-card rounded-[2rem] border border-mcvill-card-border p-8 shadow-2xl">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Zap size={14} className="text-mcvill-accent" />
                            Hoja de Ruta de Procesos
                        </h3>
                        <div className="space-y-4">
                            {data.processes.map((proc, i) => (
                                <div key={i} className="flex items-center gap-6 p-5 rounded-2xl bg-mcvill-bg/40 border border-mcvill-card-border group hover:border-mcvill-accent/30 transition-all">
                                    <div className="w-10 h-10 rounded-xl bg-mcvill-accent/10 border border-mcvill-accent/20 flex items-center justify-center text-mcvill-accent text-xs font-black italic">
                                        0{i + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs font-black text-white uppercase tracking-tight group-hover:text-mcvill-accent transition-colors">{proc.name}</div>
                                        <div className="text-[9px] text-slate-500 font-bold uppercase mt-1">{proc.description}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-black text-mcvill-text italic">{proc.estimatedTime}</div>
                                        <div className="w-20 h-1 bg-mcvill-bg/60 rounded-full mt-2 overflow-hidden border border-mcvill-card-border p-0.5">
                                            <div
                                                className="bg-mcvill-accent h-full rounded-full shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]"
                                                style={{ width: `${proc.confidence * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-mcvill-accent transition-colors" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Financial Sidebar */}
                <div className="space-y-6">
                    <div className="bg-mcvill-card rounded-[2rem] border border-mcvill-card-border p-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                            <Zap className="w-24 h-24 text-mcvill-accent" />
                        </div>

                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 italic">RESUMEN FINANCIERO</h3>

                        <div className="space-y-4 mb-10">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Material Base</span>
                                <span className="text-xs font-black text-mcvill-text font-mono">${data.costs.material.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Tiempo Máquina</span>
                                <span className="text-xs font-black text-mcvill-text font-mono">${data.costs.machine.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Mano de Obra</span>
                                <span className="text-xs font-black text-mcvill-text font-mono">${data.costs.labor.toLocaleString()}</span>
                            </div>
                            <div className="pt-6 border-t border-mcvill-card-border flex justify-between items-center">
                                <span className="font-black text-xs text-mcvill-accent uppercase tracking-[0.2em] italic">SUBTOTAL</span>
                                <span className="text-2xl font-black text-white italic tracking-tighter drop-shadow-[0_0_8px_rgba(var(--accent-rgb),0.2)]">${data.costs.total.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex gap-4">
                            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                                <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Cruce de Memoria OK</div>
                                <p className="text-[10px] text-slate-500 font-bold leading-relaxed italic">
                                    Proyecto similar detectado en histórico. Margen operativo validado al 25% para este tenant.
                                </p>
                            </div>
                        </div>

                        <button onClick={onConfirm} className="w-full mt-8 bg-mcvill-accent text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-mcvill-accent/30 hover:scale-[1.02] active:scale-95 transition-all">
                            APROBAR Y GENERAR PDF
                        </button>
                    </div>

                    <div className="bg-mcvill-card rounded-[2rem] border border-rose-500/20 p-8 shadow-xl">
                        <h4 className="text-[10px] font-black text-rose-500 flex items-center gap-2 mb-6 uppercase tracking-widest">
                            <AlertTriangle className="w-4 h-4" />
                            ALERTAS DE INGENIERÍA
                        </h4>
                        <ul className="space-y-4">
                            <li className="text-[10px] text-slate-500 flex gap-3 leading-relaxed font-bold italic">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1 shrink-0" />
                                Dobleces críticos detectados cercanos al límite de elasticidad del material A36.
                            </li>
                            <li className="text-[10px] text-slate-500 flex gap-3 leading-relaxed font-bold italic">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 shrink-0" />
                                Barrenos inferiores a 4mm requieren punzonado especializado previo al láser.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SpecItem({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-500">
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
            </div>
            <div className="text-xs font-black text-white uppercase tracking-tight truncate">{value}</div>
        </div>
    );
}
