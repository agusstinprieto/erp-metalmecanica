import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Route, Cog, ShieldCheck, CheckCircle2,
  XCircle, Wrench, Trash2, ArrowDown, RotateCcw,
  GitBranch, AlertTriangle, Package, Info, ChevronRight, X,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type NodeColor = 'blue' | 'green' | 'amber' | 'red' | 'violet';

interface FlowNode {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  color: NodeColor;
  detail: string;
  actions?: string[];
}

// ─── Color config ─────────────────────────────────────────────────────────────
const C: Record<NodeColor, { border: string; bg: string; text: string; glow: string; dot: string }> = {
  blue:   { border: 'border-blue-500/60',   bg: 'bg-blue-500/8',   text: 'text-blue-400',   glow: 'shadow-[0_0_24px_rgba(59,130,246,0.18)]',  dot: 'bg-blue-500' },
  green:  { border: 'border-emerald-500/60', bg: 'bg-emerald-500/8', text: 'text-emerald-400', glow: 'shadow-[0_0_24px_rgba(16,185,129,0.18)]', dot: 'bg-emerald-500' },
  amber:  { border: 'border-amber-500/60',  bg: 'bg-amber-500/8',  text: 'text-amber-400',  glow: 'shadow-[0_0_24px_rgba(245,158,11,0.18)]',  dot: 'bg-amber-500' },
  red:    { border: 'border-red-500/60',    bg: 'bg-red-500/8',    text: 'text-red-400',    glow: 'shadow-[0_0_24px_rgba(239,68,68,0.18)]',   dot: 'bg-red-500' },
  violet: { border: 'border-violet-500/60', bg: 'bg-violet-500/8', text: 'text-violet-400', glow: 'shadow-[0_0_24px_rgba(139,92,246,0.18)]',  dot: 'bg-violet-500' },
};

// ─── Node data ────────────────────────────────────────────────────────────────
const NODES: FlowNode[] = [
  {
    id: 'orden',
    label: 'Orden de Trabajo',
    sublabel: 'Inicio del proceso',
    icon: ClipboardList,
    color: 'blue',
    detail: 'La orden de trabajo es creada a partir de una cotización o pedido del cliente. Define la cantidad total a fabricar, la fecha de entrega, el número de parte y la OC del cliente.',
    actions: ['Crear OT', 'Asignar prioridad', 'Ligar OC cliente'],
  },
  {
    id: 'viajeros',
    label: 'Viajeros',
    sublabel: 'Uno por cada componente',
    icon: Route,
    color: 'blue',
    detail: 'Cada componente o sub-ensamble de la orden recibe su propio viajero. El viajero lleva toda la información necesaria: operaciones, materiales, cantidades asignadas y quién lo trabaja. Una orden puede tener N viajeros en paralelo.',
    actions: ['Generar viajero', 'Asignar cantidad', 'Imprimir PDF'],
  },
  {
    id: 'operaciones',
    label: 'Operaciones',
    sublabel: 'Ruta de fabricación',
    icon: Cog,
    color: 'blue',
    detail: 'Cada viajero sigue una secuencia de operaciones (ruta). Ejemplo: Op10 Corte → Op20 Maquinado → Op30 Soldadura → Op40 Acabado. El operador registra inicio/fin y firma digitalmente cada operación en el Shop Floor.',
    actions: ['Iniciar operación', 'Registrar tiempo', 'Firmar operación'],
  },
  {
    id: 'inspeccion',
    label: 'Inspección de Calidad',
    sublabel: 'Control dimensional y visual',
    icon: ShieldCheck,
    color: 'violet',
    detail: 'Al terminar las operaciones, el viajero pasa a inspección. El inspector de calidad valida dimensiones, acabado superficial, tolerancias y cualquier requisito especificado en el dibujo. Cada parámetro se registra como OK o NG.',
    actions: ['Crear inspección', 'Registrar parámetros', 'Emitir veredicto'],
  },
];

const OUTCOME_APPROVED: FlowNode = {
  id: 'aprobado',
  label: 'Aprobado',
  sublabel: 'Cumple con especificaciones',
  icon: CheckCircle2,
  color: 'green',
  detail: 'El viajero pasa la inspección. La cantidad fabricada se acumula en la orden de trabajo. Si todos los viajeros de la orden están completados, la OT se cierra.',
  actions: ['Marcar COMPLETADO', 'Actualizar cant. fabricada', 'Cerrar OT si aplica'],
};

const OUTCOME_REJECTED: FlowNode = {
  id: 'rechazado',
  label: 'Rechazado',
  sublabel: 'No cumple especificaciones',
  icon: XCircle,
  color: 'red',
  detail: 'El viajero es rechazado. Se documenta el motivo, quién rechazó y la fecha. Se genera automáticamente una No Conformidad (NC). El jefe de calidad decide la disposición: reparar, scrap o usar-como-está.',
  actions: ['Registrar motivo rechazo', 'Crear No Conformidad', 'Definir disposición'],
};

const OUTCOME_RETRABAJO: FlowNode = {
  id: 'retrabajo',
  label: 'Retrabajo',
  sublabel: 'Reparación del componente',
  icon: Wrench,
  color: 'amber',
  detail: 'Se crea un registro de retrabajo con: descripción de la falla, operaciones a repetir, responsable y costo estimado. El viajero cambia a estatus EN RETRABAJO. Al terminar la reparación regresa al inicio de operaciones para ser re-inspeccionado.',
  actions: ['Crear retrabajo', 'Especificar ops a repetir', 'Registrar costo', 'Volver a Operaciones'],
};

const OUTCOME_SCRAP: FlowNode = {
  id: 'scrap',
  label: 'Scrap',
  sublabel: 'Baja definitiva',
  icon: Trash2,
  color: 'red',
  detail: 'La pieza no tiene posibilidad de reparación. Se registra la cantidad de scrap y el motivo. Los costos se imputan a la orden. El viajero queda en RECHAZADO definitivo. La NC queda abierta hasta que se toman acciones correctivas.',
  actions: ['Registrar cantidad scrap', 'Registrar motivo', 'Imputar costo', 'Mantener NC abierta'],
};

// ─── Subcomponents ────────────────────────────────────────────────────────────
function Arrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-1 gap-0.5">
      <div className="w-px h-5 bg-gradient-to-b from-slate-600 to-slate-500" />
      <ArrowDown size={12} className="text-slate-500 -mt-1" />
      {label && <span className="text-[9px] text-slate-600 uppercase tracking-widest font-black mt-0.5">{label}</span>}
    </div>
  );
}

function BranchLine({ side }: { side: 'left' | 'right' }) {
  return (
    <div className={`flex flex-col items-center ${side === 'left' ? 'items-end pr-4' : 'items-start pl-4'}`}>
      <div className="w-px h-5 bg-gradient-to-b from-slate-600 to-slate-500" />
      <ArrowDown size={12} className="text-slate-500 -mt-1" />
    </div>
  );
}

function NodeCard({ node, onClick, isActive }: { node: FlowNode; onClick: () => void; isActive: boolean }) {
  const c = C[node.color];
  const Icon = node.icon;
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        w-full text-left border rounded-2xl p-4 transition-all duration-300 cursor-pointer group
        ${c.border} ${c.bg}
        ${isActive ? c.glow + ' ring-1 ring-white/10' : 'hover:' + c.glow}
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.bg} border ${c.border}`}>
          <Icon size={16} className={c.text} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-black ${c.text}`}>{node.label}</p>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">{node.sublabel}</p>
        </div>
        <Info size={13} className={`${c.text} opacity-40 group-hover:opacity-80 transition-opacity shrink-0`} />
      </div>
    </motion.button>
  );
}

function SmallNodeCard({ node, onClick, isActive }: { node: FlowNode; onClick: () => void; isActive: boolean }) {
  const c = C[node.color];
  const Icon = node.icon;
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`
        w-full text-left border rounded-xl p-3 transition-all duration-300 cursor-pointer
        ${c.border} ${c.bg}
        ${isActive ? c.glow + ' ring-1 ring-white/10' : 'hover:' + c.glow}
      `}
    >
      <div className="flex items-center gap-2">
        <Icon size={14} className={c.text} />
        <div>
          <p className={`text-xs font-black ${c.text}`}>{node.label}</p>
          <p className="text-[9px] text-slate-500 leading-tight mt-0.5">{node.sublabel}</p>
        </div>
      </div>
    </motion.button>
  );
}

function DetailPanel({ node, onClose }: { node: FlowNode; onClose: () => void }) {
  const c = C[node.color];
  const Icon = node.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`border rounded-2xl p-5 ${c.border} ${c.bg} ${c.glow} flex flex-col gap-4`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.bg} border ${c.border}`}>
            <Icon size={18} className={c.text} />
          </div>
          <div>
            <p className={`font-black text-base ${c.text}`}>{node.label}</p>
            <p className="text-[10px] text-slate-500 font-medium">{node.sublabel}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors">
          <X size={16} />
        </button>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">{node.detail}</p>

      {node.actions && (
        <div>
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2">Acciones en el sistema</p>
          <div className="flex flex-col gap-1.5">
            {node.actions.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <ChevronRight size={10} className={c.text} />
                <span className="text-[11px] text-slate-300">{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function FlujoProcesosView() {
  const [activeNode, setActiveNode] = useState<FlowNode | null>(null);

  const toggle = (node: FlowNode) =>
    setActiveNode(prev => prev?.id === node.id ? null : node);

  const fadeIn = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, delay, ease: 'easeOut' },
  });

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <motion.div {...fadeIn(0)} className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <GitBranch size={20} className="text-blue-400" />
          <h1 className="text-xl font-black text-white tracking-tight">Diagrama de Flujo de Proceso</h1>
        </div>
        <p className="text-sm text-slate-400 ml-8">
          Haz clic en cualquier etapa para ver detalles y acciones disponibles en el sistema.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* ── LEFT: Diagram ──────────────────────────────────────── */}
        <div className="flex flex-col items-center">

          {/* Stage 1: Orden de Trabajo */}
          <motion.div {...fadeIn(0.05)} className="w-full max-w-sm">
            <NodeCard node={NODES[0]} onClick={() => toggle(NODES[0])} isActive={activeNode?.id === NODES[0].id} />
          </motion.div>

          <motion.div {...fadeIn(0.1)}><Arrow label="genera" /></motion.div>

          {/* Stage 2: Viajeros — 3 columns visual */}
          <motion.div {...fadeIn(0.15)} className="w-full max-w-sm">
            <div className="border border-slate-700/60 rounded-2xl p-3 bg-slate-800/30">
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2 text-center">
                Viajeros (uno por componente)
              </p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {['Eje central', 'Brida', 'Soporte'].map((name, i) => (
                  <div key={i} className="border border-blue-500/30 rounded-xl p-2 bg-blue-500/5 text-center">
                    <Route size={12} className="text-blue-400 mx-auto mb-1" />
                    <p className="text-[9px] text-blue-300 font-black leading-tight">{name}</p>
                  </div>
                ))}
              </div>
              <NodeCard node={NODES[1]} onClick={() => toggle(NODES[1])} isActive={activeNode?.id === NODES[1].id} />
            </div>
          </motion.div>

          <motion.div {...fadeIn(0.2)}><Arrow label="entra a" /></motion.div>

          {/* Stage 3: Operaciones */}
          <motion.div {...fadeIn(0.25)} className="w-full max-w-sm">
            <div className="border border-slate-700/60 rounded-2xl p-3 bg-slate-800/30">
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2 text-center">
                Secuencia de operaciones (ruta)
              </p>
              <div className="flex items-center justify-center gap-1 mb-3 flex-wrap">
                {['Op10 Corte', 'Op20 Maquinado', 'Op30 Soldadura', 'Op40 Acabado'].map((op, i, arr) => (
                  <React.Fragment key={i}>
                    <span className="text-[9px] bg-slate-700/60 border border-slate-600/50 text-slate-300 rounded-lg px-2 py-1 font-black">{op}</span>
                    {i < arr.length - 1 && <ChevronRight size={10} className="text-slate-600" />}
                  </React.Fragment>
                ))}
              </div>
              <NodeCard node={NODES[2]} onClick={() => toggle(NODES[2])} isActive={activeNode?.id === NODES[2].id} />
            </div>
          </motion.div>

          <motion.div {...fadeIn(0.3)}><Arrow label="va a" /></motion.div>

          {/* Stage 4: Inspección */}
          <motion.div {...fadeIn(0.35)} className="w-full max-w-sm">
            <NodeCard node={NODES[3]} onClick={() => toggle(NODES[3])} isActive={activeNode?.id === NODES[3].id} />
          </motion.div>

          {/* Branch split line */}
          <motion.div {...fadeIn(0.4)} className="w-full max-w-sm mt-3">
            <div className="relative flex justify-center">
              <div className="absolute top-0 left-1/4 right-1/4 h-px bg-slate-700" />
              <div className="absolute top-0 left-1/4 w-px h-5 bg-slate-700" />
              <div className="absolute top-0 right-1/4 w-px h-5 bg-slate-700" />
            </div>
            <div className="h-5" />
          </motion.div>

          {/* Two branches: Aprobado / Rechazado */}
          <motion.div {...fadeIn(0.45)} className="w-full max-w-sm grid grid-cols-2 gap-3">
            {/* Left: Approved */}
            <div className="flex flex-col gap-2">
              <SmallNodeCard node={OUTCOME_APPROVED} onClick={() => toggle(OUTCOME_APPROVED)} isActive={activeNode?.id === OUTCOME_APPROVED.id} />
              <div className="flex justify-center">
                <div className="flex flex-col items-center">
                  <div className="w-px h-4 bg-slate-700" />
                  <ArrowDown size={10} className="text-slate-600 -mt-1" />
                </div>
              </div>
              <div className="border border-emerald-500/30 rounded-xl p-2.5 bg-emerald-500/5 text-center">
                <CheckCircle2 size={14} className="text-emerald-400 mx-auto mb-1" />
                <p className="text-[10px] font-black text-emerald-400">COMPLETADO</p>
                <p className="text-[8px] text-slate-500 mt-0.5">OT avanza / se cierra</p>
              </div>
            </div>

            {/* Right: Rejected */}
            <div className="flex flex-col gap-2">
              <SmallNodeCard node={OUTCOME_REJECTED} onClick={() => toggle(OUTCOME_REJECTED)} isActive={activeNode?.id === OUTCOME_REJECTED.id} />
              <div className="flex justify-center">
                <div className="flex flex-col items-center">
                  <div className="w-px h-4 bg-slate-700" />
                  <ArrowDown size={10} className="text-slate-600 -mt-1" />
                </div>
              </div>
              {/* Decision diamond */}
              <div className="border border-amber-500/40 rounded-xl p-2 bg-amber-500/5 text-center">
                <AlertTriangle size={12} className="text-amber-400 mx-auto mb-1" />
                <p className="text-[9px] font-black text-amber-400">Disposición</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <SmallNodeCard node={OUTCOME_RETRABAJO} onClick={() => toggle(OUTCOME_RETRABAJO)} isActive={activeNode?.id === OUTCOME_RETRABAJO.id} />
                <SmallNodeCard node={OUTCOME_SCRAP} onClick={() => toggle(OUTCOME_SCRAP)} isActive={activeNode?.id === OUTCOME_SCRAP.id} />
              </div>
              {/* Loop back indicator */}
              <div className="border border-amber-500/20 rounded-xl p-2 bg-amber-500/4 flex items-center gap-1.5">
                <RotateCcw size={10} className="text-amber-500 shrink-0" />
                <p className="text-[8px] text-slate-500 leading-tight">Retrabajo vuelve a Operaciones → reinspección</p>
              </div>
            </div>
          </motion.div>

          {/* Legend */}
          <motion.div {...fadeIn(0.55)} className="w-full max-w-sm mt-8">
            <div className="border border-slate-700/40 rounded-2xl p-4 bg-slate-800/20">
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-3">Leyenda de colores</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {(Object.entries(C) as [NodeColor, typeof C[NodeColor]][]).map(([color, cfg]) => {
                  const labels: Record<NodeColor, string> = {
                    blue: 'Flujo normal', green: 'Completado / OK',
                    amber: 'Retrabajo / Alerta', red: 'Rechazo / Scrap',
                    violet: 'Inspección de calidad',
                  };
                  return (
                    <div key={color} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span className="text-[10px] text-slate-400">{labels[color]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── RIGHT: Detail panel ─────────────────────────────────── */}
        <div className="lg:sticky lg:top-6 self-start">
          <AnimatePresence mode="wait">
            {activeNode ? (
              <DetailPanel key={activeNode.id} node={activeNode} onClose={() => setActiveNode(null)} />
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="border border-dashed border-slate-700/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-center min-h-[180px]"
              >
                <Info size={20} className="text-slate-700" />
                <p className="text-xs text-slate-600 font-medium">
                  Haz clic en cualquier etapa del diagrama para ver detalles y las acciones disponibles en el sistema.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Process summary cards */}
          <motion.div {...fadeIn(0.3)} className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: 'Etapas del flujo', value: '4', color: 'text-blue-400', sub: 'OT → Viajero → Ops → Calidad' },
              { label: 'Desenlaces posibles', value: '4', color: 'text-violet-400', sub: 'Completado, Retrabajo, Scrap, OT cerrada' },
              { label: 'Tablas involucradas', value: '6', color: 'text-amber-400', sub: 'ordenes, viajeros, ops, insp., NC, retrabajos' },
              { label: 'Viajeros por orden', value: '1 - N', color: 'text-emerald-400', sub: 'Uno por componente o sub-ensamble' },
            ].map((card, i) => (
              <div key={i} className="border border-slate-700/40 rounded-xl p-3 bg-slate-800/20">
                <p className={`text-base font-black ${card.color}`}>{card.value}</p>
                <p className="text-[10px] font-black text-slate-300 mt-0.5">{card.label}</p>
                <p className="text-[8px] text-slate-600 mt-1 leading-tight">{card.sub}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
