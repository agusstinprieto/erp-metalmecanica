import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Download, QrCode } from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';

interface Props {
  viajero: {
    id: string;
    numero_parte?: string;
    descripcion?: string;
    cliente?: string;
    cantidad_orden?: number;
    estatus?: string;
  };
  onClose: () => void;
}

export const ViajeroQRModal: React.FC<Props> = ({ viajero, onClose }) => {
  const { isDarkMode } = useConfig();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;
    const win = window.open('', '_blank', 'width=400,height=500');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>QR Viajero ${viajero.id}</title>
          <style>
            body { margin: 0; padding: 24px; font-family: sans-serif; background: white; }
            .qr-wrap { display: flex; flex-direction: column; align-items: center; gap: 12px; }
            .label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: #1e293b; text-align: center; }
            .id { font-size: 22px; font-weight: 900; letter-spacing: -0.05em; color: #0f172a; text-align: center; }
            .meta { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; text-align: center; }
            .border-box { border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; display: inline-flex; }
          </style>
        </head>
        <body>
          <div class="qr-wrap">
            <div class="label">McVill ERP — Viajero Industrial</div>
            <div class="border-box">${printContent}</div>
            <div class="id">${viajero.id}</div>
            <div class="meta">${viajero.numero_parte || ''} · ${viajero.cliente || ''}</div>
            <div class="meta">${viajero.descripcion || ''}</div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  return (
    <div className="fixed inset-0 top-16 left-64 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`${isDarkMode ? 'bg-[#0a1628]' : 'bg-white'} border border-mcvill-card-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <QrCode size={16} className="text-blue-400" />
            <span className="text-[11px] font-black uppercase tracking-widest text-white">QR Viajero</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-all text-slate-500 hover:text-white">
            <X size={14} />
          </button>
        </div>

        {/* QR Content */}
        <div className="p-6 flex flex-col items-center gap-4">
          <div ref={printRef} className="p-4 bg-white rounded-xl shadow-inner">
            <QRCodeSVG
              value={viajero.id}
              size={180}
              bgColor="#ffffff"
              fgColor="#0f172a"
              level="M"
              includeMargin={false}
            />
          </div>

          <div className="text-center space-y-1 w-full">
            <p className="text-2xl font-black text-white tracking-tighter">{viajero.id}</p>
            {viajero.numero_parte && (
              <p className="text-[11px] font-black text-blue-400 uppercase tracking-wide">{viajero.numero_parte}</p>
            )}
            {viajero.cliente && (
              <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] font-black rounded-lg border border-emerald-500/20 uppercase tracking-widest">
                {viajero.cliente}
              </span>
            )}
            {viajero.descripcion && (
              <p className="text-[10px] text-slate-500 font-bold max-w-[220px] mx-auto leading-tight">{viajero.descripcion}</p>
            )}
          </div>

          <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] text-center">
            Escanea para identificar este trabajo en ShopFloor
          </p>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <Printer size={14} /> Imprimir QR
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
