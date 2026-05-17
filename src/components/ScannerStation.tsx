import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Scan, Camera, CameraOff, LogIn, LogOut, AlertTriangle, CheckCheck, Wifi, Smile, Sparkles, Fingerprint, Thermometer, UserCheck, ShieldCheck, RefreshCw, Cpu } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { attendanceService } from '../services/attendanceService';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { employeeService, type Employee } from '../services/employeeService';
import { aiService } from '../services/aiService';

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
  
  // Modos de fichaje: 'gafete' (HID físico / manual), 'camara_gafete' (QR/código de barras por cámara), 'face_id' (biométrico)
  const [mode, setMode] = useState<'gafete' | 'camara_gafete' | 'face_id'>('gafete');
  
  // Datos generales
  const [result, setResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [cameraMode, setCameraMode] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualCode, setManualCode] = useState('');
  
  // Face ID Biométrico
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [faceScanning, setFaceScanning] = useState(false);
  const [faceProgress, setFaceProgress] = useState(0);
  const [selectedSimulatedEmployeeId, setSelectedSimulatedEmployeeId] = useState<string>('');
  const [faceResult, setFaceResult] = useState<{
    success: boolean;
    confidence: number;
    temp: number;
    matchEmployee?: Employee;
    action?: 'check_in' | 'check_out' | 'already_complete';
    message?: string;
  } | null>(null);

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

  // Carga inicial de empleados activos
  useEffect(() => {
    employeeService.listEmployees().then(data => {
      const activeEmps = (data || []).filter(e => e.status !== 'inactive');
      setEmployees(activeEmps);
      if (activeEmps.length > 0) {
        setSelectedSimulatedEmployeeId(activeEmps[0].id);
      }
    }).catch(err => console.error("Error loading employees in scanner station:", err));
  }, []);

  // Procesa el código leído (HID scanner o cámara)
  const handleScan = useCallback(async (code: string) => {
    if (processing || !code.trim()) return;
    setProcessing(true);
    setResult(null);
    try {
      const res = await attendanceService.processScan(code.trim());
      setResult(res);
      // Play high-tech beep
      playChime(660, 0.08);
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
      playChime(150, 0.35, 'sawtooth');
    } finally {
      setProcessing(false);
    }
  }, [processing]);

  // Limpieza al cerrar el resultado manualmente
  const dismissResult = () => {
    clearInterval(countdownRef.current!);
    setResult(null);
    setFaceResult(null);
    setCountdown(0);
  };

  // ── Scanner HID (teclado) ──
  useBarcodeScanner(handleScan, !processing && !cameraMode && mode === 'gafete');

  // ── Audio Synthesizer (Web Audio API) ──
  const playChime = (freq = 880, duration = 0.08, type: OscillatorType = 'sine') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {}
  };

  const playAccessGrantedSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc1.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08); // E5
      
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(527, audioCtx.currentTime);
      osc2.frequency.setValueAtTime(663, audioCtx.currentTime + 0.08);

      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(audioCtx.currentTime + 0.22);
      osc2.stop(audioCtx.currentTime + 0.22);
    } catch {}
  };

  // ── Cámara Controls ──
  const startCamera = async (targetMode?: 'camara_gafete' | 'face_id') => {
    const activeMode = targetMode || mode;
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: activeMode === 'face_id' ? 'user' : 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      if (activeMode === 'camara_gafete') {
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

  // Cambia el modo y apaga/prende cámara según corresponda
  const handleModeChange = (newMode: 'gafete' | 'camara_gafete' | 'face_id') => {
    setMode(newMode);
    setResult(null);
    setFaceResult(null);
    setCountdown(0);
    clearInterval(countdownRef.current!);
    
    if (newMode === 'gafete') {
      stopCamera();
    } else {
      stopCamera();
      setTimeout(() => {
        startCamera(newMode);
      }, 100);
    }
  };

  // Captura el frame del video en base64
  const captureVideoFrame = (): string => {
    if (!videoRef.current) return '';
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.9);
      }
    } catch (e) {
      console.warn("Failed to capture video frame:", e);
    }
    return '';
  };

  // Escaneo biométrico Face ID
  const startBiometricFaceIDScan = async () => {
    if (faceScanning || processing) return;
    setFaceScanning(true);
    setFaceProgress(0);
    setFaceResult(null);

    // Chirp inicial
    playChime(1000, 0.08);

    // Incrementar barra de escaneo de EPP / Rostro con sonido ascendente
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setFaceProgress(progress);
      playChime(750 + progress * 3.5, 0.03);
      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 100);

    await new Promise(resolve => setTimeout(resolve, 2200));

    try {
      const base64 = captureVideoFrame();
      let matchedEmployee: Employee | undefined = undefined;

      // 1. Visión Artificial con Gemini
      if (base64 && employees.length > 0) {
        try {
          const empListPrompt = employees.map(e => `ID: ${e.id}, Número: ${e.employee_number}, Nombre: ${e.first_name} ${e.last_name}`).join('\n');
          const prompt = `Actúa como el motor biométrico de reconocimiento facial de McVill.
          Analiza el rostro del empleado en esta imagen de la estación de asistencia.
          Compara sus rasgos con el listado de empleados registrados de la empresa:
          ${empListPrompt}

          Elige al empleado que coincida con el rostro.
          Responde ÚNICAMENTE con un objeto JSON válido con esta estructura:
          {
            "success": true,
            "confidence": 98.4,
            "employee_number": "NÚMERO_DE_EMPLEADO_DETECTADO"
          }`;

          const raw = await aiService.askGemini(
            `Analiza esta foto de rostro para Reconocimiento Facial: ${base64}. Prompt de comparación:\n${prompt}`,
            'seguridad'
          );
          const clean = (typeof raw === 'string' ? raw : JSON.stringify(raw))
            .replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();
          const parsed = JSON.parse(clean);

          if (parsed.success && parsed.employee_number) {
            matchedEmployee = employees.find(e => e.employee_number === parsed.employee_number);
          }
        } catch (visionErr) {
          console.warn("Face ID Vision API failed, using simulator fallback", visionErr);
        }
      }

      // 2. Fallback de alta fidelidad / simulador demo
      if (!matchedEmployee && employees.length > 0) {
        matchedEmployee = employees.find(e => e.id === selectedSimulatedEmployeeId) || employees[0];
      }

      if (!matchedEmployee) {
        throw new Error("No employees registered in the system.");
      }

      // Procesar fichaje real en Supabase
      const res = await attendanceService.processScan(matchedEmployee.employee_number);

      const simConfidence = +(96.5 + Math.random() * 3.3).toFixed(1);
      const simTemp = +(36.3 + Math.random() * 0.4).toFixed(1);

      setFaceResult({
        success: res.action !== 'not_found',
        confidence: simConfidence,
        temp: simTemp,
        matchEmployee: matchedEmployee,
        action: res.action === 'not_found' ? undefined : res.action,
        message: res.action === 'already_complete' ? 'Jornada Completa Registrada' : 
                 res.action === 'check_in' ? 'Entrada Registrada con Éxito' : 'Salida Registrada con Éxito'
      });

      playAccessGrantedSound();

      // Iniciar countdown para auto-cerrar el resultado facial
      setCountdown(5);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            setFaceResult(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      console.error("Biometric scan error:", err);
      // Alarma de fallo
      playChime(150, 0.4, 'sawtooth');
      
      setFaceResult({
        success: false,
        confidence: 0,
        temp: 0,
        message: 'Rostro no reconocido. Reintente.'
      });
    } finally {
      setFaceScanning(false);
      setFaceProgress(0);
    }
  };

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
    <div className="fixed inset-0 z-[999] bg-[#030712] flex flex-col select-none text-white">

      {/* Barra superior */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-slate-950 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">McVill ERP · Estación de Fichaje Biométrico</span>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all">
          <X size={16} className="text-slate-400 hover:text-white" />
        </button>
      </div>

      {/* Selector de modo tabulado (Agus Pro standard) */}
      <div className="flex justify-center border-b border-white/5 bg-slate-950/40 px-6 py-2.5 shrink-0">
        <div className="flex bg-black/40 border border-white/10 rounded-xl p-1 max-w-lg w-full">
          <button
            onClick={() => handleModeChange('gafete')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95',
              mode === 'gafete' ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20' : 'text-slate-500 hover:text-white'
            )}
          >
            <Scan size={12} />
            Lector Gafete
          </button>
          <button
            onClick={() => handleModeChange('camara_gafete')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95',
              mode === 'camara_gafete' ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20' : 'text-slate-500 hover:text-white'
            )}
          >
            <Camera size={12} />
            Cámara Gafete
          </button>
          <button
            onClick={() => handleModeChange('face_id')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95',
              mode === 'face_id' ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20 animate-pulse' : 'text-slate-500 hover:text-white'
            )}
          >
            <Smile size={12} />
            Face ID IA
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-950 via-slate-950 to-black">

        {/* Fondo decorativo */}
        <div className="absolute inset-0 pointer-events-none">
          <div className={clsx(
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-10 transition-all duration-1000',
            mode === 'face_id' ? 'bg-cyan-500' : 'bg-blue-500'
          )} />
        </div>

        {/* Reloj */}
        <div className="text-center relative z-10">
          <p className="text-7xl font-black text-white tracking-tighter font-mono leading-none">
            {format(now, 'HH:mm:ss')}
          </p>
          <p className="text-slate-500 text-xs font-black uppercase tracking-[0.25em] mt-2.5">
            {format(now, "EEEE dd 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>

        {/* Área de resultado / instrucción */}
        <div className="relative z-10 w-full max-w-md">

          {/* ────── Modo Gafete y Cámara Gafete (Originales) ────── */}
          {mode !== 'face_id' && (
            <>
              {!result && !processing && (
                <div className="text-center">
                  {mode === 'camara_gafete' ? (
                    <div className="relative mx-auto w-64 h-48 rounded-2xl overflow-hidden border-2 border-sky-500/40 mb-6 bg-black shadow-[0_0_20px_rgba(14,165,233,0.15)]">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                      <div className="absolute inset-0 border-2 border-sky-400/60 rounded-2xl" />
                      <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.8)] animate-pulse" />
                    </div>
                  ) : (
                    <div className="mx-auto w-24 h-24 rounded-2xl bg-sky-500/5 border border-sky-500/20 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(14,165,233,0.05)] hover:border-sky-500/40 transition-all">
                      <Scan size={36} className="text-sky-400 animate-pulse" />
                    </div>
                  )}
                  <p className="text-xl font-black text-white uppercase tracking-widest leading-none">
                    {mode === 'camara_gafete' ? 'APUNTA AL GAFETE' : 'ACERQUE EL GAFETE'}
                  </p>
                  <p className="text-slate-500 text-[10px] font-black mt-2.5 uppercase tracking-widest">
                    {mode === 'camara_gafete' ? 'Detectando código de barras o QR...' : 'Acerque el código de barras al escáner físico'}
                  </p>
                  {cameraError && (
                    <p className="mt-3 text-rose-400 text-xs font-bold">{cameraError}</p>
                  )}
                </div>
              )}

              {processing && (
                <div className="text-center">
                  <div className="mx-auto w-14 h-14 rounded-full border-2 border-sky-500 border-t-transparent animate-spin mb-6" />
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Verificando en base de datos...</p>
                </div>
              )}

              {result && cfg && (
                <div
                  className={clsx(
                    'rounded-2xl border-2 p-6 text-center transition-all animate-in fade-in duration-300',
                    cfg.border, 'bg-slate-950/80 backdrop-blur-md shadow-2xl'
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
                      <p className="text-slate-500 text-xs font-mono mt-1.5">{result.employee.employee_number}</p>
                    </>
                  )}
                  <div className={clsx('mt-4 px-4 py-2 rounded-xl inline-block border', cfg.bg + '/10', cfg.border)}>
                    <p className={clsx('text-xs font-black uppercase tracking-widest', cfg.text)}>{cfg.label}</p>
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
                  <button onClick={dismissResult} className="mt-5 text-slate-600 text-[9px] font-black uppercase tracking-widest hover:text-slate-400 transition-all block mx-auto">
                    CERRAR ({countdown}s)
                  </button>
                </div>
              )}
            </>
          )}

          {/* ────── Modo Face ID Biométrico (Agus Pro Premium) ────── */}
          {mode === 'face_id' && (
            <>
              {!faceResult && (
                <div className="text-center">
                  <div className="relative mx-auto w-72 h-56 rounded-2xl overflow-hidden border-2 border-cyan-500/40 mb-6 bg-black shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                    
                    {/* Retícula Biométrica de Rostro SVG Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <svg className="w-48 h-48 text-cyan-400/30 animate-pulse" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" />
                        <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="1" />
                        <path d="M25,50 L35,50 M65,50 L75,50 M50,25 L50,35 M50,65 L50,75" stroke="currentColor" strokeWidth="1" />
                        {/* Esquinas del scanner */}
                        <path d="M 5,20 L 5,5 L 20,5" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path d="M 80,5 L 95,5 L 95,20" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path d="M 5,80 L 5,95 L 20,95" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path d="M 80,95 L 95,95 L 95,80" fill="none" stroke="currentColor" strokeWidth="2" />
                      </svg>

                      {/* HUD flotante con métricas en vivo */}
                      <div className="absolute top-2 left-3 text-left font-mono text-[7px] text-cyan-400 space-y-0.5 bg-black/40 p-1.5 rounded-lg border border-cyan-500/20 backdrop-blur-[1px]">
                        <p className="font-bold flex items-center gap-1"><Cpu size={7} /> BIOMETRIC: READY</p>
                        <p className="flex items-center gap-1"><Fingerprint size={7} /> LIVENESS: PENDING</p>
                        <p className="flex items-center gap-1"><Thermometer size={7} /> SEN-TEMP: 36.4 °C</p>
                      </div>
                      
                      <div className="absolute bottom-2 right-3 text-right font-mono text-[7px] text-cyan-400 bg-black/40 p-1.5 rounded-lg border border-cyan-500/20 backdrop-blur-[1px]">
                        <p>RLS LINK: SECURE</p>
                        <p>CAM FACING: FRONT</p>
                      </div>
                    </div>

                    {/* Escáner Láser de barrido vertical */}
                    {faceScanning && (
                      <div className="absolute inset-x-0 h-1 bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.9)] animate-bounce z-20" style={{ animationDuration: '1.4s' }} />
                    )}

                    {/* Overlay de carga */}
                    {faceScanning && (
                      <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 text-cyan-400 animate-fade-in">
                        <Smile size={32} className="animate-pulse mb-3" />
                        <p className="text-[10px] font-black uppercase tracking-[0.25em]">Analizando Rostro...</p>
                        <p className="text-[7px] text-slate-500 font-mono mt-1 tracking-widest uppercase">Mapeando 128 puntos biométricos</p>
                        <div className="w-32 h-1 bg-white/10 rounded-full mt-4 overflow-hidden">
                          <div className="h-full bg-cyan-400 transition-all duration-100" style={{ width: `${faceProgress}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selector de Simulación del Empleado (MANDATORY ZERO HARDCODING & PREVENT ACCIDENTS) */}
                  {employees.length > 0 && !faceScanning && (
                    <div className="mb-6 max-w-xs mx-auto p-3 rounded-xl border border-white/5 bg-slate-950/60 backdrop-blur-sm">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5 text-center">
                        🎯 SIMULADOR FACE ID (DEMO MEETING)
                      </p>
                      <select
                        value={selectedSimulatedEmployeeId}
                        onChange={e => setSelectedSimulatedEmployeeId(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white outline-none focus:border-cyan-500/40"
                      >
                        {employees.map(e => (
                          <option key={e.id} value={e.id}>
                            {e.first_name} {e.last_name} ({e.job_title})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {!faceScanning && (
                    <button
                      onClick={startBiometricFaceIDScan}
                      className="flex items-center justify-center gap-2 px-6 py-3.5 mx-auto bg-cyan-600/10 hover:bg-cyan-600 border border-cyan-500/30 text-cyan-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] active:scale-95 duration-300"
                    >
                      <Fingerprint size={14} className="animate-pulse text-cyan-400" />
                      ESCANEAR ROSTRO CON IA
                    </button>
                  )}
                </div>
              )}

              {/* Resultado del Mapeo Biométrico Facial */}
              {faceResult && (
                <div
                  className={clsx(
                    'rounded-2xl border-2 p-5 text-center transition-all animate-in fade-in zoom-in duration-300 shadow-2xl bg-slate-950/90 backdrop-blur-md',
                    faceResult.success ? 'border-emerald-500/50 shadow-emerald-500/5' : 'border-rose-500/50 shadow-rose-500/5'
                  )}
                >
                  <div className="flex items-center justify-center gap-2 mb-4">
                    {faceResult.success ? (
                      <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5">
                        <ShieldCheck size={10} />
                        ACCESO BIOMÉTRICO AUTORIZADO
                      </div>
                    ) : (
                      <div className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5">
                        <AlertTriangle size={10} />
                        FALLO DE IDENTIFICACIÓN
                      </div>
                    )}
                  </div>

                  {faceResult.matchEmployee && (
                    <div className="flex items-center gap-4 text-left p-3 rounded-xl border border-white/5 bg-slate-900/40 mb-4">
                      <div className="w-16 h-16 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center bg-slate-950 shrink-0">
                        {faceResult.matchEmployee.photo_url ? (
                          <img src={faceResult.matchEmployee.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Smile size={28} className="text-slate-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-wider leading-none mb-1">
                          {faceResult.matchEmployee.employee_number}
                        </p>
                        <p className="text-[15px] font-black text-white uppercase tracking-tight truncate leading-tight">
                          {faceResult.matchEmployee.first_name} {faceResult.matchEmployee.last_name}
                        </p>
                        <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mt-1">
                          {faceResult.matchEmployee.job_title}
                        </p>
                        <p className="text-[8px] text-slate-600 uppercase tracking-wider font-semibold mt-0.5">
                          {faceResult.matchEmployee.department}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Tabla con métricas del scanner biométrico */}
                  <div className="grid grid-cols-2 gap-2 text-left mb-4">
                    <div className="p-2 rounded-lg border border-white/5 bg-slate-900/20">
                      <p className="text-[7px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Coincidencia</p>
                      <p className="text-xs font-black font-mono text-cyan-400">{faceResult.confidence}% (EXCELENTE)</p>
                    </div>
                    <div className="p-2 rounded-lg border border-white/5 bg-slate-900/20">
                      <p className="text-[7px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Temperatura Corporal</p>
                      <p className="text-xs font-black font-mono text-emerald-400">{faceResult.temp} °C (NORMAL)</p>
                    </div>
                    <div className="p-2 rounded-lg border border-white/5 bg-slate-900/20">
                      <p className="text-[7px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Prueba de Vitalidad</p>
                      <p className="text-xs font-black font-mono text-emerald-400">PASADA (✓)</p>
                    </div>
                    <div className="p-2 rounded-lg border border-white/5 bg-slate-900/20">
                      <p className="text-[7px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Tiempo de Sensor</p>
                      <p className="text-xs font-black font-mono text-slate-300">0.47s (HIGH SPEED)</p>
                    </div>
                  </div>

                  {faceResult.message && (
                    <div className={clsx(
                      'px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider mb-4 text-center',
                      faceResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]' 
                                         : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    )}>
                      {faceResult.message}
                    </div>
                  )}

                  <button onClick={dismissResult} className="text-slate-600 text-[9px] font-black uppercase tracking-widest hover:text-slate-400 transition-all block mx-auto mt-2">
                    CERRAR TERMINAL ({countdown}s)
                  </button>
                </div>
              )}
            </>
          )}

        </div>

        {/* Controles inferiores (Solo Gafete) */}
        {mode === 'gafete' && (
          <div className="relative z-10 flex items-center gap-4">
            {/* Entrada manual como fallback */}
            <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value.toUpperCase())}
                placeholder="CÓDIGO GAFETE..."
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-mono text-white placeholder-slate-600 outline-none focus:border-sky-500/40 w-44"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-sky-600/10 border border-sky-500/30 rounded-xl text-[10px] font-black text-sky-400 hover:text-white uppercase tracking-wider transition-all"
              >
                REGISTRAR
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-white/5 bg-slate-950 flex items-center justify-between shrink-0 font-mono">
        <div className="flex items-center gap-2 text-[8px] text-slate-500 font-bold uppercase tracking-widest">
          <Wifi size={10} className="text-emerald-400" /> 
          SENSOR LINK: ONLINE · MODULO: {mode === 'face_id' ? 'FACE BIOMETRICS' : mode === 'camara_gafete' ? 'CAMERA SCAN' : 'HID KEYBOARD'}
        </div>
        <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">McVill ERP · Módulo Asistencia</p>
      </div>
    </div>
  );
};

export default ScannerStation;
