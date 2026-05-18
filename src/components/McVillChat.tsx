import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { 
  MessageSquare, 
  Send, 
  User, 
  Bot, 
  X, 
  Minimize2, 
  Maximize2, 
  Trash2, 
  Copy, 
  Check, 
  Sparkles, 
  Cpu, 
  ShieldCheck,
  FileText,
  Volume2,
  VolumeX,
  BookOpen,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiService } from '../services/aiService';
import { reportUtils } from '../utils/reportUtils';
import { parseToolCall, executeTool, AGENT_SYSTEM_PROMPT } from '../services/agentService';
import type { ToolResult } from '../services/agentService';
import { useConfig } from '../contexts/ConfigContext';
import { toast, appConfirm } from '../lib/dialogs';
import { eventBus } from '../utils/eventBus';
import { MODULE_GUIDES } from '../data/moduleGuides';
import { MODULE_GUIDES_EN } from '../data/moduleGuidesEn';

const LiveVoiceModal = lazy(() => import('./LiveVoiceModalERP').then(m => ({ default: m.LiveVoiceModalERP })));

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolResult?: ToolResult;
}

interface McVillChatProps {
  isPanel?: boolean;
  onClose?: () => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  autoSendPrompt?: string | null;
  onAutoSendConsumed?: () => void;
}

// Contexto del Manual específico para el ERP Control - Compilado Dinámicamente para todos los módulos
function getErpManualContext(logoText: string): string {
  const allModulesSummary = Object.values(MODULE_GUIDES)
    .map((g, i) => `${i + 1}. **${g.label}** (${g.emoji}): ${g.description}. Pasos clave: ${g.steps.map(s => s.title).join(' ➔ ')}`)
    .join('\n');

  return `
Eres el Manual Oficial e Inteligencia de Soporte de Control ERP (${logoText}).
Aquí tienes la guía de operación completa y actualizada de todos los módulos del sistema (Agus Pro Standard):

${allModulesSummary}

**Directrices de Respuesta**:
- El sistema utiliza IA (Control Core v2.5) para automatizar el 90% de la carga operativa.
- Si el usuario pregunta por "Agus Pro", explícale que es el estándar de excelencia en automatización, diseño premium y eficiencia del sistema.
- Siempre sé profesional, ejecutivo y enfocado en la eficiencia industrial.
`;
}

export const McVillChat: React.FC<McVillChatProps> = ({
  isPanel = false,
  onClose,
  isMaximized = false,
  onToggleMaximize,
  autoSendPrompt,
  onAutoSendConsumed,
}) => {
  const { isDarkMode: isDark, config } = useConfig();
  const ERP_MANUAL_CONTEXT = getErpManualContext(config.logoText);
  const [isOpen, setIsOpen] = useState(!isPanel);
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('mcvill_erp_chat_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('mcvill_erp_chat_history', JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const unsub = eventBus.subscribe('CHAT_ASK', (payload: { prompt: string }) => {
      if (!isPanel) setIsOpen(true);
      handleSend(undefined, payload.prompt);
    });
    return unsub;
  }, [messages, isLoading, isOpen]);

  // Consume el prompt pendiente cuando App.tsx abrió el panel y pasó el prompt vía prop
  useEffect(() => {
    if (!autoSendPrompt) return;
    handleSend(undefined, autoSendPrompt);
    onAutoSendConsumed?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSendPrompt]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    e?.preventDefault();
    const textToSend = customText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Formatear historial para la API
      const history = messages.slice(-10).map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      // RAG: snapshot del sistema + knowledge base de Supabase en paralelo
      let systemSnapshot = '';
      let knowledgeContext = '';
      try {
        const [orders, inventory, customers, knowledge] = await Promise.all([
          supabase.from('ordenes_trabajo').select('id, order_number, status').limit(5),
          supabase.from('materiales').select('descripcion_mp, peso_mp').limit(5),
          supabase.from('clientes').select('razon_social').limit(5),
          aiService.getKnowledge().catch(() => []),
        ]);

        systemSnapshot = `DATOS REALES DEL SISTEMA (SNAPSHOT):
- Órdenes Recientes: ${orders.data?.map((o: any) => `${o.order_number}(${o.status})`).join(', ') || 'Sin datos'}
- Inventario Muestra: ${inventory.data?.map((i: any) => `${i.descripcion_mp}:${i.peso_mp}kg`).join(', ') || 'Sin datos'}
- Clientes Muestra: ${customers.data?.map((c: any) => c.razon_social).join(', ') || 'Sin datos'}`;

        if (knowledge.length > 0) {
          knowledgeContext = `BASE DE CONOCIMIENTO CORPORATIVO:\n${
            knowledge.map(k => `[${k.category}] ${k.title}: ${k.content}`).join('\n')
          }`;
        }
      } catch (e) {
        console.warn('Could not fetch snapshot:', e);
      }

      const fullSystemInstruction = `
        ${ERP_MANUAL_CONTEXT}

        ${knowledgeContext}

        ${systemSnapshot}

        INSTRUCCIONES ADICIONALES:
        - Responde preguntas sobre el estado del sistema usando el SNAPSHOT y la BASE DE CONOCIMIENTO.
        - Prioriza información de la BASE DE CONOCIMIENTO sobre el manual estático.
        - Si el usuario pregunta por algo no disponible, indícale que puede consultar los módulos en la barra lateral.

        ${AGENT_SYSTEM_PROMPT}
      `;

      const response = await aiService.askGemini(
        textToSend,
        'GENERAL',
        history,
        fullSystemInstruction
      );

      // Detect if the AI returned a tool call and execute it
      const toolCall = parseToolCall(response);
      let toolResult: ToolResult | undefined;
      if (toolCall) {
        toolResult = await executeTool(toolCall);
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: toolCall
          ? `⚡ Ejecutando: **${toolResult?.title ?? toolCall.tool}**`
          : response,
        timestamp: Date.now(),
        toolResult,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Lo siento, he perdido la conexión con el núcleo neural. Por favor, intenta de nuevo.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    if (await appConfirm('¿Deseas eliminar todo el historial de conversación?')) {
      setMessages([]);
      localStorage.removeItem('mcvill_erp_chat_history');
    }
  };

  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const deleteMessage = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const exportChatToPDF = () => {
    if (messages.length === 0) {
      toast('No hay mensajes para exportar.', 'info');
      return;
    }
    
    const data = messages.map(m => ({
      Rol: m.role === 'user' ? 'USUARIO' : 'Control IA',
      Hora: new Date(m.timestamp).toLocaleTimeString(),
      Contenido: m.content
    }));
    
    reportUtils.exportToPDF(
      'Transcripción de Conversación - Control ERP',
      data,
      'chat_Control',
      'INTELIGENCIA ARTIFICIAL'
    );
  };

  const quickActions = [
    { icon: <FileText size={14} />, label: 'Faltas de hoy', prompt: '¿Cuántas faltas hay hoy?' },
    { icon: <Sparkles size={14} />, label: 'Cuellos de botella', prompt: '¿Qué cuellos de botella hay en producción?' },
    { icon: <ShieldCheck size={14} />, label: 'Riesgo de paro', prompt: '¿Hay riesgo de paro de producción?' },
    { icon: <Info size={14} />, label: 'Ayuda General', prompt: 'Dame un resumen de lo que puedo hacer en Control ERP' },
  ];

  const statusColors: Record<string, string> = {
    ok:      'border-green-500/40 bg-green-500/5',
    warning: 'border-yellow-400/40 bg-yellow-400/5',
    danger:  'border-red-500/40 bg-red-500/5',
    info:    'border-mcvill-accent/40 bg-mcvill-accent/5',
  };
  const statusBadge: Record<string, string> = {
    ok:      'bg-green-500/20 text-green-400',
    warning: 'bg-yellow-400/20 text-yellow-300',
    danger:  'bg-red-500/20 text-red-400',
    info:    'bg-mcvill-accent/20 text-mcvill-accent',
  };

  const ToolResultCard = ({ result }: { result: ToolResult }) => (
    <div className={`mt-2 rounded-xl border p-3 text-xs ${statusColors[result.status]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`px-2 py-0.5 rounded-full font-black uppercase tracking-widest text-[9px] ${statusBadge[result.status]}`}>
          {result.status === 'ok' ? '✅ OK' : result.status === 'warning' ? '⚠️ Alerta' : result.status === 'danger' ? '🔴 Riesgo' : '⚡ Acción'}
        </span>
        <span className="font-black text-white/80 truncate">{result.title}</span>
      </div>
      <p className="text-slate-400 mb-2 leading-snug">{result.summary}</p>
      {result.rows.length > 0 && (
        <div className="space-y-1 mb-2">
          {result.rows.map((row, i) => (
            <div key={i} className={`flex justify-between gap-2 py-0.5 ${row.highlight ? 'text-white' : 'text-slate-400'}`}>
              <span className="shrink-0 opacity-70">{row.label}</span>
              <span className="text-right font-mono">{row.value}</span>
            </div>
          ))}
        </div>
      )}
      {result.actions?.map((action, i) => (
        <button
          key={i}
          onClick={() => eventBus.emit('NAVIGATE_TO', { view: action.navigateTo })}
          className="mt-1 mr-1 px-3 py-1 rounded-lg bg-mcvill-accent/20 border border-mcvill-accent/30 text-mcvill-accent text-[10px] font-black uppercase tracking-wider hover:bg-mcvill-accent/30 transition-all"
        >
          {action.label}
        </button>
      ))}
    </div>
  );

  const formatMessage = (content: string) => {
    // Basic formatting for bold and lists
    return content.split('\n').map((line, i) => {
      let formattedLine = line;
      // Bold
      formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return <div key={i} className="flex gap-2 ml-2 my-1">
          <div className="w-1 h-1 rounded-full bg-mcvill-accent mt-2 shrink-0" />
          <span dangerouslySetInnerHTML={{ __html: formattedLine.trim().substring(2) }} />
        </div>;
      }
      return <p key={i} className="mb-2" dangerouslySetInnerHTML={{ __html: formattedLine }} />;
    });
  };

  const ChatLayout = (
    <motion.div 
      initial={isPanel ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={isPanel ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 20 }}
      className={`flex flex-col overflow-hidden border ${
        isPanel 
          ? 'w-full h-full bg-mcvill-bg/40 backdrop-blur-3xl border-transparent' 
          : 'fixed bottom-6 right-6 w-[400px] h-[600px] z-[100] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-mcvill-card-border/50 bg-mcvill-bg/90 backdrop-blur-xl'
      }`}
    >
      {/* Header */}
      <div className={`p-5 flex items-center justify-between border-b ${isDark ? 'border-mcvill-accent/30 bg-mcvill-bg/50' : 'bg-slate-50 border-mcvill-accent/20'}`}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-mcvill-accent/20 flex items-center justify-center border border-mcvill-accent/30 relative">
            <Cpu className="text-mcvill-accent animate-pulse" size={20} />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          </div>
          <div>
            <h3 className={`text-base font-black tracking-widest uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Control Core <span className="text-mcvill-accent text-xs">v2.5</span>
            </h3>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Soporte Operativo Activo</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsVoiceActive(true)}
            className={`p-2 rounded-2xl transition-all ${isDark ? 'hover:bg-mcvill-accent/10 text-slate-500 hover:text-mcvill-accent' : 'hover:bg-blue-50 text-blue-600'}`}
            title="Llamada de Voz"
          >
            <Volume2 size={16} />
          </button>
          <button
            onClick={clearHistory}
            className={`p-2 rounded-2xl transition-all ${isDark ? 'hover:bg-red-500/10 text-slate-500 hover:text-red-400' : 'hover:bg-red-100 text-red-600'}`}
            title="Limpiar Historial"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={exportChatToPDF}
            className={`p-2 rounded-2xl transition-all ${isDark ? 'hover:bg-blue-500/10 text-slate-500 hover:text-blue-400' : 'hover:bg-blue-100 text-blue-600'}`}
            title="Exportar PDF"
          >
            <FileText size={16} />
          </button>
          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              className={`p-2 rounded-2xl transition-all ${isDark ? 'hover:bg-white/5 text-slate-500 hover:text-white' : 'hover:bg-slate-200 text-slate-600'}`}
              title={isMaximized ? "Restaurar" : "Maximizar"}
            >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className={`p-2 rounded-2xl transition-all ${isDark ? 'hover:bg-white/5 text-slate-500 hover:text-white' : 'hover:bg-slate-200 text-slate-600'}`}
            >
              <X size={16} />
            </button>
          )}
          {!isPanel && (
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-all"
            >
              <Minimize2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-transparent">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
            <div className="w-20 h-20 rounded-full bg-mcvill-accent/10 flex items-center justify-center border border-mcvill-accent/20 animate-pulse">
              <Sparkles className="text-mcvill-accent" size={32} />
            </div>
            <div>
              <h4 className={`text-base font-black uppercase tracking-widest mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Bienvenido a Control Core</h4>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                Soy tu asistente central de Control ERP. Puedo ayudarte con manuales, reportes y gestión técnica.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(undefined, action.prompt)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left group ${
                    isDark 
                      ? 'bg-mcvill-bg/50 border-mcvill-card-border/50 hover:border-mcvill-accent/50 hover:bg-mcvill-accent/5' 
                      : 'bg-white border-mcvill-accent/20 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className={`p-2 rounded-2xl transition-colors ${isDark ? 'bg-slate-800 text-mcvill-accent group-hover:bg-mcvill-accent group-hover:text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                    {action.icon}
                  </div>
                  <span className={`text-xs font-black uppercase tracking-tight ${isDark ? 'text-slate-400 group-hover:text-white' : 'text-slate-600 group-hover:text-blue-700'}`}>
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div className={`max-w-[85%] p-4 rounded-2xl relative group ${
              msg.role === 'user'
                ? 'bg-gradient-to-br from-mcvill-accent to-blue-600 text-white rounded-tr-none shadow-lg shadow-mcvill-accent/20'
                : isDark 
                  ? 'bg-mcvill-bg/80 border border-mcvill-card-border/50 text-slate-200 rounded-tl-none backdrop-blur-md'
                  : 'bg-white border border-mcvill-accent/20 text-slate-800 rounded-tl-none shadow-sm'
            }`}>
              <div className="flex items-center gap-2 mb-2 opacity-50">
                {msg.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                  {msg.role === 'user' ? 'AUTENTICADO' : 'Control CORE'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {formatMessage(msg.content)}
                {msg.toolResult && <ToolResultCard result={msg.toolResult} />}
              </div>
              
              <div className={`mt-3 pt-2 border-t flex items-center justify-end gap-1 ${
                msg.role === 'user' ? 'border-white/10' : 'border-slate-100/10'
              }`}>
                <button
                  onClick={() => copyMessage(msg.content)}
                  className={`p-1.5 rounded-2xl transition-all ${
                    msg.role === 'user' 
                      ? 'hover:bg-white/10 text-white/60 hover:text-white' 
                      : 'hover:bg-slate-800 text-slate-500 hover:text-blue-400'
                  }`}
                  title="Copiar"
                >
                  <Copy size={12} />
                </button>
                <button
                  onClick={() => deleteMessage(msg.id)}
                  className={`p-1.5 rounded-2xl transition-all ${
                    msg.role === 'user' 
                      ? 'hover:bg-white/10 text-white/60 hover:text-red-300' 
                      : 'hover:bg-slate-800 text-slate-500 hover:text-red-400'
                  }`}
                  title="Eliminar"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className={`p-4 rounded-2xl rounded-tl-none flex items-center gap-3 ${isDark ? 'bg-mcvill-bg/50 border border-mcvill-accent/30' : 'bg-slate-50 border border-mcvill-accent/20'}`}>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-mcvill-accent rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-mcvill-accent rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-mcvill-accent rounded-full animate-bounce" />
              </div>
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Control Procesa...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={`p-5 border-t ${isDark ? 'border-mcvill-accent/30 bg-mcvill-bg/50' : 'bg-slate-50 border-mcvill-accent/20'}`}>
        <form onSubmit={handleSend} className="relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu consulta al núcleo..."
            className={`w-full py-3.5 pl-5 pr-14 rounded-2xl border text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-mcvill-accent/30 ${
              isDark 
                ? 'bg-mcvill-bg border-mcvill-card-border/50 text-white placeholder:text-slate-600 focus:border-mcvill-accent' 
                : 'bg-white border-mcvill-accent/20 text-slate-900 focus:border-blue-500'
            }`}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-2xl transition-all ${
              input.trim() && !isLoading
                ? 'bg-mcvill-accent text-white shadow-lg shadow-mcvill-accent/30 hover:scale-105 active:scale-95'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <Send size={16} />
          </button>
        </form>
        <p className="text-[10px] font-black text-slate-600 text-center mt-4 tracking-[0.3em] uppercase">
          Control Intelligence Core • Agus Pro Standard
        </p>
      </div>

      <Suspense fallback={null}>
        {isVoiceActive && (
          <LiveVoiceModal 
            isOpen={isVoiceActive} 
            onClose={() => {
              setIsVoiceActive(false);
              if (onClose) onClose();
            }} 
          />
        )}
      </Suspense>
    </motion.div>
  );

  if (isPanel) return ChatLayout;

  return (
    <>
      <AnimatePresence>
        {isOpen ? ChatLayout : (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-16 h-16 rounded-2xl btn-ai shadow-2xl z-[100] flex items-center justify-center group border border-white/20 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <MessageSquare size={24} className="group-hover:scale-110 transition-transform" />
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-4 border-slate-900 flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};
