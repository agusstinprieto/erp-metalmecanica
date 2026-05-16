import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import {
  X, ChevronDown, ChevronRight,
  FileText, Upload, BrainCircuit, DollarSign,
  Send, Zap, Plus, CheckCircle2, AlertTriangle,
  Box, Package, List, File, Clock, Users,
  ArrowRight, BookOpen, Lightbulb,
} from 'lucide-react';

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Paso {
  id: string;
  num: number;
  titulo: string;
  subtitulo: string;
  icon: React.ReactNode;
  color: string;
  dot: string;
  border: string;
  bg: string;
  descripcion: string;
  acciones: string[];
  documentos?: { tipo: string; ejemplos: string; icon: React.ReactNode; color: string }[];
  tips: string[];
}

const PASOS: Paso[] = [
  {
    id: 'nueva_rfq',
    num: 1,
    titulo: 'Nueva RFQ',
    subtitulo: 'El cliente solicita cotización',
    icon: <Plus size={16} />,
    color: 'text-indigo-400',
    dot: 'bg-indigo-400',
    border: 'border-indigo-500/40',
    bg: 'bg-indigo-500/8',
    descripcion: 'El PM registra la solicitud del cliente en el sistema usando el formulario F001. Se captura la información básica del proyecto y se calcula automáticamente el nivel de riesgo y SLA.',
    acciones: [
      'Haz clic en "Nueva RFQ" en el Tablero de Cotizaciones',
      'Llena los datos del cliente y contacto externo',
      'Selecciona el PM asignado',
      'Indica cuántos aceros, procesos, subensambles y hardwares tiene el proyecto',
      'El sistema calcula automáticamente el riesgo (LOW / MEDIO / HIGH) y el SLA en días',
    ],
    tips: [
      'El SLA se calcula: LOW = 5 días, MEDIO = 10 días, HIGH = 20 días hábiles',
      'Las tarjetas con SLA vencido se marcan en rojo y pulsan',
      'Puedes arrastrar las tarjetas entre columnas para avanzar el proceso',
    ],
  },
  {
    id: 'factibilidad',
    num: 2,
    titulo: 'Factibilidad',
    subtitulo: 'IA evalúa si se puede fabricar',
    icon: <BrainCircuit size={16} />,
    color: 'text-violet-400',
    dot: 'bg-violet-400',
    border: 'border-violet-500/40',
    bg: 'bg-violet-500/8',
    descripcion: 'Antes de cotizar, McVill evalúa si el proyecto es técnicamente viable. La IA analiza la complejidad, procesos requeridos y capacidad de planta para emitir un veredicto: VIABLE, CONDICIONADA o NO VIABLE.',
    acciones: [
      'Abre la tarjeta del RFQ y ve al tab "Documentos"',
      'Sube los archivos técnicos que el cliente mandó (ver sección de documentos)',
      'Ve al tab "Factibilidad" para ver el análisis IA',
      'Si no hay análisis, usa el botón "Ir a Factibilidad IA" para ejecutarlo',
      'Con el veredicto en mano, decide si continuar o declinar el RFQ',
    ],
    documentos: [
      { tipo: 'Planos 2D',  ejemplos: 'PDF, DWG, DXF',          icon: <FileText size={12} />,  color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
      { tipo: 'Modelo 3D',  ejemplos: 'STEP, STL, SolidWorks',  icon: <Box size={12} />,       color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
      { tipo: 'Especif.',   ejemplos: 'PDF, DOCX con reqs',      icon: <List size={12} />,      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
      { tipo: 'BOM',        ejemplos: 'Excel con lista materiales', icon: <Package size={12} />, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    ],
    tips: [
      'Sube todos los archivos que el cliente mandó en el tab Documentos',
      'El análisis IA considera: procesos, materiales, capacidad de planta y riesgos',
      'CONDICIONADA = se puede hacer con ajustes o subcontratación',
      'Si es NO VIABLE, mueve la tarjeta a "Declinada" y documenta el motivo',
    ],
  },
  {
    id: 'cotizacion',
    num: 3,
    titulo: 'Cotización',
    subtitulo: 'Se calcula el precio',
    icon: <DollarSign size={16} />,
    color: 'text-cyan-400',
    dot: 'bg-cyan-400',
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-500/8',
    descripcion: 'Con la factibilidad aprobada, el equipo calcula el costo del proyecto. Se consideran materiales, procesos, mano de obra, overhead y margen. Todo queda ligado al RFQ.',
    acciones: [
      'Abre el tab "Cotización" dentro de la tarjeta del RFQ',
      'Captura el monto estimado en USD (se convierte automáticamente a MXN)',
      'Agrega notas con condiciones, supuestos y tiempos de entrega',
      'Guarda la cotización — queda ligada al RFQ con todos sus documentos',
      'Arrastra la tarjeta a la columna "DIRECCIÓN" para aprobación interna',
    ],
    documentos: [
      { tipo: 'Especif. cliente', ejemplos: 'Requerimientos técnicos adicionales', icon: <FileText size={12} />, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
      { tipo: 'Otros',            ejemplos: 'Cualquier archivo relevante',         icon: <File size={12} />,     color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
    ],
    tips: [
      'Usa el Cotizador Express (módulo Ventas) para cálculos paramétricos por peso',
      'El tipo de cambio de referencia es 17.50 MXN/USD — ajusta si es necesario',
      'Deja notas claras sobre vigencia de la cotización y condiciones de entrega',
    ],
  },
  {
    id: 'direccion',
    num: 4,
    titulo: 'Dirección',
    subtitulo: 'Aprobación interna',
    icon: <Users size={16} />,
    color: 'text-amber-400',
    dot: 'bg-amber-400',
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/8',
    descripcion: 'La cotización pasa a revisión de Dirección antes de enviarse al cliente. Aquí se valida que los números sean correctos, que el margen sea adecuado y que los compromisos sean cumplibles.',
    acciones: [
      'La tarjeta llega a la columna DIRECCIÓN al arrastrarla',
      'Dirección revisa el monto, condiciones y factibilidad',
      'Si aprueba: arrastra a ENVIADA',
      'Si no aprueba: regresa a COTIZACIÓN para ajustes, o declina',
      'En esta etapa ya se puede preparar el documento de cotización para el cliente',
    ],
    tips: [
      'Verifica que el SLA no esté vencido antes de enviar',
      'Revisa los archivos adjuntos — asegúrate de que Dirección tiene todo para decidir',
      'Si hay dudas técnicas, revisa el tab Factibilidad desde la tarjeta',
    ],
  },
  {
    id: 'enviada',
    num: 5,
    titulo: 'Enviada',
    subtitulo: 'Cotización al cliente',
    icon: <Send size={16} />,
    color: 'text-emerald-400',
    dot: 'bg-emerald-400',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/8',
    descripcion: 'La cotización fue enviada al cliente. Se registra la fecha de envío y se espera respuesta. Si el cliente aprueba, se procede a generar la Orden de Trabajo (Viajero).',
    acciones: [
      'Al arrastrar a ENVIADA, el sistema registra automáticamente la fecha de envío',
      'Espera la respuesta del cliente',
      'Si el cliente APRUEBA: genera el Viajero desde el tab correspondiente',
      'Si el cliente DECLINA o no responde: mueve a Declinada y anota el motivo',
      'Registra el desempeño de la cotización para las métricas anuales',
    ],
    tips: [
      'Una vez enviada, todos los documentos quedan guardados en el RFQ permanentemente',
      'Puedes reabrir la tarjeta en cualquier momento para consultar los archivos adjuntos',
      'Las métricas del histórico 2025 se actualizan automáticamente',
    ],
  },
  {
    id: 'viajero',
    num: 6,
    titulo: 'Viajero',
    subtitulo: 'Nace la Orden de Trabajo',
    icon: <Zap size={16} />,
    color: 'text-mcvill-accent',
    dot: 'bg-mcvill-accent',
    border: 'border-mcvill-accent/40',
    bg: 'bg-mcvill-accent/8',
    descripcion: 'El cliente aprobó la cotización. Se genera una Orden de Trabajo (Viajero) que inicia el proceso de producción. El Viajero contiene toda la información del proyecto y viaja con la pieza a través de cada etapa de manufactura.',
    acciones: [
      'Abre la tarjeta del RFQ (debe estar en DIRECCIÓN o ENVIADA)',
      'Ve al tab "Viajero" dentro de la tarjeta',
      'Revisa la vista previa con los datos del proyecto',
      'Haz clic en "Generar Orden de Trabajo"',
      'El Viajero se crea en el módulo de Producción — ve ahí para completar número de parte, operaciones y materiales',
    ],
    tips: [
      'El Viajero se crea con estatus PENDIENTE — producción lo activa cuando inicia',
      'Completa el número de parte real en el módulo de Viajeros',
      'Si el RFQ tiene múltiples NPs, crea un Viajero por cada número de parte',
      'Los documentos del RFQ (planos, STEP, etc.) quedan accesibles desde el RFQ original',
    ],
  },
];

// ─── Componente ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'mcvill_guia_cotizaciones_visto';

interface Props {
  onClose: () => void;
}

export const CotizacionesGuiaModal: React.FC<Props> = ({ onClose }) => {
  const [pasoActivo, setPasoActivo] = useState(0);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set(['acciones']));

  const paso = PASOS[pasoActivo];

  const toggleExpand = (key: string) => {
    setExpandidos(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    onClose();
  };

  const Seccion = ({
    id, titulo, icon, children,
  }: { id: string; titulo: string; icon: React.ReactNode; children: React.ReactNode }) => {
    const open = expandidos.has(id);
    return (
      <div className="border border-slate-800 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleExpand(id)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/60 hover:bg-slate-800/60 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-slate-400">{icon}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{titulo}</span>
          </div>
          {open ? <ChevronDown size={13} className="text-slate-500" /> : <ChevronRight size={13} className="text-slate-500" />}
        </button>
        {open && <div className="p-4 bg-slate-950/40">{children}</div>}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] lg:left-64 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl shadow-black/50 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-mcvill-accent/10 border border-mcvill-accent/20 rounded-xl flex items-center justify-center">
              <BookOpen size={16} className="text-mcvill-accent" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">
                Guía de Cotizaciones
              </h2>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest">
                Flujo completo · McVill S.A. de C.V.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Pipeline visual */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-800 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {PASOS.map((p, i) => (
              <React.Fragment key={p.id}>
                <button
                  onClick={() => { setPasoActivo(i); setExpandidos(new Set(['acciones'])); }}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-[10px] font-black uppercase tracking-wider whitespace-nowrap',
                    pasoActivo === i
                      ? clsx('border text-white', p.border, p.bg)
                      : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900'
                  )}
                >
                  <span className={clsx(
                    'flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-black shrink-0',
                    pasoActivo === i ? clsx(p.color, 'bg-current/10') : 'bg-slate-800 text-slate-500'
                  )}>
                    {p.num}
                  </span>
                  <span className={pasoActivo === i ? p.color : ''}>{p.titulo}</span>
                </button>
                {i < PASOS.length - 1 && (
                  <ArrowRight size={12} className="text-slate-700 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Paso info */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
            {/* Paso header */}
            <div className={clsx('flex items-start gap-4 p-4 rounded-xl border', paso.border, paso.bg)}>
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border', paso.border, 'bg-slate-950')}>
                <span className={paso.color}>{paso.icon}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={clsx('text-[9px] font-black uppercase tracking-widest', paso.color)}>
                    Paso {paso.num} de {PASOS.length}
                  </span>
                  <span className={clsx('w-1.5 h-1.5 rounded-full', paso.dot)} />
                </div>
                <h3 className="text-base font-black text-white uppercase mt-0.5">{paso.titulo}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">{paso.subtitulo}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{paso.descripcion}</p>

            {/* Acciones */}
            <Seccion id="acciones" titulo="Qué hacer — Paso a paso" icon={<CheckCircle2 size={13} />}>
              <div className="space-y-2">
                {paso.acciones.map((a, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className={clsx(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5',
                      paso.color, 'bg-current/10 border border-current/20'
                    )}>
                      {i + 1}
                    </span>
                    <p className="text-[11px] text-slate-300 leading-snug">{a}</p>
                  </div>
                ))}
              </div>
            </Seccion>

            {/* Documentos */}
            {paso.documentos && paso.documentos.length > 0 && (
              <Seccion id="documentos" titulo="Documentos a subir en esta etapa" icon={<Upload size={13} />}>
                <div className="grid grid-cols-2 gap-2">
                  {paso.documentos.map((d, i) => (
                    <div key={i} className={clsx('flex items-start gap-2 border rounded-lg p-3', d.color)}>
                      <span className="shrink-0 mt-0.5">{d.icon}</span>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider">{d.tipo}</p>
                        <p className="text-[9px] opacity-70 mt-0.5 font-mono">{d.ejemplos}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-slate-600 mt-3 font-mono">
                  Abre la tarjeta del RFQ → Tab "Documentos" → Selecciona el tipo → Arrastra o haz clic para subir
                </p>
              </Seccion>
            )}

            {/* Tips */}
            <Seccion id="tips" titulo="Tips y puntos clave" icon={<Lightbulb size={13} />}>
              <div className="space-y-2">
                {paso.tips.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                    <Lightbulb size={10} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-400/80 leading-snug">{t}</p>
                  </div>
                ))}
              </div>
            </Seccion>
          </div>

          {/* Right: Mini-mapa del flujo */}
          <div className="w-56 border-l border-slate-800 p-4 space-y-1.5 overflow-y-auto custom-scrollbar shrink-0">
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-3">
              Flujo del proceso
            </p>
            {PASOS.map((p, i) => (
              <button
                key={p.id}
                onClick={() => { setPasoActivo(i); setExpandidos(new Set(['acciones'])); }}
                className={clsx(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left',
                  pasoActivo === i
                    ? clsx('border', p.border, p.bg)
                    : 'border-transparent hover:bg-slate-900'
                )}
              >
                <div className={clsx('w-1.5 h-1.5 rounded-full shrink-0', pasoActivo === i ? p.dot : 'bg-slate-700')} />
                <div className="min-w-0">
                  <p className={clsx('text-[10px] font-black uppercase tracking-wider truncate', pasoActivo === i ? p.color : 'text-slate-500')}>
                    {p.titulo}
                  </p>
                  <p className="text-[8px] text-slate-600 truncate">{p.subtitulo}</p>
                </div>
              </button>
            ))}

            <div className="pt-3 mt-3 border-t border-slate-800 space-y-2">
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Resultado final</p>
              <div className="bg-mcvill-accent/5 border border-mcvill-accent/20 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap size={10} className="text-mcvill-accent" />
                  <p className="text-[9px] font-black text-mcvill-accent uppercase tracking-wider">Viajero</p>
                </div>
                <p className="text-[8px] text-slate-500 leading-snug">
                  Orden de Trabajo creada · Producción inicia
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 shrink-0">
          <button
            onClick={() => { setPasoActivo(p => Math.max(0, p - 1)); setExpandidos(new Set(['acciones'])); }}
            disabled={pasoActivo === 0}
            className="px-4 py-2 rounded-xl border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 transition-all"
          >
            ← Anterior
          </button>

          <div className="flex gap-1">
            {PASOS.map((_, i) => (
              <button
                key={i}
                onClick={() => { setPasoActivo(i); setExpandidos(new Set(['acciones'])); }}
                className={clsx(
                  'w-1.5 h-1.5 rounded-full transition-all',
                  i === pasoActivo ? clsx('w-4', PASOS[i].dot) : 'bg-slate-700 hover:bg-slate-500'
                )}
              />
            ))}
          </div>

          {pasoActivo < PASOS.length - 1 ? (
            <button
              onClick={() => { setPasoActivo(p => p + 1); setExpandidos(new Set(['acciones'])); }}
              className={clsx(
                'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
              )}
            >
              Siguiente →
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-xl bg-mcvill-accent text-slate-950 text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all"
            >
              Entendido ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Hook para mostrar automáticamente la primera vez
export function useGuiaCotizaciones() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  return { visible, abrir: () => setVisible(true), cerrar: () => { localStorage.setItem(STORAGE_KEY, '1'); setVisible(false); } };
}

export default CotizacionesGuiaModal;
