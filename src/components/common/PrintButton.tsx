import React from 'react';
import { Printer } from 'lucide-react';

interface PrintButtonProps {
    label?: string;
    className?: string;
}

export const PrintButton: React.FC<PrintButtonProps> = ({
    label = 'Imprimir / PDF',
    className = '',
}) => (
    <button
        onClick={() => window.print()}
        className={`no-print flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-white/10 text-slate-400 hover:bg-white/5 hover:border-white/20 hover:text-white transition-all ${className}`}
        title="Imprimir o guardar como PDF"
    >
        <Printer className="w-4 h-4" />
        <span className="hidden sm:inline">{label}</span>
    </button>
);
