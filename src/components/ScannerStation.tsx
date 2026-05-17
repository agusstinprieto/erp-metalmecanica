import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Scan, Camera, CameraOff, LogIn, LogOut, AlertTriangle, CheckCheck, Wifi } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { attendanceService } from '../services/attendanceService';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';

// ─── Types ────────────────────────────────────────────────────────────────────

type ScanResult = {
  action: 'check_in' | 'check_out' | 'already_complete' | 'not_found';
  employee?: { first_name: string; last_name: string; employee_number: string };
  record?: { check_in?: string | null; check_out?: string | null; minutes_worked?: number | null };
};

const ACTION_CFG = {
  check_in:        { label: 'ENTRADA REGISTRADA',  icon: LogIn,       bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-emerald-400' },
  check_out:       { label: 'SALIDA REGISTRADA',   icon: LogOut,      bg: 'bg-blue-500',    border: 'border-blue-400',    text: 'text-blue-400'    },
  already_complete:{ label: 'JORNADA COMPLETA',    icon: CheckCheck,  bg: 'bg-slate-600',   border: 'border-slate-400',   text: 'text-slate-300'   },
  not_found:       { label: 'GAFETE NO ENCONTRADO',icon: AlertTriangle,bg: 'bg-rose-600',   border: 'border-rose-400',    text: 'text-rose-400'    },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export const ScannerStation: React.FC<Props> = ({ onClose }) => {
  const [now, setNow] = useState(new Date());
  const [result, setResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [cameraMode, setCameraMode] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualCode, setManualCode] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const scanLoopRef = useRef<number>(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reloj en tiempo real
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Procesa el código leído (HID scanner o cámara)
  const handleScan = useCallback(async (code: string) => {
    if (processing || !code.trim()) return;
    setProcessing(true);
    setResult(null);
    try {
      const res = await attendanceService.processScan(code.trim());
      setResult(res);
      // Auto-dismiss después de 4 segundos con countdown
      setCountdown(4);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            setResult(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setResult({ action: 'not_found' });
    } finally {
      setProcessing(false);
    }
  }, [processing]);

  // Limpieza al cerrar el resultado manualmente
  const dismissResult = () => {
    clearInterval(countdownRef.current!);
    setResult(null);
    setCountdown(0);
  };

  // ── Scanner HID (teclado) ──
  useBarcodeScanner(handleScan, !processing && !cameraMode);

  // ── Modo cámara ──
  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      // BarcodeDetector API (Chrome 83+, Edge, Android Chrome)
      if ('BarcodeDetector' in window) {
        detectorRef.current = new (window as any).BarcodeDetector({ formats: ['code_128', 'code_39', 'qr_code', 'ean_13'] });
        const detect = async () => {
          if (!videoRef.current || !detectorRef.current) return;
          try {
            const barcodes = await detectorRef.current.detect(videoRef.current);
            if (barcodes.length > 0) {
              handleScan(barcodes[0].rawValue);
            }
          } catch { /* continúa */ }
          scanLoopRef.current = requestAnimationFrame(detect);
        };
        scanLoopRef.current = requestAnimationFrame(detect);
      } else {
        setCameraError('Tu navegador no soporta BarcodeDetector. Usa Chrome o Edge.');
      }
      setCameraMode(true);
    } catch {
      setCameraError('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  };

  const stopCamera = () => {
    cancelAnimationFrame(scanLoopRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraMode(false);
  };

  useEffect(() => () => { stopCamera(); clearInterval(countdownRef.current!); }, []);

  // Envío manual (fallback)
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
      setManualCode('');
    }
  };

  const cfg = result ? ACTION_CFG[result.action] : null;

  return (
    <div className="fixed inset-0 z-[999] bg-slate-950 flex flex-col select-none">

      {/* Barra superior */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-slate-900/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">McVill ERP · Estación de Fichaje</span>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all">
          <X size={16} className="text-slate-400" />
        </button>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8 relative overflow-hidden">

        {/* Fondo decorativo */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-3xl" />
        </div>

        {/* Reloj */}
        <div className="text-center relative z-10">
          <p className="text-7xl font-black text-white tracking-tighter font-mono leading-none">
            {format(now, 'HH:mm:ss')}
          </p>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-2">
            {format(now, "EEEE dd 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>

        {/* Área de resultado / instrucción */}
        <div className="relative z-10 w-full max-w-md">
          {!result && !processing && (
            <div className="text-center">
              {/* Ícono animado de scan */}
              {cameraMode ? (
                <div className="relative mx-auto w-64 h-48 rounded-2xl overflow-hidden border-2 border-blue-500/40 mb-6">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-2 border-blue-400/60 rounded-2xl" />
                  <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-blue-400/80 animate-pulse" />
                </div>
              ) : (
                <div className="mx-auto w-24 h-24 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
                  <Scan size={40} className="text-blue-400 animate-pulse" />
                </div>
              )}
              <p className="text-2xl font-black text-white uppercase tracking-wider">
                {cameraMode ? 'APUNTA AL GAFETE' : 'ESCANEE SU GAFETE'}
              </p>
              <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-widest">
                {cameraMode ? 'Detectando código de barras...' : 'Acerque el lector al código de barras'}
              </p>
              {cameraError && (
                <p className="mt-3 text-rose-400 text-xs font-bold">{cameraError}</p>
              )}
            </div>
          )}

          {processing && (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mb-6" />
              <p className="text-xl font-black text-white uppercase tracking-wider">PROCESANDO...</p>
            </div>
          )}

          {result && cfg && (
            <div
              className={clsx(
                'rounded-2xl border-2 p-6 text-center transition-all animate-in fade-in duration-300',
                cfg.border, 'bg-slate-900/80 backdrop-blur'
              )}
            >
              <div className={clsx('mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4', cfg.bg + '/20')}>
                <cfg.icon size={32} className={cfg.text} />
              </div>
              {result.employee && (
                <>
                  <p className="text-3xl font-black text-white uppercase tracking-tight leading-none">
                    {result.employee.first_name}
                  </p>
                  <p className="text-xl font-black text-slate-300 uppercase tracking-tight mt-1">
                    {result.employee.last_name}
                  </p>
                  <p className="text-slate-500 text-xs font-mono mt-1">{result.employee.employee_number}</p>
                </>
              )}
              <div className={clsx('mt-4 px-4 py-2 rounded-xl inline-block', cfg.bg + '/10', 'border', cfg.border)}>
                <p className={clsx('text-sm font-black uppercase tracking-widest', cfg.text)}>{cfg.label}</p>
              </div>
              {result.action === 'check_in' && result.record?.check_in && (
                <p className="text-slate-400 text-xs font-mono mt-3">
                  Hora de entrada: <span className="text-white font-black">{new Date(result.record.check_in).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                </p>
              )}
              {result.action === 'check_out' && result.record?.minutes_worked && (
                <p className="text-slate-400 text-xs font-mono mt-3">
                  Tiempo trabajado: <span className="text-white font-black">{Math.floor(result.record.minutes_worked / 60)}h {result.record.minutes_worked % 60}m</span>
                </p>
              )}
              <button onClick={dismissResult} className="mt-5 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:text-slate-400 transition-all">
                CERRAR ({countdown}s)
              </button>
            </div>
          )}
        </div>

        {/* Controles inferiores */}
        <div className="relative z-10 flex items-center gap-4">
          <button
            onClick={cameraMode ? stopCamera : startCamera}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all',
              cameraMode
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
            )}
          >
            {cameraMode ? <CameraOff size={14} /> : <Camera size={14} />}
            {cameraMode ? 'Apagar Cámara' : 'Usar Cámara'}
          </button>

          {/* Entrada manual como fallback */}
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={manualCode}
              onChange={e => setManualCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO MANUAL..."
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-mono text-white placeholder-slate-600 outline-none focus:border-blue-500/40 w-40"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-wider transition-all"
            >
              OK
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-[8px] text-slate-600 font-black uppercase tracking-widest">
          <Wifi size={10} /> Scanner HID activo · BarcodeDetector {'BarcodeDetector' in window ? '✓' : '✗'}
        </div>
        <p className="text-[8px] text-slate-700 font-black uppercase tracking-widest">McVill ERP · Módulo Asistencia</p>
      </div>
    </div>
  );
};

export default ScannerStation;
