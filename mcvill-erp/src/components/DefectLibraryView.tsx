import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertOctagon, Search, Camera, TrendingUp, X, CheckCircle, GraduationCap } from 'lucide-react';
import clsx from 'clsx';

interface Defecto {
  id: string;
  codigo: string;
  nombre: string;
  categoria: 'DIMENSIONAL' | 'SUPERFICIAL' | 'MATERIAL' | 'SOLDADURA' | 'ENSAMBLE';
  severidad: 'MENOR' | 'MAYOR' | 'CRÍTICO';
  descripcion: string;
  causas: string[];
  acciones: string[];
  frecuencia: number;
  partes: string[];
  tieneQuiz: boolean;
}

const DEFECTOS: Defecto[] = [
  {
    id: 'd-001', codigo: 'DEF-DIM-001', nombre: 'Sobremedida en diámetro exterior',
    categoria: 'DIMENSIONAL', severidad: 'MAYOR',
    descripcion: 'El diámetro exterior excede el límite superior de tolerancia especificado en el plano.',
    causas: ['Desgaste de inserto de corte', 'Variación de temperatura en pieza', 'Error en compensación de herramienta (TLO)'],
    acciones: ['Verificar y compensar TLO en control', 'Medir temperatura de pieza antes de corte', 'Cambiar inserto si rebaba visible'],
    frecuencia: 23, partes: ['AC-2304', 'WT-0812'], tieneQuiz: true,
  },
  {
    id: 'd-002', codigo: 'DEF-SUP-001', nombre: 'Rayadura en superficie de acabado',
    categoria: 'SUPERFICIAL', severidad: 'MENOR',
    descripcion: 'Marcas lineales en superficie de acabado que exceden Ra especificada en plano.',
    causas: ['Manipulación incorrecta entre operaciones', 'Viruta atrapada durante amarre', 'Refrigerante insuficiente'],
    acciones: ['Usar protectores de superficie entre ops', 'Limpiar plato antes de amarre', 'Verificar flujo de refrigerante'],
    frecuencia: 41, partes: ['KN-441', 'JB-1192'], tieneQuiz: true,
  },
  {
    id: 'd-003', codigo: 'DEF-SOL-001', nombre: 'Porosidad en cordón de soldadura',
    categoria: 'SOLDADURA', severidad: 'CRÍTICO',
    descripcion: 'Cavidades internas o superficiales en el cordón de soldadura por atrapamiento de gas.',
    causas: ['Contaminación superficial (aceite, humedad)', 'Gas de protección insuficiente', 'Velocidad de avance excesiva'],
    acciones: ['Limpiar con acetona antes de soldar', 'Verificar caudal de gas (15-20 L/min)', 'Reducir velocidad según WPS'],
    frecuencia: 8, partes: ['WT-0812'], tieneQuiz: true,
  },
  {
    id: 'd-004', codigo: 'DEF-MAT-001', nombre: 'Grieta térmica en zona de corte láser',
    categoria: 'MATERIAL', severidad: 'CRÍTICO',
    descripcion: 'Microgrietas en zona afectada por calor (ZAC) por gradiente térmico excesivo.',
    causas: ['Velocidad de corte demasiado baja', 'Potencia excesiva para el espesor', 'Material con carbon equivalent alto'],
    acciones: ['Aumentar velocidad según tabla parámetros', 'Ajustar potencia con tabla Trumpf', 'Solicitar certificado de material a proveedor'],
    frecuencia: 5, partes: ['KN-441'], tieneQuiz: false,
  },
  {
    id: 'd-005', codigo: 'DEF-ENS-001', nombre: 'Desalineación en ensamble',
    categoria: 'ENSAMBLE', severidad: 'MAYOR',
    descripcion: 'Desplazamiento entre componentes ensamblados que excede tolerancia de posición.',
    causas: ['Desgaste de plantilla de posicionamiento', 'Secuencia de apriete incorrecta', 'Variación dimensional acumulada'],
    acciones: ['Calibrar plantilla con CMM', 'Seguir torque de apriete en WI-ENS-002', 'Aplicar worst-case analysis en BOM'],
    frecuencia: 12, partes: ['AC-2304', 'WT-0812', 'KN-441'], tieneQuiz: false,
  },
];

const catColor: Record<string, string> = {
  DIMENSIONAL: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  SUPERFICIAL:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
  MATERIAL:     'text-rose-400 bg-rose-500/10 border-rose-500/20',
  SOLDADURA:    'text-orange-400 bg-orange-500/10 border-orange-500/20',
  ENSAMBLE:     'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

const sevColor: Record<string, string> = {
  MENOR: 'text-emerald-400', MAYOR: 'text-amber-400', CRÍTICO: 'text-rose-400',
};

const QUIZ_QUESTIONS = [
  { pregunta: '¿Cuál es la primera acción al detectar sobremedida en diámetro?', opciones: ['Cambiar inserto', 'Verificar y compensar TLO en control', 'Rechazar pieza', 'Llamar al supervisor'], correcta: 1 },
  { pregunta: '¿Qué causa principal genera porosidad en soldadura?', opciones: ['Alta velocidad', 'Contaminación superficial', 'Temperatura ambiente', 'Tipo de electrodo'], correcta: 1 },
];

export const DefectLibraryView: React.FC = () => {
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState<string>('TODOS');
  const [selected, setSelected]     = useState<Defecto | null>(null);
  const [quizActive, setQuizActive] = useState(false);
  const [quizStep, setQuizStep]     = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore]   = useState(0);
  const [quizDone, setQuizDone]     = useState(false);

  const categorias = ['TODOS', 'DIMENSIONAL', 'SUPERFICIAL', 'MATERIAL', 'SOLDADURA', 'ENSAMBLE'];
  const filtered = DEFECTOS.filter(d =>
    (catFilter === 'TODOS' || d.categoria === catFilter) &&
    (d.nombre.toLowerCase().includes(search.toLowerCase()) || d.codigo.toLowerCase().includes(search.toLowerCase()))
  );

  const startQuiz = () => { setQuizActive(true); setQuizStep(0); setQuizAnswer(null); setQuizScore(0); setQuizDone(false); };
  const answerQuiz = (idx: number) => {
    setQuizAnswer(idx);
    if (idx === QUIZ_QUESTIONS[quizStep].correcta) setQuizScore(s => s + 1);
    setTimeout(() => {
      if (quizStep + 1 >= QUIZ_QUESTIONS.length) setQuizDone(true);
      else { setQuizStep(s => s + 1); setQuizAnswer(null); }
    }, 1000);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {/* Header */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-500/20">
            <AlertOctagon className="text-orange-400" size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight uppercase">
              BASE DE <span className="text-orange-400">DEFECTOS</span>
            </h2>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Biblioteca Visual · E-Learning · Calidad McVill</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="BUSCAR DEFECTO..."
              className="pl-8 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-[10px] font-bold text-white outline-none focus:border-orange-500/40 w-44" />
          </div>
          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
            {filtered.length} <span className="text-orange-400">defectos</span>
          </div>
        </div>
      </div>

      {/* Category filters */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/10 flex items-center gap-2 shrink-0 flex-wrap">
        {categorias.map(cat => (
          <button key={cat} onClick={() => setCatFilter(cat)}
            className={clsx('px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all',
              catFilter === cat ? 'bg-orange-500/20 border-orange-500/30 text-orange-400' : 'border-white/5 bg-slate-900/40 text-slate-500 hover:text-white hover:border-white/10')}>
            {cat}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Grid */}
        <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start overflow-y-auto custom-scrollbar">
          {filtered.map((d, i) => (
            <motion.button key={d.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelected(d)}
              className={clsx('text-left p-4 rounded-xl border transition-all',
                selected?.id === d.id ? 'border-orange-500/50 bg-orange-500/10' : 'border-white/5 bg-slate-900/40 hover:border-white/10')}>
              <div className="w-full h-20 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center mb-3 gap-2">
                <Camera size={20} className="text-slate-600" />
                <span className="text-[9px] text-slate-600">Sin foto</span>
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-black text-slate-500">{d.codigo}</span>
                <span className={clsx('text-[9px] font-black', sevColor[d.severidad])}>{d.severidad}</span>
              </div>
              <p className="text-[11px] font-black text-white leading-tight uppercase">{d.nombre}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={clsx('text-[8px] px-2 py-0.5 rounded-full border font-black', catColor[d.categoria])}>{d.categoria}</span>
                <span className="text-[8px] text-slate-500 ml-auto flex items-center gap-1">
                  <TrendingUp size={8} />{d.frecuencia} casos
                </span>
              </div>
              {d.tieneQuiz && (
                <div className="flex items-center gap-1 mt-2 text-[8px] text-purple-400 font-black">
                  <GraduationCap size={8} /> QUIZ DISPONIBLE
                </div>
              )}
            </motion.button>
          ))}
        </div>

        {/* Detail sidebar */}
        <AnimatePresence>
          {selected && (
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
              className="w-80 shrink-0 border-l border-white/5 bg-slate-900/60 p-5 overflow-y-auto custom-scrollbar flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className={clsx('text-[8px] font-black px-2 py-0.5 rounded-full border', catColor[selected.categoria])}>{selected.categoria}</span>
                  <h3 className="text-sm font-black text-white mt-2 uppercase">{selected.nombre}</h3>
                  <p className="text-[9px] text-slate-500">{selected.codigo} · <span className={sevColor[selected.severidad]}>{selected.severidad}</span></p>
                </div>
                <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-white/5">
                  <X size={14} className="text-slate-400" />
                </button>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">{selected.descripcion}</p>

              <div>
                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2">Causas raíz</p>
                {selected.causas.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px] text-slate-400 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400/50 shrink-0 mt-1.5" />
                    {c}
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2">Acciones correctivas</p>
                {selected.acciones.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px] text-slate-300 mb-1.5">
                    <CheckCircle size={10} className="text-emerald-400 shrink-0 mt-0.5" />
                    {a}
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2">Partes afectadas</p>
                <div className="flex flex-wrap gap-1">
                  {selected.partes.map(p => (
                    <span key={p} className="text-[8px] px-2 py-0.5 rounded-full bg-slate-800 border border-white/5 text-slate-400">{p}</span>
                  ))}
                </div>
              </div>

              {selected.tieneQuiz && (
                <button onClick={startQuiz}
                  className="w-full py-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-purple-500/30 transition-all">
                  <GraduationCap size={12} /> INICIAR QUIZ DE CAPACITACIÓN
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quiz modal */}
      <AnimatePresence>
        {quizActive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-[480px] bg-slate-900 border border-white/10 rounded-2xl p-7 shadow-2xl">
              {!quizDone ? (
                <>
                  <div className="flex items-center gap-2 mb-5">
                    <GraduationCap size={16} className="text-purple-400" />
                    <p className="text-[11px] font-black text-white uppercase tracking-wider">Quiz — Pregunta {quizStep + 1}/{QUIZ_QUESTIONS.length}</p>
                    <button onClick={() => setQuizActive(false)} className="ml-auto p-1 hover:bg-white/5 rounded-lg">
                      <X size={14} className="text-slate-400" />
                    </button>
                  </div>
                  <p className="text-sm text-white font-bold mb-5">{QUIZ_QUESTIONS[quizStep].pregunta}</p>
                  <div className="space-y-2">
                    {QUIZ_QUESTIONS[quizStep].opciones.map((op, i) => (
                      <button key={i} onClick={() => quizAnswer === null && answerQuiz(i)}
                        className={clsx('w-full text-left px-4 py-3 rounded-xl text-[11px] transition-all border',
                          quizAnswer === null ? 'border-white/10 bg-slate-800/60 hover:border-purple-500/30 text-slate-200'
                          : i === QUIZ_QUESTIONS[quizStep].correcta ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                          : i === quizAnswer ? 'border-rose-500/50 bg-rose-500/10 text-rose-300'
                          : 'border-white/5 bg-slate-800/30 text-slate-500')}>
                        {op}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-4xl font-black text-white mb-2">{quizScore}/{QUIZ_QUESTIONS.length}</p>
                  <p className="text-slate-400 text-sm mb-5">{quizScore === QUIZ_QUESTIONS.length ? '¡Perfecto! Conocimiento validado.' : 'Repasa las causas y acciones correctivas.'}</p>
                  <button onClick={() => setQuizActive(false)} className="px-6 py-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 font-black text-[10px] uppercase tracking-widest">
                    Cerrar
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DefectLibraryView;
