import React, { useState } from 'react';
import { Upload, FileText, Zap, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

interface DropZoneProps {
    onFileSelect: (file: File) => void;
    isAnalyzing: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFileSelect, isAnalyzing }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onFileSelect(file);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onFileSelect(file);
    };

    if (isAnalyzing) {
        return (
            <div className="bg-mcvill-card rounded-[3rem] border border-mcvill-card-border p-16 text-center shadow-2xl relative overflow-hidden min-h-[500px] flex flex-col items-center justify-center">
                <div className="relative w-40 h-40 mb-10">
                    <div className="absolute inset-0 border-4 border-mcvill-accent/10 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 border-4 border-mcvill-accent border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Cpu className="w-12 h-12 text-mcvill-accent animate-pulse" />
                    </div>
                </div>
                <h3 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter italic">ESCANEANDO PLANO DE INGENIERÍA</h3>
                <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] max-w-sm mx-auto leading-relaxed">
                    Nuestra IA está identificando espesores, geometrías y estimando tiempos de corte láser/plasma...
                </p>
                <div className="mt-12 flex gap-2">
                    <div className="w-2 h-2 bg-mcvill-accent rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-mcvill-accent rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-mcvill-accent rounded-full animate-bounce"></div>
                </div>
            </div>
        );
    }

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
                relative bg-mcvill-card rounded-[3rem] border-2 border-dashed p-16 text-center transition-all duration-500 group shadow-2xl min-h-[500px] flex flex-col items-center justify-center
                ${isDragging 
                    ? 'border-mcvill-accent bg-mcvill-accent/5 scale-[1.02] shadow-mcvill-accent/20' 
                    : 'border-mcvill-card-border hover:border-mcvill-accent/50 bg-mcvill-bg/40'}
            `}
        >
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(circle, var(--mcvill-accent) 0.5px, transparent 0.5px)', backgroundSize: '30px 30px' }} />

            <div className="relative z-10">
                <div className={`
                    w-28 h-28 mx-auto mb-8 rounded-[2rem] flex items-center justify-center transition-all duration-700
                    ${isDragging ? 'bg-mcvill-accent text-white rotate-12 scale-110' : 'bg-mcvill-bg border border-mcvill-card-border text-slate-500 group-hover:text-mcvill-accent group-hover:border-mcvill-accent/30'}
                    shadow-xl shadow-black/40
                `}>
                    <Upload className={`w-12 h-12 ${isDragging ? 'animate-bounce' : ''}`} />
                </div>

                <h3 className="text-3xl font-black text-white mb-3 uppercase tracking-tighter italic drop-shadow-md">
                    SOLTAR <span className="text-mcvill-accent">PLANO TÉCNICO</span>
                </h3>
                <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] mb-10">
                    SOPORTA PDF, DXF, DWG O CAPTURAS DE PANTALLA
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <label className="cursor-pointer px-10 py-4 bg-mcvill-accent text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-mcvill-accent/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3">
                        <Upload className="w-4 h-4" />
                        EXAMINAR ARCHIVOS
                        <input type="file" className="hidden" onChange={handleFileInput} accept="image/*,application/pdf" />
                    </label>
                </div>

                <div className="mt-12 grid grid-cols-2 gap-6 opacity-30 group-hover:opacity-60 transition-opacity max-w-md mx-auto">
                    <div className="flex items-center gap-3 text-slate-500 justify-center">
                        <FileText size={14} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Auto-Coting</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 justify-center">
                        <Zap size={14} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Instant SAM</span>
                    </div>
                </div>
            </div>

            {/* Scanline effect */}
            {isDragging && (
                <div className="absolute inset-x-12 top-0 h-1 bg-gradient-to-r from-transparent via-mcvill-accent to-transparent animate-scan" />
            )}
        </div>
    );
};
