import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layout, MousePointer2, Info, RotateCcw, Save, CheckCircle,
  Zap, AlertTriangle, ShieldCheck, Cpu, RefreshCw, BarChart2,
  BookOpen, UserCheck, QrCode, Play, Pause, GraduationCap, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { aiService } from '../services/aiService';
import { eventBus } from '../utils/eventBus';
import clsx from 'clsx';

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

const getMachineLabel = (tipo: CellType, lang: 'es' | 'en'): string => {
  const labels: Record<CellType, { es: string; en: string }> = {
    cnc: { es: 'CNC', en: 'CNC' },
    laser: { es: 'Láser', en: 'Laser' },
    soldadura: { es: 'Solda', en: 'Weld' },
    almacen: { es: 'Almacén', en: 'Store' },
    calidad: { es: 'Calidad', en: 'Quality' },
    ensamble: { es: 'Ens.', en: 'Assembly' },
    pasillo: { es: 'Pasillo', en: 'Hallway' },
    vacio: { es: 'Vacío', en: 'Empty' },
  };
  return labels[tipo]?.[lang] || tipo;
};

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
const panel = 'bg-slate-900/40 border border-white/5 rounded-xl';

// Interface for real-time telemetry state of each machine cell
interface LiveTelemetry {
  status: 'operando' | 'preparacion' | 'paro';
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  temp: number;
  vibration: number;
  activeJob: string;
  operator: string;
  metric1Label: string;
  metric1Val: string;
  metric2Label: string;
  metric2Val: string;
  alertMsg?: string;
}

export const LayoutDesignView: React.FC = () => {
  const { language } = useLanguage();
  const [grid, setGrid] = useState<GridCell[][]>(makeGrid(ROWS, COLS));
  const [selectedTool, setSelectedTool] = useState<CellType>('cnc');
  const [painting, setPainting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sub-tabs: 'editor' (painting) or 'gemelo' (live digital twin)
  const [activeSubTab, setActiveSubTab] = useState<'editor' | 'gemelo'>('gemelo');

  // Digital Twin state
  const [selectedTwinCell, setSelectedTwinCell] = useState<{ r: number; c: number; cell: GridCell } | null>(null);
  const [telemetryTick, setTelemetryTick] = useState(0);
  const [simActive, setSimActive] = useState(true);

  // Failure simulation state
  const [stationFails, setStationFails] = useState<Record<string, { status: 'paro' | 'preparacion' | 'operando'; alert: string }>>({});

  // IA OPL (One Point Lesson) states
  const [oplLoading, setOplLoading] = useState(false);
  const [oplResult, setOplResult] = useState<{
    titulo: string;
    analisis: string;
    causas: string[];
    acciones: string[];
    quiz: { pregunta: string; opciones: string[]; correcta: number }[];
  } | null>(null);

  // Quiz state
  const [quizActive, setQuizActive] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);

  // Scanned traveler code for Check-in simulator
  const [scannedTraveler, setScannedTraveler] = useState('');
  const [checkInDone, setCheckInDone] = useState(false);

  // Telemetry loop for Digital Twin live telemetry fluctuations
  useEffect(() => {
    if (!simActive || activeSubTab !== 'gemelo') return;
    const interval = setInterval(() => {
      setTelemetryTick(t => t + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, [simActive, activeSubTab]);

  // Generate dynamic telemetry parameters depending on type & failure states
  const getCellTelemetry = useCallback((cell: GridCell, r: number, c: number): LiveTelemetry => {
    const key = `${r}-${c}`;
    const failState = stationFails[key];

    // Defaults based on type
    let status: 'operando' | 'preparacion' | 'paro' = 'operando';
    let oee = 88;
    let availability = 92;
    let performance = 94;
    let quality = 99;
    let temp = 38 + (Math.sin(telemetryTick + r + c) * 3);
    let vibration = 85 + (Math.cos(telemetryTick * 1.5 + r) * 10);
    let activeJob = `JOB-${1000 + r * 123 + c * 45}`;
    let operator = ['Ing. Agustín Prieto', 'Supervisor Soto', 'Téc. Ramírez', 'Operador Luna'][ (r + c) % 4 ];
    let metric1Label = 'Rendimiento';
    let metric1Val = '96%';
    let metric2Label = 'Ciclo Est.';
    let metric2Val = '4.2 min';
    let alertMsg = undefined;

    // Failures
    if (failState) {
      status = failState.status;
      if (status === 'paro') {
        oee = 32;
        availability = 20;
        performance = 40;
        quality = 90;
        temp = 68 + (Math.sin(telemetryTick) * 4);
        vibration = 180 + (Math.cos(telemetryTick) * 20);
        alertMsg = failState.alert;
      } else if (status === 'preparacion') {
        status = 'preparacion';
        oee = 64;
        availability = 70;
        performance = 0;
        metric1Val = 'SETUP';
      }
    }

    switch (cell.tipo) {
      case 'cnc':
        metric1Label = 'Velocidad Husillo';
        metric1Val = `${Math.round(8200 + Math.sin(telemetryTick) * 300)} RPM`;
        metric2Label = 'Temp. Aceite';
        metric2Val = `${temp.toFixed(1)}°C`;
        break;
      case 'laser':
        metric1Label = 'Nitrógeno';
        metric1Val = `${(18.2 + Math.sin(telemetryTick) * 0.5).toFixed(1)} L/m`;
        metric2Label = 'Eficiencia Anidado';
        metric2Val = '96.2%';
        break;
      case 'soldadura':
        metric1Label = 'Flujo Argón';
        metric1Val = `${(15.4 + Math.cos(telemetryTick) * 0.4).toFixed(1)} L/m`;
        metric2Label = 'Voltaje Arco';
        metric2Val = '24.2 V';
        break;
      case 'ensamble':
        metric1Label = 'Torque Digital';
        metric1Val = 'Calibrado';
        metric2Label = 'Piezas/Hora';
        metric2Val = '18 pzas';
        break;
      case 'calidad':
        metric1Label = 'Precisión Neural';
        metric1Val = '99.85%';
        metric2Label = 'Cámaras activas';
        metric2Val = '3 Cam';
        break;
      case 'almacen':
        metric1Label = 'Nivel Picking';
        metric1Val = '94.2%';
        metric2Label = 'Ubicaciones';
        metric2Val = 'Zona A-D';
        break;
    }

    return {
      status,
      oee,
      availability,
      performance,
      quality,
      temp,
      vibration,
      activeJob,
      operator,
      metric1Label,
      metric1Val,
      metric2Label,
      metric2Val,
      alertMsg
    };
  }, [telemetryTick, stationFails]);

  // Set default twin cell if not set
  useEffect(() => {
    if (activeSubTab === 'gemelo' && !selectedTwinCell) {
      // Find first non-empty non-passageway cell to default select
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = grid[r][c];
          if (cell.tipo !== 'vacio' && cell.tipo !== 'pasillo') {
            setSelectedTwinCell({ r, c, cell });
            return;
          }
        }
      }
    }
  }, [activeSubTab, grid, selectedTwinCell]);

  // Dynamic calculations for layout metrics based on grid stations
  const metrics = useMemo(() => {
    const counts: Record<CellType, number> = {
      vacio: 0,
      cnc: 0,
      laser: 0,
      soldadura: 0,
      almacen: 0,
      calidad: 0,
      ensamble: 0,
      pasillo: 0,
    };

    grid.forEach(row => {
      row.forEach(cell => {
        counts[cell.tipo] = (counts[cell.tipo] || 0) + 1;
      });
    });

    // 1. Calculate Main Flow Distance (Manhattan distance between station centroids)
    const flowOrder: CellType[] = ['almacen', 'cnc', 'laser', 'soldadura', 'ensamble', 'calidad', 'almacen'];
    const coords: Record<string, { r: number; c: number }> = {};

    Object.keys(counts).forEach(tipo => {
      let sumR = 0, sumC = 0, count = 0;
      grid.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell.tipo === tipo) {
            sumR += r;
            sumC += c;
            count++;
          }
        });
      });
      if (count > 0) {
        coords[tipo] = { r: sumR / count, c: sumC / count };
      }
    });

    let totalManhattan = 0;
    let legsCount = 0;
    for (let i = 0; i < flowOrder.length - 1; i++) {
      const fromType = flowOrder[i];
      const toType = flowOrder[i + 1];
      const fromCoord = coords[fromType];
      const toCoord = coords[toType];
      if (fromCoord && toCoord) {
        totalManhattan += Math.abs(fromCoord.r - toCoord.r) + Math.abs(fromCoord.c - toCoord.c);
        legsCount++;
      }
    }

    let distance = legsCount > 0 ? Math.round(totalManhattan * 5.5) : 0;
    if (distance === 0) distance = 42;

    const distTrend = Math.round(((distance - 48) / 48) * 100);

    // 2. Bottlenecks (dependent on station balance)
    let bottlenecks = 0;
    if (counts.cnc < 2) bottlenecks++;
    if (counts.laser < 2) bottlenecks++;
    if (counts.soldadura < 2) bottlenecks++;
    const bottleneckTrend = bottlenecks - 2;

    // 3. Required Operators
    const operators = Math.round(
      counts.cnc * 1.0 +
      counts.laser * 1.0 +
      counts.soldadura * 1.0 +
      counts.ensamble * 1.0 +
      counts.calidad * 1.0 +
      counts.almacen * 0.5
    );
    const operatorsTrend = operators - 7;

    // 4. Estimated OEE
    let oee = 72;
    oee += Math.min(5, counts.pasillo * 0.5);
    const minCap = Math.min(counts.cnc, counts.laser, counts.soldadura);
    if (minCap > 0) {
      oee += Math.min(10, minCap * 3);
    }
    if (distance < 35) oee += 5;
    else if (distance > 50) oee -= 5;

    // Adjust global OEE based on failures
    const activeFails = Object.values(stationFails).filter(f => f.status === 'paro').length;
    oee -= (activeFails * 12);

    oee = Math.min(95, Math.max(25, Math.round(oee)));
    const oeeTrend = oee - 84;

    return [
      {
        label: language === 'en' ? 'Main Flow Distance' : 'Distancia flujo principal',
        value: `${distance} m`,
        trend: distTrend,
        unit: language === 'en' ? '% vs. baseline' : '% vs. layout actual',
      },
      {
        label: language === 'en' ? 'Bottlenecks' : 'Cuellos de botella',
        value: String(bottlenecks),
        trend: bottleneckTrend,
        unit: language === 'en' ? 'vs. baseline' : 'vs. layout actual',
      },
      {
        label: language === 'en' ? 'Required Operators' : 'Operadores requeridos',
        value: String(operators),
        trend: operatorsTrend,
        unit: operatorsTrend === 0
          ? (language === 'en' ? 'no change' : 'sin cambio')
          : (language === 'en' ? 'vs. baseline' : 'vs. layout actual'),
      },
      {
        label: language === 'en' ? 'Estimated OEE' : 'OEE estimado',
        value: `${oee}%`,
        trend: oeeTrend,
        unit: language === 'en' ? 'improvement' : '% mejora',
      },
    ];
  }, [grid, language, stationFails]);

  const paint = (r: number, c: number) => {
    setSaved(false);
    setGrid(g => g.map((row, ri) => row.map((cell, ci) =>
      ri === r && ci === c ? { ...cell, tipo: selectedTool, etiqueta: cellConfig[selectedTool].etiqueta } : cell
    )));
  };

  const reset = () => { setGrid(makeGrid(ROWS, COLS)); setSaved(false); };

  const saveLayout = useCallback(async () => {
    setSaving(true);
    try {
      const { data: tenant } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
      const { data: userRes } = await supabase.auth.getUser();
      const payload = {
        tenant_id: tenant?.id,
        nombre: `Layout ${new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX')}`,
        grid: grid as unknown as object,
        rows: ROWS,
        cols: COLS,
        created_by: userRes?.user?.email ?? 'sistema',
      };
      const { error } = await supabase.from('plant_layouts').insert(payload);
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }, [grid, language]);

  // Failure Simulator Trigger
  const triggerFailure = (r: number, c: number, type: CellType) => {
    const key = `${r}-${c}`;
    const failures: Record<CellType, string> = {
      soldadura: 'Porosidad excesiva en cordón MIG por pérdida de flujo de Argón',
      cnc: 'Sobrecalentamiento crítico de husillo por rebaba en filtro de aceite',
      laser: 'Desviación en haz de corte CO2 por desalineación de espejos ópticos',
      calidad: 'Alarma de Scrap recurrente en brida DN100 excede tolerancia dimensional',
      ensamble: 'Descalibración en atornillador neumático multihusillo',
      almacen: 'Falla en terminal picking inalámbrica de zona B',
      vacio: '', pasillo: ''
    };

    const isCurrentParo = stationFails[key]?.status === 'paro';
    const newStatus = isCurrentParo ? 'operando' : 'paro';

    if (newStatus === 'paro') {
      const alertStr = failures[type] || 'Paro por mantenimiento predictivo detectado';
      setStationFails(prev => ({
        ...prev,
        [key]: { status: 'paro', alert: alertStr }
      }));

      // Fire global ROI & Quality notifications
      eventBus.emit('SHOW_NOTIFICATION', {
        type: 'quality_fail',
        title: `CRITICAL ALARM — ${getMachineLabel(type, language).toUpperCase()}`,
        message: alertStr
      });
    } else {
      // Clear failure
      setStationFails(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setOplResult(null);
    }
  };

  // Generate One Point Lesson (OPL) with Gemini IA
  const generateOPL = async (cell: GridCell, alertMsg: string) => {
    setOplLoading(true);
    setOplResult(null);
    try {
      const systemPrompt = `Actúas como Gerente de Manufactura Avanzada e Instructor de E-Learning Industrial de McVill.
Eres especialista en capacitar operadores y documentar fallas críticas bajo el formato OPL (One Point Lesson / Lección de Un Punto).
Genera una OPL estructurada en JSON para capacitar inmediatamente al operador ante la falla detectada.
El JSON de retorno debe tener estrictamente este formato (sin markdown ni texto extra):
{
  "titulo": "Título de la lección de un punto en mayúsculas",
  "analisis": "Análisis de causa raíz rápido referenciando normas como AWS D1.1 o ISO 9001 si aplica",
  "causas": ["causa 1", "causa 2", "causa 3"],
  "acciones": ["acción correctiva 1", "acción correctiva 2", "acción correctiva 3"],
  "quiz": [
    { "pregunta": "¿pregunta técnica 1?", "opciones": ["op1", "op2", "op3"], "correcta": 0 }
  ]
}`;

      const prompt = `Falla crítica detectada en estación de tipo: ${cell.tipo.toUpperCase()} (${getMachineLabel(cell.tipo, 'es')}).
Alerta del sistema: "${alertMsg}".
Genera la Lección de un Punto (OPL) instructiva para corregir y prevenir esta falla.`;

      const response = await aiService.askGemini(prompt, undefined, [], systemPrompt);
      const clean = response.trim().replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
      const parsed = JSON.parse(clean);
      setOplResult(parsed);
    } catch (err) {
      console.error('Error generating OPL with Gemini:', err);
      // Fallback OPL in case of error
      setOplResult({
        titulo: `LECCIÓN DE UN PUNTO: ${getMachineLabel(cell.tipo, 'es').toUpperCase()}`,
        analisis: `Análisis automático de causa raíz para corregir desvío del OEE.`,
        causas: [
          'Falta de mantenimiento predictivo / limpieza periódica.',
          'Compensación incorrecta de parámetros en tablero de control.',
          'Variación térmica en zona de trabajo.'
        ],
        acciones: [
          'Realizar limpieza de filtros y purgado de líneas de inmediato.',
          'Confirmar valores óptimos según WPS / Manual del Fabricante.',
          'Registrar incidencia en Bitácora de Planta.'
        ],
        quiz: [
          { pregunta: '¿Cuál es el paso prioritario ante esta alarma?', opciones: ['Llamar soporte', 'Limpieza y purgado inmediato', 'Ignorar alerta', 'Apagar planta'], correcta: 1 }
        ]
      });
    } finally {
      setOplLoading(false);
    }
  };

  const startQuiz = () => {
    setQuizActive(true);
    setQuizStep(0);
    setQuizAnswer(null);
    setQuizScore(0);
    setQuizDone(false);
  };

  const answerQuiz = (idx: number) => {
    if (!oplResult) return;
    setQuizAnswer(idx);
    if (idx === oplResult.quiz[quizStep].correcta) {
      setQuizScore(s => s + 1);
    }
    setTimeout(() => {
      if (quizStep + 1 >= oplResult.quiz.length) {
        setQuizDone(true);
      } else {
        setQuizStep(s => s + 1);
        setQuizAnswer(null);
      }
    }, 1200);
  };

  // Simulated QR check-in traveler trigger
  const handleCheckInSim = () => {
    if (!scannedTraveler.trim()) return;
    setCheckInDone(true);
    setTimeout(() => {
      setCheckInDone(false);
      setScannedTraveler('');
      eventBus.emit('SHOW_NOTIFICATION', {
        type: 'success',
        title: 'CHECK-IN QR REGISTRADO',
        message: `El viajero ${scannedTraveler.toUpperCase()} ingresó a la estación.`
      });
    }, 1500);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8 relative">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Layout size={18} />
          </div>
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">
              {language === 'en' ? 'Factory Flow Design' : 'Diseño de Flujo y Gemelo Digital'}
            </h1>
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none mt-0.5">
              {activeSubTab === 'editor' ? 'Editor Interactivo de Estaciones' : 'Monitoreo en Tiempo Real OEE · IoT Simulator'}
            </p>
          </div>
        </div>

        {/* Beautiful switch tabs styled like Agus Pro */}
        <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/5 gap-1 shadow-lg shrink-0">
          <button
            onClick={() => setActiveSubTab('editor')}
            className={clsx(
              "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
              activeSubTab === 'editor' ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Paleta & Editor
          </button>
          <button
            onClick={() => setActiveSubTab('gemelo')}
            className={clsx(
              "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
              activeSubTab === 'gemelo' ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <Activity size={12} className="animate-pulse text-emerald-400" /> Gemelo Digital Live
          </button>
        </div>

        <div className="flex gap-2 shrink-0">
          {activeSubTab === 'editor' && (
            <>
              <button onClick={reset}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-slate-300 text-xs hover:border-white/20 transition-all">
                <RotateCcw size={12} /> Reset
              </button>
              <button onClick={saveLayout} disabled={saving}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-500 transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/20">
                {saved ? <CheckCircle size={12} className="text-emerald-400" /> : <Save size={12} />}
                {saving ? 'Guardando…' : saved ? 'Guardado' : 'Guardar Layout'}
              </button>
            </>
          )}
          {activeSubTab === 'gemelo' && (
            <button
              onClick={() => setSimActive(v => !v)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-black uppercase transition-all shadow-md",
                simActive
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-400"
              )}
            >
              {simActive ? <Pause size={12} /> : <Play size={12} />}
              {simActive ? 'Pausar IoT Feed' : 'Iniciar IoT Feed'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* SUBTAB 1: EDITOR */}
        {activeSubTab === 'editor' && (
          <div className="flex-1 flex gap-4 overflow-hidden p-5 min-h-0 animate-in fade-in duration-300">
            {/* Toolbox */}
            <div className="w-44 shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Paleta de estaciones
              </p>
              {MAQUINAS.map(m => (
                <button key={m.tipo} onClick={() => setSelectedTool(m.tipo)}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-left",
                    selectedTool === m.tipo
                      ? m.bg + ' border-white/20 ring-1 ring-white/10 shadow-lg'
                      : 'border-white/5 bg-slate-900/30 hover:border-white/10'
                  )}>
                  <div className={`w-3.5 h-3.5 rounded border ${m.bg} shrink-0`} />
                  <span className={`text-[11px] font-black uppercase tracking-wider ${selectedTool === m.tipo ? m.color : 'text-slate-400'}`}>
                    {getMachineLabel(m.tipo, language)}
                  </span>
                  {selectedTool === m.tipo && <MousePointer2 size={11} className={m.color + ' ml-auto'} />}
                </button>
              ))}
              <div className="mt-auto pt-3 border-t border-white/5">
                <p className="text-[9px] text-slate-500 flex items-center gap-1.5 leading-relaxed uppercase font-black tracking-wider">
                  <Info size={11} className="text-slate-400" /> Click o arrastra sobre las celdas del plano para pintar.
                </p>
              </div>
            </div>

            {/* Grid editor */}
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              <div className={`${panel} p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-900/10`}>
                <div className="inline-block" onMouseLeave={() => setPainting(false)}>
                  {grid.map((row, r) => (
                    <div key={r} className="flex">
                      {row.map((cell, c) => {
                        const cfg = cellConfig[cell.tipo];
                        return (
                          <div key={cell.id}
                            className={clsx(
                              "w-12 h-12 border rounded-xl m-0.5 flex items-center justify-center cursor-pointer transition-all select-none",
                              cfg.bg,
                              "hover:scale-[1.03] active:scale-95 hover:shadow-xl border-dashed border-white/5"
                            )}
                            onMouseDown={() => { setPainting(true); paint(r, c); }}
                            onMouseEnter={() => painting && paint(r, c)}
                            onMouseUp={() => setPainting(false)}>
                            {cell.tipo !== 'vacio' && (
                              <span className={`text-[9px] font-black ${cfg.color} text-center leading-tight uppercase`}>
                                {getMachineLabel(cell.tipo, language)}
                              </span>
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
                {metrics.map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`${panel} p-3.5 bg-slate-900/50 hover:border-white/10 transition-all`}>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">{m.label}</p>
                    <p className="text-xl font-black text-white">{m.value}</p>
                    <p className={`text-[9px] font-black mt-1 uppercase ${m.trend < 0 ? 'text-emerald-400' : m.trend > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                      {m.trend !== 0 ? (m.trend > 0 ? '▲' : '▼') + ' ' + Math.abs(m.trend) : '—'} {m.unit}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: GEMELO DIGITAL LIVE */}
        {activeSubTab === 'gemelo' && (
          <div className="flex-1 flex overflow-hidden animate-in fade-in duration-300">
            {/* Live interactive plant grid */}
            <div className="flex-1 p-5 overflow-auto flex flex-col gap-4 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <BarChart2 size={13} className="text-emerald-400 animate-pulse" /> Vista de Planta Digital en Vivo · IoT
                </span>
                <span className="text-[9px] text-slate-600 font-bold uppercase">
                  Click en estación para abrir telemetría
                </span>
              </div>

              <div className={`${panel} p-6 flex-1 overflow-auto flex items-center justify-center bg-slate-900/10`}>
                <div className="inline-block">
                  {grid.map((row, r) => (
                    <div key={r} className="flex">
                      {row.map((cell, c) => {
                        const cfg = cellConfig[cell.tipo];
                        const tel = getCellTelemetry(cell, r, c);
                        const isSelected = selectedTwinCell?.r === r && selectedTwinCell?.c === c;

                        return (
                          <div key={cell.id}
                            onClick={() => {
                              setSelectedTwinCell({ r, c, cell });
                              setOplResult(null);
                            }}
                            className={clsx(
                              "w-12 h-12 border m-0.5 flex flex-col items-center justify-center cursor-pointer transition-all relative select-none rounded-xl",
                              cfg.bg,
                              isSelected ? 'ring-2 ring-indigo-500/80 scale-105 border-white/40 shadow-2xl z-10' : 'hover:scale-[1.03]',
                              tel.status === 'paro' && 'border-rose-500/60 ring-2 ring-rose-500/40 animate-pulse bg-rose-950/20'
                            )}>

                            {/* Status ring/dot indicator */}
                            {cell.tipo !== 'vacio' && (
                              <div className="absolute top-1 right-1 flex items-center">
                                <span className={clsx(
                                  "w-1.5 h-1.5 rounded-full shrink-0",
                                  tel.status === 'operando' && "bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse",
                                  tel.status === 'preparacion' && "bg-amber-400 shadow-[0_0_6px_#fbbf24] animate-pulse",
                                  tel.status === 'paro' && "bg-rose-500 shadow-[0_0_8px_#ef4444] animate-ping"
                                )} />
                              </div>
                            )}

                            {cell.tipo !== 'vacio' ? (
                              <>
                                <span className={clsx(
                                  "text-[9px] font-black text-center uppercase tracking-tighter leading-none mb-0.5",
                                  tel.status === 'paro' ? 'text-rose-400' : cfg.color
                                )}>
                                  {getMachineLabel(cell.tipo, language)}
                                </span>
                                <span className="text-[7px] font-black text-slate-400 font-mono">
                                  {tel.status === 'paro' ? 'ALERTA' : `${tel.oee}%`}
                                </span>
                              </>
                            ) : (
                              cell.tipo === 'pasillo' && (
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Metrics display */}
              <div className="grid grid-cols-4 gap-3 shrink-0">
                {metrics.map((m, i) => (
                  <div key={i} className={`${panel} p-3.5 bg-slate-900/50`}>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">{m.label}</p>
                    <p className="text-xl font-black text-white">{m.value}</p>
                    <p className={`text-[9px] font-black mt-1 uppercase ${m.trend < 0 ? 'text-emerald-400' : m.trend > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                      {m.trend !== 0 ? (m.trend > 0 ? '▲' : '▼') + ' ' + Math.abs(m.trend) : '—'} {m.unit}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right sidebar: Detailed Telemetry, Simulation tools, & OPL Generator */}
            <div className="w-80 shrink-0 border-l border-white/5 bg-slate-900/60 flex flex-col min-h-0 overflow-y-auto custom-scrollbar p-5 gap-4">
              {selectedTwinCell && selectedTwinCell.cell.tipo !== 'vacio' && selectedTwinCell.cell.tipo !== 'pasillo' ? (() => {
                const cell = selectedTwinCell.cell;
                const r = selectedTwinCell.r;
                const c = selectedTwinCell.c;
                const tel = getCellTelemetry(cell, r, c);
                const cfg = cellConfig[cell.tipo];

                return (
                  <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                    {/* Active Machine Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center`}>
                          <Cpu size={16} className={cfg.color} />
                        </div>
                        <div>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase ${cfg.bg} ${cfg.color}`}>
                            {cell.tipo}
                          </span>
                          <h3 className="text-sm font-black text-white uppercase mt-1">Estación [{r},{c}]</h3>
                        </div>
                      </div>
                      <span className={clsx(
                        "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                        tel.status === 'operando' && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
                        tel.status === 'preparacion' && "bg-amber-500/10 border-amber-500/20 text-amber-400",
                        tel.status === 'paro' && "bg-rose-500/10 border-rose-500/20 text-rose-400 animate-pulse"
                      )}>
                        {tel.status}
                      </span>
                    </div>

                    {/* Alerta Destacada Red Glow */}
                    {tel.status === 'paro' && tel.alertMsg && (
                      <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl relative overflow-hidden animate-pulse">
                        <div className="absolute top-0 left-0 bottom-0 w-1 bg-rose-500" />
                        <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1">
                          <AlertTriangle size={11} /> ALARMA ACTIVA
                        </p>
                        <p className="text-[10px] text-slate-200 font-bold mt-1 leading-relaxed">
                          {tel.alertMsg}
                        </p>
                      </div>
                    )}

                    {/* OEE Dials */}
                    <div className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-3">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        Rendimiento OEE Real
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-center flex-1">
                          <p className="text-2xl font-black text-white tracking-tighter">{tel.oee}%</p>
                          <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-wider mt-0.5">OEE GLOBAL</p>
                        </div>
                        <div className="h-10 w-px bg-white/5" />
                        <div className="flex flex-col gap-1 text-[8.5px] font-bold text-slate-400 uppercase tracking-wider flex-1 pl-2">
                          <div className="flex justify-between">
                            <span>Dispon:</span>
                            <span className="text-white font-black">{tel.availability}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Rendim:</span>
                            <span className="text-white font-black">{tel.performance}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Calidad:</span>
                            <span className="text-white font-black">{tel.quality}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Scannable Traveler Check-in */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5 space-y-2">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <QrCode size={11} className="text-indigo-400" /> Check-in de Viajero
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="ESCANEAR TRAVELER ID..."
                          value={scannedTraveler}
                          onChange={e => setScannedTraveler(e.target.value.toUpperCase())}
                          className="cyber-input text-[10px] flex-1 py-1.5 pl-3"
                        />
                        <button
                          onClick={handleCheckInSim}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                          OK
                        </button>
                      </div>
                      <p className="text-[8px] text-slate-600 font-bold uppercase tracking-wider mt-1">
                        Vincula lote, plano e instrucciones a esta máquina
                      </p>
                    </div>

                    {/* Telemetry variables */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{tel.metric1Label}</p>
                        <p className="text-xs font-black text-white mt-1 font-mono">{tel.metric1Val}</p>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{tel.metric2Label}</p>
                        <p className="text-xs font-black text-white mt-1 font-mono">{tel.metric2Val}</p>
                      </div>
                    </div>

                    {/* Operational Details */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500 font-black uppercase">Viajero Activo</span>
                        <span className="text-white font-mono font-black">{tel.activeJob}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500 font-black uppercase">Operador</span>
                        <span className="text-white font-black truncate max-w-[120px]">{tel.operator}</span>
                      </div>
                    </div>

                    {/* Action buttons (Failure Simulation / Troubleshoot) */}
                    <div className="pt-3 border-t border-white/5 space-y-2">
                      <button
                        onClick={() => triggerFailure(r, c, cell.tipo)}
                        className={clsx(
                          "w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-1.5 shadow-md",
                          tel.status === 'paro'
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-emerald-500/10"
                            : "bg-red-600 hover:bg-red-700 text-white border-red-500 shadow-red-500/10"
                        )}
                      >
                        <AlertTriangle size={12} />
                        {tel.status === 'paro' ? 'Restablecer Estación' : 'Simular Alarma / Paro'}
                      </button>

                      {tel.status === 'paro' && (
                        <button
                          onClick={() => generateOPL(cell, tel.alertMsg || '')}
                          disabled={oplLoading}
                          className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 border-violet-500 shadow-violet-500/10 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                        >
                          {oplLoading ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <BookOpen size={12} />
                          )}
                          {oplLoading ? 'Generando con IA...' : 'Lección Aprendida IA (OPL)'}
                        </button>
                      )}
                    </div>

                    {/* Render generated OPL (One Point Lesson) card */}
                    {oplResult && !oplLoading && (
                      <div className="mt-4 bg-slate-900 border border-violet-500/30 rounded-2xl p-4 space-y-3 animate-in fade-in duration-500">
                        <div className="flex items-center gap-2 text-violet-400">
                          <BookOpen size={14} />
                          <p className="text-[10px] font-black uppercase tracking-widest">LECCIÓN APRENDIDA IA</p>
                        </div>
                        <h4 className="text-xs font-black text-white uppercase leading-tight">{oplResult.titulo}</h4>
                        <p className="text-[10px] text-slate-300 leading-relaxed font-sans">{oplResult.analisis}</p>

                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Causas Identificadas</p>
                          {oplResult.causas.map((c, idx) => (
                            <div key={idx} className="flex gap-1.5 text-[9px] text-slate-400 leading-snug">
                              <span className="text-rose-400">•</span>
                              <span>{c}</span>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Acciones Preventivas</p>
                          {oplResult.acciones.map((a, idx) => (
                            <div key={idx} className="flex gap-1.5 text-[9px] text-emerald-400 leading-snug">
                              <span className="text-emerald-400">✓</span>
                              <span>{a}</span>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={startQuiz}
                          className="w-full py-2 bg-violet-600/20 border border-violet-500/30 text-violet-400 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-violet-600 hover:text-white transition-all"
                        >
                          <GraduationCap size={13} />
                          Iniciar Quiz de Operador
                        </button>
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40 py-12">
                  <Info size={40} className="text-slate-600" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sin Selección</p>
                    <p className="text-[9px] text-slate-600 uppercase font-bold mt-1">Selecciona una máquina activa en el mapa para ver OEE</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* QUIZ MODAL */}
      <AnimatePresence>
        {quizActive && oplResult && (
          <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              {!quizDone ? (
                <>
                  <div className="flex items-center gap-2 justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2 text-violet-400">
                      <GraduationCap size={18} />
                      <h4 className="text-xs font-black uppercase tracking-widest text-white">Quiz de Capacitación OPL</h4>
                    </div>
                    <button onClick={() => setQuizActive(false)} className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white">
                      <X size={16} />
                    </button>
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    PREGUNTA {quizStep + 1} DE {oplResult.quiz.length}
                  </p>
                  <p className="text-sm font-black text-white leading-snug">
                    {oplResult.quiz[quizStep].pregunta}
                  </p>
                  <div className="space-y-2 pt-2">
                    {oplResult.quiz[quizStep].opciones.map((op, i) => (
                      <button
                        key={i}
                        onClick={() => quizAnswer === null && answerQuiz(i)}
                        className={clsx(
                          "w-full text-left px-4 py-3 rounded-2xl text-[11px] transition-all border font-bold",
                          quizAnswer === null
                            ? "border-white/10 bg-slate-800/60 hover:border-violet-500/30 text-slate-200"
                            : i === oplResult.quiz[quizStep].correcta
                              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                              : i === quizAnswer
                                ? "border-rose-500/50 bg-rose-500/10 text-rose-400"
                                : "border-white/5 bg-slate-800/30 text-slate-650"
                        )}
                      >
                        {op}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto text-violet-400 animate-bounce">
                    <ShieldCheck size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight uppercase">Quiz Completado</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Conocimiento Operativo Validado</p>
                  </div>
                  <p className="text-4xl font-black text-white">
                    {quizScore} / {oplResult.quiz.length}
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed font-bold">
                    {quizScore === oplResult.quiz.length
                      ? '¡Perfecto! Certificación de operador registrada exitosamente en bitácora.'
                      : 'Recomendamos repasar la Lección Aprendida y volver a intentar.'}
                  </p>
                  <button
                    onClick={() => setQuizActive(false)}
                    className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-750 text-white font-black text-[10px] uppercase tracking-widest shadow-md w-full"
                  >
                    Finalizar Capacitación
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LayoutDesignView;
