import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Loader2, Maximize2, Minimize2, Mic, MicOff, Phone, Trash2, Copy } from 'lucide-react';
import { aiService } from '../services/aiService';
import { LiveVoiceModalERP } from './LiveVoiceModalERP';
import { useConfig } from '../contexts/ConfigContext';
import { toast, appConfirm } from '../lib/dialogs';

interface Message {
  id: string;
  role: 'ai' | 'user';
  content: string;
}

export const AIChatBubble = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'ai', content: 'Hola, soy el Cerebro Neural de Control. ¿En qué puedo ayudarte hoy? Puedo asistirte con políticas, seguridad, operaciones, reportes y navegación del sistema.' }
  ]);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceCallOpen, setIsVoiceCallOpen] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef('');

  const { isDarkMode } = useConfig();

  useEffect(() => {
    inputRef.current = message;
  }, [message]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (forceMessage?: string) => {
    const msgToSend = forceMessage || message;
    if (!msgToSend.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msgToSend };
    setMessage('');
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await aiService.askGemini(msgToSend);
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', content: response };
      setMessages(prev => [...prev, aiMsg]);

      if (voiceMode) {
        const utterance = new SpeechSynthesisUtterance(response);
        utterance.rate = 1.0;
        utterance.lang = 'es-MX';
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', content: 'Error en la conexión neural. Por favor, verifica tu API Key.' }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setVoiceStatus('');
      window.speechSynthesis.cancel();
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        toast('Reconocimiento de voz no soportado.', 'info');
        return;
      }

      window.speechSynthesis.cancel();
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'es-MX';

      recognition.onstart = () => {
        setVoiceStatus('Escuchando...');
        setVoiceMode(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setMessage(transcript);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'no-speech') setVoiceStatus('Sin voz detectada');
        else if (event.error === 'not-allowed') setVoiceStatus('Micrófono denegado');
      };

      recognition.onend = () => {
        setIsListening(false);
        setVoiceStatus('');
        if (inputRef.current.trim()) {
          handleSend(inputRef.current);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    }
  };

  const deleteMessage = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleReset = async () => {
    if (messages.length > 1 && await appConfirm('¿Borrar historial?')) {
      setMessages([{ id: '1', role: 'ai', content: 'Chat borrado. ¿En qué puedo ayudarte?' }]);
    }
  };

  return (
<div className="fixed bottom-6 right-6 z-[200]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className={`
              bg-slate-900 border border-mcvill-accent/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-500
              ${isMaximized ? 'fixed inset-8' : 'w-[380px] h-[520px] mb-4'}
            `}
          >
            <div className="p-6 border-b border-mcvill-accent/10 flex justify-between items-center bg-gradient-to-r from-mcvill-accent/10 to-slate-900">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-mcvill-accent flex items-center justify-center shadow-lg shadow-mcvill-accent/30">
                  <Bot className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest">Neural Core</h3>
                  <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleReset} className="p-2 hover:bg-red-500/10 rounded-2xl text-red-400 transition-colors" title="Borrar">
                  <Trash2 size={14} />
                </button>
                <button onClick={() => setIsMaximized(!isMaximized)} className="p-2 hover:bg-white/10 rounded-2xl text-slate-400 transition-colors">
                  {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-2xl text-slate-400 transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''} flex gap-3`}>
                    <div className={`w-8 h-8 rounded-2xl flex-shrink-0 flex items-center justify-center ${
                      msg.role === 'ai' ? 'bg-mcvill-accent/10 text-mcvill-accent border border-mcvill-accent/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {msg.role === 'ai' ? <Bot size={14} /> : <User size={14} />}
                    </div>
                    <div className={`p-4 rounded-2xl text-xs font-medium leading-relaxed relative group ${
                      msg.role === 'ai' 
                        ? 'bg-slate-800 border border-slate-700 text-slate-100 shadow-sm'
                        : 'bg-mcvill-accent text-white shadow-lg shadow-mcvill-accent/10'
                    }`}>
                      {msg.content}
                      <div className={`flex items-center gap-1 mt-2 pt-2 ${msg.role === 'user' ? 'border-t border-white/20' : 'border-t border-mcvill-accent/30'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                        <button onClick={() => copyMessage(msg.content)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700" title="Copiar">
                          <Copy size={10} />
                        </button>
                        <button onClick={() => deleteMessage(msg.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-500/20" title="Eliminar">
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-2xl bg-mcvill-accent/10 text-mcvill-accent border border-mcvill-accent/20 flex items-center justify-center">
                      <Loader2 size={14} className="animate-spin" />
                    </div>
                    <div className="p-4 bg-slate-800 border border-slate-700 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Procesando...
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-900 border-t border-mcvill-accent/10">
              {voiceStatus && (
                <p className={`text-xs mb-2 ${voiceStatus.includes('Error') ? 'text-red-400' : 'text-blue-400'} animate-pulse`}>
                  {voiceStatus}
                </p>
              )}
              <div className="relative group">
                <input 
                  type="text" 
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Escribe tu duda aquí..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 pl-6 pr-28 focus:ring-2 focus:ring-mcvill-accent/20 transition-all outline-none text-slate-100 font-bold text-xs placeholder:text-slate-500"
                />
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-2">
                  <button
                    onClick={toggleListening}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                      isListening 
                        ? 'bg-red-500 text-white animate-pulse shadow-lg' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-white hover:bg-mcvill-accent'
                    }`}
                    title={isListening ? 'Detener' : 'Micrófono'}
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                  
                  <button
                    onClick={() => setIsVoiceCallOpen(true)}
                    className="w-10 h-10 rounded-2xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-white hover:bg-blue-500 transition-all"
                    title="Llamada de voz"
                  >
                    <Phone size={16} />
                  </button>
                </div>
                
                <button 
                  onClick={() => handleSend()}
                  disabled={loading || !message.trim()}
                  className="px-5 py-2.5 rounded-2xl bg-mcvill-accent text-white flex items-center justify-center gap-2 font-bold text-xs shadow-lg shadow-mcvill-accent/20 hover:scale-105 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Enviar
                </button>
              </div>
              
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-4 text-center">
                Potenciado por Gemini 2.5 Flash-Lite • Control Intelligence
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

<button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-14 h-14 rounded-full btn-ai shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 relative group
          ${isOpen ? 'rotate-90' : ''}
        `}
      >
        <div className="absolute inset-0 rounded-full bg-mcvill-accent animate-ping opacity-20 group-hover:opacity-40 transition-opacity" />
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      <LiveVoiceModalERP
        isOpen={isVoiceCallOpen}
        onClose={() => setIsVoiceCallOpen(false)}
        theme={isDarkMode ? 'dark' : 'light'}
      />
    </div>
  );
};
