import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Activity,
  CircleDollarSign,
  Factory,
  Cpu,
  Camera,
  Play,
  Volume2,
  ShieldCheck,
  ArrowRight,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Users,
  MessageSquare,
  Sparkles,
  Wifi,
  Battery,
  Send,
  Phone,
  MapPin,
  MousePointer2,
  Lock,
  MonitorSmartphone,
  ChevronRight,
  Info
} from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';

type MobileTab = 'cctv' | 'finance' | 'status' | 'copilot';

interface QualityScan {
  partCode: string;
  defect: string | null;
  confidence: number;
  status: 'aprobado' | 'scrap';
  timestamp: string;
}

export const CeoMobileSim: React.FC = () => {
  const { config } = useConfig();
  const [activeTab, setActiveTab] = useState<MobileTab>('finance');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  
  const brandPrefix = (config.brandName || 'MCV').substring(0, 3).toUpperCase();

  // CCTV Simulation States
  const [scans, setScans] = useState<QualityScan[]>([
    { partCode: `${brandPrefix}-BRIDA-409`, defect: null, confidence: 99.8, status: 'aprobado', timestamp: '10:52:11' },
    { partCode: `${brandPrefix}-PLACA-L22`, defect: 'Fisura en Soldadura Cordón #2', confidence: 97.4, status: 'scrap', timestamp: '10:53:05' },
    { partCode: `${brandPrefix}-VALVULA-88`, defect: null, confidence: 99.2, status: 'aprobado', timestamp: '10:54:32' },
  ]);
  const [isScanning, setIsScanning] = useState(true);
  const [activeScan, setActiveScan] = useState<QualityScan>({
    partCode: `${brandPrefix}-PERFIL-702`,
    defect: null,
    confidence: 99.6,
    status: 'aprobado',
    timestamp: '10:55:00'
  });
  const [scanLaserPos, setScanLaserPos] = useState(0);

  // Copilot Chat States
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: `Hola. Estoy monitoreando las Plantas de ${config.brandName || 'la empresa'} en tiempo real. ¿Desea el informe financiero de producción o enviar una directiva a piso?` }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // CCTV Scanning Loop
  useEffect(() => {
    if (!isScanning) return;
    const interval = setInterval(() => {
      // Pick random next piece
      const partCodes = [
        `${brandPrefix}-EJE-890`,
        `${brandPrefix}-PLACA-W3`,
        `${brandPrefix}-SOPORTE-X`,
        `${brandPrefix}-BRIDA-99`,
        `${brandPrefix}-HORN-55`
      ];
      const defects = [
        'Desviación Dimensional (+0.4mm)', 
        'Porosidad de Fusión Láser', 
        'Microfalla de Templado Térmico', 
        null, 
        null
      ];
      
      const newPart = partCodes[Math.floor(Math.random() * partCodes.length)];
      const newDefect = defects[Math.floor(Math.random() * defects.length)];
      const status = newDefect ? 'scrap' : 'aprobado';
      const confidence = Number((90 + Math.random() * 9.9).toFixed(1));
      
      const nextScan: QualityScan = {
        partCode: newPart,
        defect: newDefect,
        confidence,
        status,
        timestamp: new Date().toLocaleTimeString().split(' ')[0]
      };

      // Slide laser
      setScanLaserPos(0);
      setTimeout(() => setScanLaserPos(100), 500);

      setTimeout(() => {
        setActiveScan(nextScan);
        setScans(prev => [nextScan, ...prev.slice(0, 4)]);
      }, 1000);

    }, 5000);

    return () => clearInterval(interval);
  }, [isScanning]);

  // Simulated Copilot Query
  const sendSuggestedQuery = (queryText: string) => {
    if (isTyping) return;
    setChatMessages(prev => [...prev, { sender: 'user', text: queryText }]);
    setIsTyping(true);

    setTimeout(() => {
      let reply = '';
      if (queryText.includes('finanzas')) {
        reply = 'El Margen Neto acumulado hoy en Torreón es de $4,820 USD. Planta Torreón Forja lidera con anidamiento láser optimizado al 96%.';
      } else if (queryText.includes('alerta')) {
        reply = 'Directiva enviada: Se alertó al supervisor de Forja Pesada en Torreón sobre un desvío térmico del 4% en el Horno #2. Se programó paro de calibración de 10 min.';
      } else {
        reply = 'El OEE general está en 84.6%. El scrap global es de 1.62%. Todo bajo control para cumplimiento del despacho de embarques el día de mañana.';
      }
      setChatMessages(prev => [...prev, { sender: 'ai', text: reply }]);
      setIsTyping(false);
    }, 1500);
  };

  const TAB_CONTENT = (
    <>
      {activeTab === 'finance' && (
        <div className="space-y-3 animate-in fade-in duration-300">
          <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Margen & ROI en Piso</h5>
          <div className="bg-gradient-to-br from-mcvill-accent/20 to-slate-900 border border-mcvill-accent/30 rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-mcvill-accent/10 rounded-full blur-2xl" />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Margen Operativo Neto Hoy</p>
            <h3 className="text-3xl font-black text-white leading-none mt-1">$4,820 <span className="text-sm text-slate-400 font-bold">USD</span></h3>
            <span className="mt-2 inline-block text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-black">+14.2% VS META</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/60 border border-slate-800/40 p-3 rounded-2xl">
              <div className="flex justify-between items-start mb-1">
                <Zap size={14} className="text-amber-400" />
                <span className="text-[9px] font-mono text-emerald-400 font-bold">-12%</span>
              </div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Costo KWh Luz</p>
              <span className="text-lg font-black text-white">$380 <span className="text-[9px] text-slate-500">USD</span></span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/40 p-3 rounded-2xl">
              <div className="flex justify-between items-start mb-1">
                <AlertTriangle size={14} className="text-red-400" />
                <span className="text-[9px] font-mono text-red-400 font-bold">+$40</span>
              </div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Fuga por Scrap</p>
              <span className="text-lg font-black text-red-400">-$180 <span className="text-[9px]">USD</span></span>
            </div>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/40 p-3 rounded-2xl">
            <p className="text-[9px] font-black text-mcvill-accent uppercase tracking-wider mb-1">Diagnóstico Financiero:</p>
            <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
              La optimización del anidamiento de placa de acero por nesting neural en el turno matutino evitó el desperdicio de 140kg de acero inoxidable, sumando +$240 USD al margen.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'cctv' && (
        <div className="space-y-3 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Inspección Visual IA</h5>
            <button
              onClick={() => setIsScanning(prev => !prev)}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border tracking-wider transition-all ${
                isScanning ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              {isScanning ? '⬤ LIVE FEED' : '⏸ PAUSED'}
            </button>
          </div>
          <div className="relative h-40 rounded-2xl bg-slate-900 overflow-hidden border border-white/5 flex flex-col items-center justify-center">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.3)_1px,transparent_1px)] bg-[size:14px_14px]" />
            {isScanning && (
              <div className="relative w-24 h-12 bg-slate-800 rounded-lg border border-slate-700 flex flex-col items-center justify-center animate-pulse z-10">
                <Cpu className="text-slate-600 mb-0.5" size={20} />
                <span className="text-[7px] font-mono text-slate-500 font-bold">{activeScan.partCode}</span>
                <div className="absolute left-0 right-0 h-[2px] bg-emerald-400 shadow-[0_0_8px_#34d399] transition-all duration-1000 ease-in-out" style={{ top: `${scanLaserPos}%` }} />
              </div>
            )}
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded border border-white/5 text-[8px] font-black text-slate-400">
              <Camera size={9} /> CAM #04
            </div>
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-500/15 px-2 py-0.5 rounded border border-red-500/20 text-[8px] font-black text-red-400 animate-pulse">
              REC 1080P
            </div>
          </div>
          <div className={`p-3 rounded-2xl border relative overflow-hidden ${activeScan.status === 'aprobado' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${activeScan.status === 'aprobado' ? 'bg-emerald-400' : 'bg-red-500 animate-pulse'}`} />
            <div className="flex items-center justify-between mb-1 pl-2">
              <span className="text-[11px] font-black text-white uppercase">{activeScan.partCode}</span>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${activeScan.status === 'aprobado' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                {activeScan.status === 'aprobado' ? '✓ PASÓ QA' : '✕ SCRAP'}
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400 pl-2 leading-relaxed">
              {activeScan.status === 'aprobado'
                ? `Red neuronal: 0 defectos. Certeza: ${activeScan.confidence}%`
                : `Defecto: ${activeScan.defect}. Confianza: ${activeScan.confidence}%`}
            </p>
          </div>
          <div className="space-y-1.5">
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Historial Reciente</span>
            {scans.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-900/40 rounded-xl border border-white/5">
                <span className="text-[10px] font-mono font-bold text-slate-300">{s.partCode}</span>
                <span className="text-[9px] font-mono text-slate-500">{s.timestamp}</span>
                <span className={`text-[9px] font-black uppercase ${s.status === 'aprobado' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {s.status === 'aprobado' ? 'OK' : 'SCRAP'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'status' && (
        <div className="space-y-3 animate-in fade-in duration-300">
          <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Semáforo de Producción</h5>
          {[
            { name: 'Corte Láser Trumpf', sub: 'Línea #1 Torreón', oee: 88, color: 'emerald' },
            { name: 'Mecanizado Mazak', sub: 'Línea #2 Torreón', oee: 82, color: 'emerald' },
            { name: 'Forja Torreón', sub: 'Hornos de Inducción', oee: 71, color: 'amber' },
          ].map((line) => (
            <div key={line.name} className="p-3.5 bg-slate-900/50 rounded-2xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full bg-${line.color}-400 shadow-[0_0_8px_theme(colors.${line.color}.400)] ${line.color === 'amber' ? 'animate-pulse' : ''}`} />
                <div>
                  <p className="text-[11px] font-black text-white uppercase">{line.name}</p>
                  <span className="text-[9px] font-mono text-slate-500">{line.sub}</span>
                </div>
              </div>
              <span className={`text-[10px] font-mono font-black px-2.5 py-1 rounded-lg text-${line.color}-400 bg-${line.color}-500/10`}>OEE {line.oee}%</span>
            </div>
          ))}
          <div className="p-3.5 bg-red-950/20 border border-red-500/20 rounded-2xl">
            <span className="text-[9px] font-black text-red-400 uppercase tracking-widest block mb-1">⚠ Alerta Crítica</span>
            <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
              Forja Torreón reporta desvío térmico del 4% en Horno #2. OEE cayó a 71%. Mantenimiento preventivo en camino.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'copilot' && (
        <div className="flex flex-col gap-3 animate-in fade-in duration-300">
          <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">IA Copilot</h5>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {chatMessages.map((m, idx) => (
              <div key={idx} className={`p-3 rounded-2xl text-[11px] leading-relaxed font-mono max-w-[85%] ${
                m.sender === 'user'
                  ? 'bg-mcvill-accent/20 border border-mcvill-accent/30 text-white ml-auto text-right'
                  : 'bg-slate-900 border border-slate-800 text-slate-300'
              }`}>
                {m.text}
              </div>
            ))}
            {isTyping && (
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl text-[10px] text-slate-500 italic max-w-[40%] animate-pulse">
                Analizando...
              </div>
            )}
          </div>
          <div className="space-y-2">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Preguntas Rápidas</span>
            {[
              { q: '📉 ¿A cuánto asciende la pérdida por Scrap hoy?', key: 'scrap' },
              { q: '📊 ¿Cómo está el OEE acumulado en las plantas?', key: 'oee' },
              { q: '⚠️ Enviar directiva de mantenimiento a Forja', key: 'alerta' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => sendSuggestedQuery(item.q)}
                className="w-full text-left p-3 bg-slate-900 hover:bg-slate-800 text-[11px] font-mono text-mcvill-accent rounded-xl border border-mcvill-accent/20 transition-all"
              >
                {item.q}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );

  const BOTTOM_NAV = (
    <div className="flex items-center justify-around border-t border-white/5 pt-3 pb-1">
      {[
        { id: 'finance', label: 'ROI', icon: CircleDollarSign },
        { id: 'cctv', label: 'CCTV IA', icon: Camera },
        { id: 'status', label: 'Estatus', icon: Factory },
        { id: 'copilot', label: 'Copilot', icon: Sparkles },
      ].map(b => (
        <button
          key={b.id}
          onClick={() => setActiveTab(b.id as MobileTab)}
          className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all ${
            activeTab === b.id ? 'text-mcvill-accent' : 'text-slate-600 hover:text-slate-400'
          }`}
        >
          <b.icon size={18} />
          <span className="text-[9px] font-black uppercase tracking-wide">{b.label}</span>
        </button>
      ))}
    </div>
  );

  if (isMobile) {
    return (
      <div className="flex flex-col h-full bg-slate-950 animate-in fade-in duration-300">
        {/* Mobile Header */}
        <div className="px-4 pt-3 pb-2 border-b border-white/5 bg-slate-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-mcvill-accent animate-pulse" />
            <div>
              <h4 className="text-[11px] font-black text-white uppercase tracking-widest">{config.brandName || 'McVill'} Mobile</h4>
              <p className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Director Hub v2.5</p>
            </div>
          </div>
          <button
            onClick={() => setIsScanning(prev => !prev)}
            className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border tracking-wider transition-all ${
              isScanning ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {isScanning ? 'LIVE' : 'PAUSED'}
          </button>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {TAB_CONTENT}
        </div>

        {/* Mobile Bottom Nav */}
        <div className="shrink-0 px-4 pb-4 bg-slate-900/60 border-t border-white/5">
          {BOTTOM_NAV}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[85vh] flex flex-col items-center justify-center p-4 lg:p-8 animate-in fade-in duration-500">
      
      {/* Introduction text */}
      <div className="text-center max-w-2xl mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mcvill-accent/15 border border-mcvill-accent/30 text-mcvill-accent text-[9px] font-black uppercase tracking-widest mb-3">
          <Smartphone size={10} /> CEO Godmode Simulator
        </div>
        <h1 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">
          TU PLANTA EN <span className="text-mcvill-accent">EL CELULAR</span>
        </h1>
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-2 leading-relaxed">
          Diseño conceptual del ecosistema móvil integrado de {config.brandName || 'la empresa'}. Abre este simulador interactivo para monitorear el piso industrial desde cualquier parte del mundo.
        </p>
      </div>

      {/* Main Container: Flexbox side-by-side (iPhone simulation + Details panel) */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* LEFT COLUMN: Highly detailed glassmorphic iPhone Frame */}
        <div className="lg:col-span-5 flex justify-center">
          
          <div className="relative w-[280px] h-[570px] bg-slate-950 border-[5px] border-slate-800 rounded-[45px] shadow-[0_0_50px_rgba(var(--mcvill-accent-rgb),0.15)] flex flex-col overflow-hidden ring-1 ring-white/10">
            
            {/* Phone Top Notch Area */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-50 flex items-center justify-around px-4">
              <div className="w-2.5 h-2.5 bg-slate-900 rounded-full border border-slate-950" />
              <div className="w-8 h-1 bg-slate-900 rounded-full" />
            </div>

            {/* Status Bar */}
            <div className="h-8 px-5 pt-1.5 flex items-center justify-between text-[8px] font-mono text-slate-400 font-bold z-40 bg-slate-950/60 backdrop-blur">
              <span>10:56 AM</span>
              <div className="flex items-center gap-1.5">
                <Wifi size={10} className="text-emerald-400" />
                <span className="text-[7px]">5G</span>
                <Battery size={12} className="text-emerald-400" />
              </div>
            </div>

            {/* Simulated App Header */}
            <div className="px-4 py-2 border-b border-white/5 bg-slate-900/60 flex items-center justify-between z-40">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded bg-mcvill-accent animate-pulse" />
                <div>
                  <h4 className="text-[8px] font-black text-white uppercase tracking-widest">{config.brandName || 'Company'} Mobile</h4>
                  <p className="text-[6px] font-mono text-slate-500 uppercase tracking-widest">Director Hub v2.5</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button 
                  onClick={() => setIsScanning(prev => !prev)}
                  className={`px-1.5 py-0.5 rounded text-[5px] font-black uppercase border tracking-wider transition-all ${
                    isScanning ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}
                >
                  {isScanning ? 'LIVE FEED' : 'PAUSED'}
                </button>
              </div>
            </div>

            {/* Phone Screen Container: Scrollable / Tabbed */}
            <div className="flex-1 bg-slate-950 p-3 overflow-y-auto custom-scrollbar relative flex flex-col justify-between">
              
              {/* TAB CONTENT 1: CCTV Live Quality Scan */}
              {activeTab === 'cctv' && (
                <div className="space-y-3 flex-1 flex flex-col justify-between animate-in fade-in duration-300">
                  <div>
                    <h5 className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Inspección Visual IA - En Vivo</h5>
                    
                    {/* Camera simulation frame */}
                    <div className="relative h-32 rounded-xl bg-slate-900 overflow-hidden border border-white/5 flex flex-col items-center justify-center">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/20 to-slate-950/80 pointer-events-none z-10" />
                      
                      {/* Grid scanning effect overlay */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.3)_1px,transparent_1px)] bg-[size:10px_10px]" />
                      
                      {/* Conveyor Belt Object Animation */}
                      {isScanning && (
                        <div className="relative w-20 h-10 bg-slate-800 rounded border border-slate-700 flex flex-col items-center justify-center animate-pulse">
                          <Cpu className="text-slate-600 mb-0.5" size={16} />
                          <span className="text-[5px] font-mono text-slate-500 font-bold">{activeScan.partCode}</span>
                          
                          {/* Neural scanning laser line */}
                          <div 
                            className="absolute left-0 right-0 h-[2px] bg-emerald-400 shadow-[0_0_8px_#34d399] transition-all duration-1000 ease-in-out pointer-events-none"
                            style={{ top: `${scanLaserPos}%` }}
                          />
                        </div>
                      )}

                      {/* Corner camera overlay tags */}
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-slate-950/80 px-1.5 py-0.5 rounded border border-white/5 text-[5px] font-black text-slate-400">
                        <Camera size={7} /> CAM #04
                      </div>
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-500/15 px-1.5 py-0.5 rounded border border-red-500/20 text-[5px] font-black text-red-400 animate-pulse">
                        REC 1080P
                      </div>
                    </div>

                    {/* Quality Diagnosis popups */}
                    <div className="mt-2.5 bg-slate-900/60 border border-slate-800/40 rounded-xl p-2.5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-400" />
                      {activeScan.status === 'scrap' && (
                        <div className="absolute top-0 left-0 bottom-0 w-1 bg-red-500 animate-pulse" />
                      )}
                      
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[7px] font-black text-white uppercase tracking-wider">{activeScan.partCode}</span>
                        <span className={`text-[6px] font-mono font-black px-1 py-0.2 rounded uppercase ${
                          activeScan.status === 'aprobado' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                        }`}>
                          {activeScan.status === 'aprobado' ? 'PASÓ (QA OK)' : 'RECHAZADO'}
                        </span>
                      </div>

                      <p className="text-[7px] font-mono text-slate-500">
                        {activeScan.status === 'aprobado' 
                          ? `Red neuronal calibrada reporta 0 defectos. Certeza estructural de soldadura: ${activeScan.confidence}%`
                          : `Alerta: Detectado defecto '${activeScan.defect}'. Nivel de confianza predictivo: ${activeScan.confidence}%`
                        }
                      </p>
                    </div>
                  </div>

                  {/* Scans log grid */}
                  <div className="flex-1 flex flex-col justify-end space-y-1.5 pb-2">
                    <span className="text-[6px] font-black text-slate-600 uppercase tracking-widest">Historial Reciente</span>
                    {scans.map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between p-1.5 bg-slate-900/30 rounded border border-white/5">
                        <span className="text-[6px] font-mono font-bold text-slate-400">{s.partCode}</span>
                        <span className="text-[5px] font-mono text-slate-500">{s.timestamp}</span>
                        <span className={`text-[5px] font-black uppercase ${
                          s.status === 'aprobado' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {s.status === 'aprobado' ? 'OK' : 'SCRAP'}
                        </span>
                      </div>
                    ))}
                  </div>

                </div>
              )}

              {/* TAB CONTENT 2: margins and financials */}
              {activeTab === 'finance' && (
                <div className="space-y-3 flex-1 animate-in fade-in duration-300">
                  <h5 className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Margen & ROI en Piso</h5>
                  
                  {/* Total Operating Revenue */}
                  <div className="bg-gradient-to-br from-mcvill-accent/20 to-slate-900 border border-mcvill-accent/30 rounded-xl p-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-mcvill-accent/10 rounded-full blur-xl" />
                    <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest">Margen Operativo Neto Hoy</p>
                    <h3 className="text-base font-black text-white leading-none mt-1 tracking-tight">$4,820 <span className="text-[8px] text-slate-400 font-bold">USD</span></h3>
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className="text-[5px] font-mono text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded font-black">+14.2% VS META</span>
                    </div>
                  </div>

                  {/* Financial leaking items */}
                  <div className="grid grid-cols-2 gap-2">
                    
                    {/* Energy Cost card */}
                    <div className="bg-slate-900/60 border border-slate-800/40 p-2 rounded-xl flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <Zap size={10} className="text-amber-400" />
                        <span className="text-[5px] font-mono text-emerald-400 font-bold">-12%</span>
                      </div>
                      <p className="text-[5px] font-black text-slate-500 uppercase tracking-widest mt-1">Costo KWh Luz</p>
                      <span className="text-[10px] font-black text-white leading-none mt-0.5">$380 USD</span>
                    </div>

                    {/* Scrap / Leak cost */}
                    <div className="bg-slate-900/60 border border-slate-800/40 p-2 rounded-xl flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <AlertTriangle size={10} className="text-red-400" />
                        <span className="text-[5px] font-mono text-red-400 font-bold">+$40</span>
                      </div>
                      <p className="text-[5px] font-black text-slate-500 uppercase tracking-widest mt-1">Fuga por Scrap</p>
                      <span className="text-[10px] font-black text-red-400 leading-none mt-0.5">-$180 USD</span>
                    </div>

                  </div>

                  {/* Energy optimization tip */}
                  <div className="bg-slate-900/30 border border-slate-800/40 p-2 rounded-xl">
                    <p className="text-[5px] font-black text-mcvill-accent uppercase tracking-wider mb-1">Diagnóstico Financiero:</p>
                    <p className="text-[6px] text-slate-400 leading-normal font-mono">
                      La optimización del anidamiento de placa de acero por nesting neural en el turno matutino evitó el desperdicio de 140kg de acero inoxidable comercial, sumando +$240 USD al margen.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB CONTENT 3: Plant lines status */}
              {activeTab === 'status' && (
                <div className="space-y-3 flex-1 animate-in fade-in duration-300">
                  <h5 className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Semáforo de Producción</h5>
                  
                  <div className="space-y-2">
                    
                    {/* Line 1 */}
                    <div className="p-2 bg-slate-900/50 rounded-xl border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                        <div>
                          <p className="text-[7px] font-black text-white uppercase leading-none">Corte Láser Trumpf</p>
                          <span className="text-[5px] font-mono text-slate-500 uppercase tracking-wider">Línea #1 Torreón</span>
                        </div>
                      </div>
                      <span className="text-[7px] font-mono font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">OEE 88%</span>
                    </div>

                    {/* Line 2 */}
                    <div className="p-2 bg-slate-900/50 rounded-xl border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                        <div>
                          <p className="text-[7px] font-black text-white uppercase leading-none">Mecanizado Mazak</p>
                          <span className="text-[5px] font-mono text-slate-500 uppercase tracking-wider">Línea #2 Torreón</span>
                        </div>
                      </div>
                      <span className="text-[7px] font-mono font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">OEE 82%</span>
                    </div>

                    {/* Line 3 */}
                    <div className="p-2 bg-slate-900/50 rounded-xl border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24] animate-pulse" />
                        <div>
                          <p className="text-[7px] font-black text-white uppercase leading-none">Forja Torreón</p>
                          <span className="text-[5px] font-mono text-slate-500 uppercase tracking-wider">Hornos de Inducción - Planta #3</span>
                        </div>
                      </div>
                      <span className="text-[7px] font-mono font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">OEE 71%</span>
                    </div>

                  </div>

                  <div className="p-2 bg-red-950/20 border border-red-500/20 rounded-xl">
                    <span className="text-[6px] font-black text-red-400 uppercase tracking-widest block mb-0.5">Alerta Crítica:</span>
                    <p className="text-[6px] text-slate-400 font-mono leading-normal">
                      Forja Torreón reporta desvío térmico del 4% en el Horno #2. El OEE cayó a 71% por paros técnicos breves. Mantenimiento preventivo en camino.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB CONTENT 4: AI Voice copilot */}
              {activeTab === 'copilot' && (
                <div className="space-y-2 flex-1 flex flex-col justify-between animate-in fade-in duration-300 h-full">
                  
                  {/* Chat messages viewport */}
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {chatMessages.map((m, idx) => (
                      <div 
                        key={idx} 
                        className={`p-2 rounded-xl text-[7px] leading-normal font-mono max-w-[85%] ${
                          m.sender === 'user' 
                            ? 'bg-mcvill-accent/20 border border-mcvill-accent/30 text-white ml-auto text-right' 
                            : 'bg-slate-900 border border-slate-800 text-slate-300'
                        }`}
                      >
                        {m.text}
                      </div>
                    ))}
                    {isTyping && (
                      <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-[6px] text-slate-500 italic max-w-[40%] animate-pulse">
                        Escribiendo reporte...
                      </div>
                    )}
                  </div>

                  {/* Pre-configured queries */}
                  <div className="space-y-1 mt-2">
                    <span className="text-[5px] font-black text-slate-500 uppercase tracking-widest">Preguntas Rápidas del CEO</span>
                    <button 
                      onClick={() => sendSuggestedQuery('Ver reporte de pérdidas por Scrap')}
                      className="w-full text-left p-1 bg-slate-900 hover:bg-slate-800 text-[6px] font-mono text-mcvill-accent rounded border border-mcvill-accent/20 truncate"
                    >
                      📉 ¿A cuánto asciende la pérdida por Scrap hoy?
                    </button>
                    <button 
                      onClick={() => sendSuggestedQuery('Ver estado del OEE general')}
                      className="w-full text-left p-1 bg-slate-900 hover:bg-slate-800 text-[6px] font-mono text-mcvill-accent rounded border border-mcvill-accent/20 truncate"
                    >
                      📊 ¿Cómo está el OEE acumulado en las plantas?
                    </button>
                    <button 
                      onClick={() => sendSuggestedQuery('Enviar alerta de calibración a Forja')}
                      className="w-full text-left p-1 bg-slate-900 hover:bg-slate-800 text-[6px] font-mono text-mcvill-accent rounded border border-mcvill-accent/20 truncate"
                    >
                      ⚠️ Enviar directiva de mantenimiento a Forja
                    </button>
                  </div>

                </div>
              )}

              {/* IOS Bottom Navigation Bar Mock */}
              <div className="border-t border-white/5 pt-2 mt-3 grid grid-cols-4 gap-1 text-center shrink-0">
                {[
                  { id: 'finance', label: 'ROI', icon: CircleDollarSign },
                  { id: 'cctv', label: 'CCTV IA', icon: Camera },
                  { id: 'status', label: 'Estatus', icon: Factory },
                  { id: 'copilot', label: 'IA Copilot', icon: Sparkles },
                ].map(b => (
                  <button
                    key={b.id}
                    onClick={() => setActiveTab(b.id as MobileTab)}
                    className={`flex flex-col items-center justify-center gap-0.5 py-0.5 rounded transition-all ${
                      activeTab === b.id 
                        ? 'text-mcvill-accent' 
                        : 'text-slate-600 hover:text-slate-400'
                    }`}
                  >
                    <b.icon size={12} />
                    <span className="text-[5px] font-black uppercase tracking-wide leading-none">{b.label}</span>
                  </button>
                ))}
              </div>

            </div>

            {/* Simulated IOS Home Indicator bar */}
            <div className="h-4 flex items-center justify-center shrink-0 bg-slate-950">
              <div className="w-20 h-1 bg-slate-800 rounded-full" />
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: Executive Strategic Overview */}
        <div className="lg:col-span-7 space-y-5">
          
          <div className="bg-slate-900/40 border border-slate-800/40 rounded-2xl p-5 space-y-4">
            
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-mcvill-accent/15 border border-mcvill-accent/30 text-mcvill-accent">
                <Sparkles size={20} className="animate-spin duration-10000" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] leading-none">CEO GODMODE HUB MOBILE</h3>
                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-1">Visión de Negocio (ROI First)</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Si yo fuera el **dueño de {config.brandName || 'la empresa'}**, no querría ver listados interminables ni lidiar con complejos menús en mi celular. El dueño viaja, visita clientes corporativos de primer nivel (como Caterpillar o John Deere) y necesita **Control y Paz Mental**. 
            </p>

            {/* Strategic Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px]">
              
              <div className="p-3.5 bg-slate-950/60 border border-slate-800/50 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-mcvill-accent">
                  <CircleDollarSign size={14} />
                  <span className="font-black uppercase tracking-wider">Margen y Fugas de Dinero</span>
                </div>
                <p className="text-slate-400 font-mono leading-normal text-[9px]">
                  El dueño ve inmediatamente el <strong>Margen Neto Operativo en Vivo</strong> restando la nómina del turno actual, la energía en vivo del horno de arco eléctrico, y el costo del acero desechado por scrap.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/60 border border-slate-800/50 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Camera size={14} />
                  <span className="font-black uppercase tracking-wider">CCTV de Calidad Neural</span>
                </div>
                <p className="text-slate-400 font-mono leading-normal text-[9px]">
                  Acceso directo a la transmisión de video del inspector de calidad en piso o cámaras automatizadas de inspección de soldadura por IA. Cada pieza defectuosa parpadea en rojo en su celular.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/60 border border-slate-800/50 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-400">
                  <Factory size={14} />
                  <span className="font-black uppercase tracking-wider">Semáforo Físico de Planta</span>
                </div>
                <p className="text-slate-400 font-mono leading-normal text-[9px]">
                  Un mapa simplificado de estatus verde/amarillo/rojo de los CNCs Mazak y el corte láser Trumpf. Si una máquina se detiene, el dueño sabe inmediatamente el costo de paro acumulado.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/60 border border-slate-800/50 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-purple-400">
                  <Sparkles size={14} />
                  <span className="font-black uppercase tracking-wider">Copilot IA por Voz</span>
                </div>
                <p className="text-slate-400 font-mono leading-normal text-[9px]">
                  Un chat neural (Gemini 2.5) para preguntarle por voz: <em>"Dime el resumen de pérdidas de hoy"</em> y obtener predicciones y diagnósticos en lenguaje natural sin abrir pantallas de datos.
                </p>
              </div>

            </div>

            {/* Strategic ROI Summary Quote */}
            <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
              <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">{config.brandName || 'Company'} Industrial Ecosystem © 2026</span>
              <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-black tracking-wider uppercase">
                100% Monetizable SaaS Ready
              </span>
            </div>

          </div>

        </div>

      </div>

      {/* ─── GUÍA DE ACCESO ────────────────────────────────────────────── */}
      <div className="w-full max-w-5xl mt-10 space-y-6">

        {/* How to access */}
        <div className="bg-slate-900/40 border border-slate-800/40 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-mcvill-accent/10 border border-mcvill-accent/20">
              <MapPin size={14} className="text-mcvill-accent" />
            </div>
            <div>
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Cómo Acceder a Esta Vista</h4>
              <p className="text-[8px] text-slate-500 font-mono">Ruta de navegación dentro del ERP</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mb-5">
            {[
              { icon: MonitorSmartphone, label: 'ERP McVill' },
              { icon: ChevronRight, label: null },
              { icon: MousePointer2, label: 'Menú Lateral' },
              { icon: ChevronRight, label: null },
              { icon: Smartphone, label: 'CEO Móvil' },
            ].map((step, i) =>
              step.label === null ? (
                <ChevronRight key={i} size={10} className="text-slate-600" />
              ) : (
                <div key={i} className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/60 border border-white/5 rounded-lg">
                  <step.icon size={10} className="text-mcvill-accent" />
                  <span className="text-[9px] font-black text-white uppercase tracking-wider">{step.label}</span>
                </div>
              )
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                num: '01',
                title: 'Abre el Menú Lateral',
                desc: 'En la barra izquierda del ERP, desplázate hacia la sección de accesos directos (iconos al final del menú).',
                icon: MousePointer2,
                color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
              },
              {
                num: '02',
                title: 'Clic en "CEO Móvil"',
                desc: 'Localiza el ícono de celular con la etiqueta CEO Móvil. Aparece bajo los accesos directos junto a Reportes.',
                icon: Smartphone,
                color: 'text-mcvill-accent bg-mcvill-accent/10 border-mcvill-accent/20',
              },
              {
                num: '03',
                title: 'Permiso Requerido',
                desc: 'Esta vista requiere rol Godmode o Admin Sistemas. Contacta al administrador si no ves el acceso.',
                icon: Lock,
                color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
              },
            ].map((s) => (
              <div key={s.num} className="flex gap-3 p-3 bg-slate-950/50 border border-white/5 rounded-xl">
                <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${s.color}`}>
                  <s.icon size={14} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[7px] font-black text-slate-600 font-mono">{s.num}</span>
                    <span className="text-[9px] font-black text-white uppercase tracking-wider">{s.title}</span>
                  </div>
                  <p className="text-[8px] text-slate-500 font-mono leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Per-panel guide */}
        <div className="bg-slate-900/40 border border-slate-800/40 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <Info size={14} className="text-indigo-400" />
            </div>
            <div>
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Guía de Cada Panel</h4>
              <p className="text-[8px] text-slate-500 font-mono">Qué hace cada pestaña del simulador móvil</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                tab: 'ROI / Finanzas',
                icon: CircleDollarSign,
                color: 'text-mcvill-accent border-mcvill-accent/30 bg-mcvill-accent/10',
                steps: [
                  'Muestra el Margen Operativo Neto acumulado del día en USD.',
                  'Detalla el Costo de Energía (KWh) y la Fuga Financiera por Scrap en tiempo real.',
                  'El diagnóstico financiero al pie explica qué acción de nesting generó o perdió dinero.',
                ],
              },
              {
                tab: 'CCTV IA',
                icon: Camera,
                color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
                steps: [
                  'Simula la cámara del inspector de calidad en piso vía IA neural.',
                  'El láser verde barre la pieza en producción y detecta defectos automáticamente.',
                  'Cada resultado queda registrado en el historial: APROBADO (verde) o SCRAP (rojo).',
                  'Presiona LIVE FEED / PAUSED para pausar el escáner de piso.',
                ],
              },
              {
                tab: 'Semáforo de Producción',
                icon: Factory,
                color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
                steps: [
                  'Muestra el OEE (Eficiencia Global) de cada línea de producción: Corte Láser, Mecanizado, Forja.',
                  'Verde = línea operando bien. Amarillo = alerta leve. Rojo = paro crítico.',
                  'Alerta crítica en rojo muestra el costo de paro acumulado por minuto.',
                ],
              },
              {
                tab: 'IA Copilot',
                icon: Sparkles,
                color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
                steps: [
                  'Chat neural con Gemini 2.5 — pregunta en lenguaje natural sobre producción.',
                  'Usa los botones de Preguntas Rápidas para consultar OEE, scrap o enviar directivas.',
                  'El copilot responde con análisis de datos de piso y puede enviar alertas al supervisor.',
                  'Diseñado para operar completamente desde el celular sin abrir pantallas complejas.',
                ],
              },
            ].map((panel) => (
              <div key={panel.tab} className="p-3.5 bg-slate-950/50 border border-white/5 rounded-xl space-y-2">
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[8px] font-black uppercase tracking-wider ${panel.color}`}>
                  <panel.icon size={10} />
                  {panel.tab}
                </div>
                <ul className="space-y-1.5 mt-2">
                  {panel.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="shrink-0 w-3.5 h-3.5 mt-0.5 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[5px] font-black text-slate-500">{i + 1}</span>
                      <span className="text-[8px] text-slate-400 font-mono leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
