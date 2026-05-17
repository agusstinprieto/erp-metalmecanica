import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { 
  X,
  PhoneOff,
  Loader2,
  Mic,
  Volume2,
  User,
  AlertCircle,
  Activity,
  Sparkles
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { decode, decodeAudioData, createPCM16kBlob } from '../utils/audioUtils';
import { supabase } from '../lib/supabase';
import { tenantService } from '../services/tenantService';
import { useConfig } from '../contexts/ConfigContext';
import { MODULE_GUIDES, DEFAULT_GUIDE } from '../data/moduleGuides';
import { MODULE_GUIDES_EN, DEFAULT_GUIDE_EN } from '../data/moduleGuidesEn';
import { useLanguage } from '../contexts/LanguageContext';

const Modality = { AUDIO: 'audio' as any };
type LiveServerMessage = any;

interface LiveVoiceModalERPProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
  isPanel?: boolean;
  currentModule?: string;
}

const APP_VERSION = '2.5.0-ERP';

function buildSystemInstruction(moduleId?: string, brandName?: string, language: 'es' | 'en' = 'es'): string {
  const guidesDict = language === 'en' ? MODULE_GUIDES_EN : MODULE_GUIDES;
  const defaultG = language === 'en' ? DEFAULT_GUIDE_EN : DEFAULT_GUIDE;
  const guide = moduleId ? (guidesDict[moduleId] ?? defaultG) : defaultG;

  // Dynamically compile a comprehensive dictionary of all modules in the manual
  const allModulesSummary = Object.values(guidesDict)
    .map((g, i) => `◆ ${g.label} (${g.emoji}): ${g.description}. Pasos clave: ${g.steps.map(s => s.title).join(' ➔ ')}`)
    .join('\n');

  if (language === 'en') {
    const moduleContext = moduleId
      ? `ACTIVE MODULE: ${guide.label} ${guide.emoji}\n${guide.description}\n\nHOW TO TEACH THIS MODULE (when the user asks how to use it):\n${guide.steps.map((s, i) => `${i + 1}. ${s.title} — ${s.subtitle}:\n   ${s.tips.join('\n   ')}`).join('\n\n')}`
      : 'The user is not in any specific module.';

    return `You are the Neural Control Brain of ${brandName || 'McVill'} ERP (IA PRO). An elite voice assistant specialized in industrial operations.
Your tone is professional, efficient, direct, and tech-driven (Agus Pro Standard).

${moduleContext}

COMPLETE SYSTEM USER MANUAL:
${allModulesSummary}

VOICE RULES:
1. Respond concisely and fluidly (maximum 2-3 sentences per answer).
2. If the user asks how to use the current module, teach them step-by-step.
3. Speak in a natural, executive, and helpful English.
4. If the user asks about "Agus Pro", explain that it is the standard of excellence in automation and design of the ERP.
`;
  } else {
    const moduleContext = moduleId
      ? `MÓDULO ACTIVO: ${guide.label} ${guide.emoji}\n${guide.description}\n\nCÓMO ENSEÑAR ESTE MÓDULO (cuando el usuario pregunte cómo usarlo):\n${guide.steps.map((s, i) => `${i + 1}. ${s.title} — ${s.subtitle}:\n   ${s.tips.join('\n   ')}`).join('\n\n')}`
      : 'El usuario no está en ningún módulo específico.';

    return `Eres el Cerebro Neural de Control ERP ${brandName || 'McVill'} (IA PRO). Un asistente de voz de élite especializado en operaciones industriales.
Tu tono es profesional, eficiente, directo y tecnológico (Agus Pro Standard).

${moduleContext}

MANUAL COMPLETO DEL SISTEMA ERP:
${allModulesSummary}

REGLAS DE VOZ:
1. Responde de manera concisa y fluida (máximo 2-3 oraciones por respuesta).
2. Si el usuario pregunta cómo usar el módulo actual, enséñaselo paso a paso.
3. Usa un español de México natural, ejecutivo y servicial.
4. Si el usuario pregunta por "Agus Pro", explícale que es el estándar de excelencia en automatización y diseño del ERP.
`;
  }
}

const GEMINI_VOICES = [
  { id: 'Aoede', name: 'Aoede', gender: 'F', description: 'Femenina, cálida y profesional' },
  { id: 'Puck', name: 'Puck', gender: 'M', description: 'Masculino, enérgico y amigable' },
  { id: 'Charon', name: 'Charon', gender: 'M', description: 'Masculino, profundo y serio' },
  { id: 'Kore', name: 'Kore', gender: 'F', description: 'Femenina, clara y directa' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'M', description: 'Masculino, potente y autoritario' },
];

export const LiveVoiceModalERP: React.FC<LiveVoiceModalERPProps> = ({
  isOpen,
  onClose,
  theme: _theme = 'dark',
  isPanel = false,
  currentModule,
}) => {
  const { isDarkMode, config } = useConfig();
  const { language } = useLanguage();
  // ... (rest of state)
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [transcription, setTranscription] = useState<{ user: string; model: string }>({ user: '', model: '' });
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState(() => {
    return localStorage.getItem('erp_selected_voice') || 'Aoede';
  });

  const sessionRef = useRef<any>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const isSocketReadyRef = useRef(false);
  const isActiveRef = useRef(false);
  const isConnectingRef = useRef(false);

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  // Volume visualization
  useEffect(() => {
    let animationFrame: number;
    const animate = () => {
      if (analyserRef.current && isActive) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
        setVolume(avg);
      }
      animationFrame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, [isActive]);

  // Auto-connect and cleanup
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isOpen) {
      startSession();
    }
    return () => {
      stopSession("Component Unmount");
    };
  }, [isOpen]);

  // Handle voice change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isActive && !isConnecting) {
      stopSession("Voice Change");
      setTimeout(() => {
        if (isOpen) startSession();
      }, 500);
    }
    localStorage.setItem('erp_selected_voice', selectedVoice);
  }, [selectedVoice]);

  const stopSession = useCallback((reason: string = "Manual") => {
    console.log(`🤖 [VoiceLink-ERP] Stopping session: ${reason}`);

    if (processorRef.current) {
      processorRef.current.port.onmessage = null;
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { }
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) { }
      sessionRef.current = null;
    }

    if (audioContextInRef.current) {
      audioContextInRef.current.close().catch(() => { });
      audioContextInRef.current = null;
    }
    if (audioContextOutRef.current) {
      audioContextOutRef.current.close().catch(() => { });
      audioContextOutRef.current = null;
    }

    setIsActive(false);
    isActiveRef.current = false;
    isSocketReadyRef.current = false;
    isConnectingRef.current = false;
    setIsConnecting(false);
    setIsModelSpeaking(false);
    setVolume(0);
    setTranscription({ user: '', model: '' });
  }, []);

  const startSession = async () => {
    if (isConnectingRef.current || isActiveRef.current) return;

    setError(null);
    try {
      isConnectingRef.current = true;
      setIsConnecting(true);

      const config = await tenantService.getConfig();
      const apiKey = config.gemini_api_key?.trim();

      if (!apiKey) {
        throw new Error("API Key no detectada en Supabase. Configúrala en el panel de Administración.");
      }
      
      console.log(`🤖 [VoiceLink-ERP] Iniciando con API Key (${apiKey.length} chars)...`);

      // Re-check after async gap — a parallel call may have already taken over
      if (!isConnectingRef.current) return;

      const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' } as any);

      // Lightweight cleanup of stale audio resources only — never reset isConnectingRef here
      if (sessionRef.current) { try { sessionRef.current.close(); } catch (e) {} sessionRef.current = null; }
      if (processorRef.current) { processorRef.current.port.onmessage = null; processorRef.current.disconnect(); processorRef.current = null; }
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
      sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
      sourcesRef.current.clear();
      if (audioContextInRef.current) { audioContextInRef.current.close().catch(() => {}); audioContextInRef.current = null; }
      if (audioContextOutRef.current) { audioContextOutRef.current.close().catch(() => {}); audioContextOutRef.current = null; }
      isActiveRef.current = false;
      isSocketReadyRef.current = false;

      audioContextInRef.current = new AudioContext({ sampleRate: 16000 });
      audioContextOutRef.current = new AudioContext({ sampleRate: 24000 });

      analyserRef.current = audioContextOutRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      const handleOpen = async () => {
        console.log("🤖 [VoiceLink-ERP] WebSocket Open");
        setIsConnecting(false);
        const setupAudio = async () => {
          if (!audioContextInRef.current || !streamRef.current) {
            console.warn("⚠️ [VoiceLink-ERP] Audio context or stream is null during setupAudio");
            return;
          }
          const source = audioContextInRef.current.createMediaStreamSource(streamRef.current);
          await audioContextInRef.current.audioWorklet.addModule('/audio-processor.js');
          processorRef.current = new AudioWorkletNode(audioContextInRef.current, 'audio-processor');
          processorRef.current.port.onmessage = (event) => {
            if (event.data.type === 'audio-data' && isActiveRef.current && sessionRef.current && isSocketReadyRef.current) {
              const inputData = event.data.audio;
              const pcmBlob = createPCM16kBlob(inputData, audioContextInRef.current!.sampleRate);
              sessionRef.current.sendRealtimeInput({ media: { data: pcmBlob.data, mimeType: pcmBlob.mimeType } });
            }
          };
          const gainNode = audioContextInRef.current.createGain();
          gainNode.gain.value = 0;
          source.connect(processorRef.current);
          processorRef.current.connect(gainNode);
          gainNode.connect(audioContextInRef.current.destination);
          setIsActive(true);
          isActiveRef.current = true;
          isSocketReadyRef.current = true;
        };
        setupAudio().catch(err => console.error("🤖 [VoiceLink-ERP] Audio Setup Error:", err));
      };

      let systemSnapshot = '';
      try {
        // Consultas resilientes para el snapshot (prueban nombres nuevos y viejos)
        const [ordersRes, inventoryRes, customersRes] = await Promise.all([
          supabase.from('ordenes_trabajo').select('*').limit(3).then(r => r.error ? supabase.from('work_orders').select('*').limit(3) : r),
          supabase.from('materiales').select('*').limit(3).then(r => r.error ? supabase.from('suministros').select('*').limit(3) : r),
          supabase.from('clientes').select('*').limit(3)
        ]);
        
        const orders = ordersRes.data || [];
        const inventory = inventoryRes.data || [];
        const customers = customersRes.data || [];

        systemSnapshot = `
          ESTADO ACTUAL DEL ERP (SNAPSHOT):
          - Órdenes: ${orders.map((o: any) => `${o.numero_parte || o.id}(${o.estatus || o.status})`).join(', ') || 'Sin órdenes'}
          - Stock: ${inventory.map((i: any) => `${i.descripcion_mp || i.nombre || i.name}: ${i.peso_mp || i.stock_actual || i.quantity}`).join(', ') || 'Sin materiales'}
          - Clientes: ${customers.map((c: any) => c.razon_social || c.name).join(', ') || 'Sin clientes'}
        `;
      } catch (e) {
        console.warn('Voice snapshot error:', e);
      }

      const sessionPromise = ai.live.connect({
        model: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
          },
          systemInstruction: { parts: [{ text: `${buildSystemInstruction(currentModule, config.brandName, language)}\n\n${systemSnapshot}` }] },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: handleOpen,
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              setIsModelSpeaking(true);
              const ctx = audioContextOutRef.current;
              if (!ctx || !isActiveRef.current) return;

              if (ctx.state === 'suspended') await ctx.resume();
              
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);

              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(analyserRef.current!);
              analyserRef.current!.connect(ctx.destination);

              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsModelSpeaking(false);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              for (const s of sourcesRef.current) { try { s.stop(); } catch(e) {} }
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsModelSpeaking(false);
            }

            if (message.serverContent?.inputTranscription) {
              setTranscription(prev => ({ ...prev, user: message.serverContent!.inputTranscription!.text }));
            }
            if (message.serverContent?.outputTranscription) {
              setTranscription(prev => ({ ...prev, model: message.serverContent!.outputTranscription!.text }));
            }
          },
          onerror: (e: any) => {
            console.error("🤖 [VoiceLink-ERP] WebSocket Error:", e);
            setError(`Error de conexión: ${e.message || 'Verifica tu API Key o cuota'}`);
            stopSession("Error");
          },
          onclose: (event: any) => {
            console.log(`🤖 [VoiceLink-ERP] WebSocket Closed. Code: ${event?.code || 'N/A'}, Reason: ${event?.reason || 'No reason'}`);
            stopSession(event?.reason || "Closed");
          }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      setIsConnecting(false);
      setError(err.message || 'Error al iniciar llamada');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const Content = (
    <div className={clsx(
      "relative w-full flex flex-col overflow-hidden transition-all duration-500",
      isPanel ? "h-full p-3 bg-transparent" : "max-w-sm p-4 rounded-2xl border shadow-2xl bg-slate-950/80 border-white/10"
    )}>
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-blue-500/20 to-transparent" />
      </div>

      <button
        onClick={onClose}
        className={clsx(
          "absolute top-2 right-2 p-1.5 rounded-lg transition-colors z-20",
          isDarkMode ? 'hover:bg-white/10 text-slate-500' : 'hover:bg-slate-100 text-slate-400'
        )}
      >
        <X size={15} />
      </button>

      {error ? (
        <div className="flex flex-col items-center text-center gap-3 py-6 relative z-10 w-full">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/40">
            <AlertCircle className="text-red-500" size={20} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-white mb-1">Falla de Enlace</p>
            <p className="text-red-400 text-[11px] px-4 leading-relaxed">{error}</p>
          </div>
          <button
            onClick={startSession}
            className="px-5 py-2 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-500 transition-all"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="w-full flex flex-col h-full gap-3">
          {/* Orb + Status — fila horizontal compacta */}
          <div className="flex items-center gap-4 shrink-0 pt-1">
            {/* Orb pequeño */}
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    animate={{ scale: 1 + (volume / 60), opacity: 0.25 + (volume / 150) }}
                    className={`absolute inset-0 rounded-full blur-2xl ${isModelSpeaking ? 'bg-mcvill-accent' : 'bg-blue-500'}`}
                  />
                )}
              </AnimatePresence>
              <div className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
                isActive
                  ? isModelSpeaking
                    ? 'border-mcvill-accent shadow-[0_0_30px_rgba(0,128,255,0.4)] scale-105 bg-slate-900'
                    : 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.25)] bg-slate-900'
                  : 'border-white/10 bg-slate-900/50'
              }`}>
                {isConnecting ? (
                  <Loader2 className="text-blue-500 animate-spin" size={20} />
                ) : isActive ? (
                  isModelSpeaking
                    ? <Activity className="text-mcvill-accent animate-pulse" size={20} />
                    : <Mic className="text-blue-400 animate-pulse" size={20} />
                ) : (
                  <User className="text-slate-600" size={20} />
                )}
              </div>
            </div>

            {/* Status + badges */}
            <div className="flex-1 min-w-0">
              <p className={`text-[11px] font-black uppercase tracking-[0.18em] leading-none mb-1.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {isConnecting ? 'Enlazando...' : isActive ? (isModelSpeaking ? 'IA Transmitiendo' : 'IA Escuchando') : 'Voz Desconectada'}
              </p>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-widest ${
                  isDarkMode ? 'bg-slate-900/50 border-white/10 text-mcvill-accent' : 'bg-blue-50 border-blue-100 text-blue-600'
                }`}>Live Pro</span>
                <span className={`px-2 py-0.5 rounded-md border text-[8px] font-mono ${
                  isDarkMode ? 'bg-slate-900/50 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>{formatDuration(duration)}</span>
              </div>
            </div>
          </div>

          {/* Voice Selector — solo cuando desconectado */}
          {!isActive && !isConnecting && (
            <div className="shrink-0">
              <p className={`text-[8px] font-black uppercase tracking-[0.3em] mb-1.5 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                Voz
              </p>
              <div className="grid grid-cols-5 gap-1">
                {GEMINI_VOICES.map(voice => (
                  <button
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice.id)}
                    className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-lg border transition-all duration-200 ${
                      selectedVoice === voice.id
                        ? isDarkMode
                          ? 'bg-blue-500/15 border-blue-500/40 shadow-[0_0_8px_rgba(59,130,246,0.15)]'
                          : 'bg-blue-50 border-blue-300'
                        : isDarkMode
                          ? 'border-white/5 hover:border-white/15 hover:bg-white/5'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      selectedVoice === voice.id
                        ? voice.gender === 'F' ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'
                        : voice.gender === 'F' ? 'bg-pink-500/10 text-pink-500/50' : 'bg-blue-500/10 text-blue-500/50'
                    }`}>
                      <User size={10} />
                    </div>
                    <span className={`text-[7px] font-black uppercase leading-none ${
                      selectedVoice === voice.id ? 'text-mcvill-accent' : isDarkMode ? 'text-slate-500' : 'text-slate-400'
                    }`}>{voice.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Transcription */}
          <div className={clsx(
            "w-full rounded-xl p-3 flex-1 border overflow-y-auto custom-scrollbar min-h-0",
            isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'
          )}>
            {transcription.user && (
              <div className="text-right mb-2">
                <span className="text-[7px] text-slate-500 uppercase tracking-widest block mb-0.5">Tú</span>
                <p className={`text-[11px] leading-snug ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{transcription.user}</p>
              </div>
            )}
            {transcription.model && (
              <div className="text-left">
                <span className="text-[7px] text-mcvill-accent uppercase tracking-widest block mb-0.5">Cerebro ERP</span>
                <p className={`text-[11px] leading-snug ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{transcription.model}</p>
              </div>
            )}
            {!transcription.user && !transcription.model && (
              <div className="h-full flex items-center justify-center opacity-25">
                <p className="text-slate-500 text-[10px] italic">Esperando enlace...</p>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="w-full shrink-0">
            {isActive ? (
              <button
                onClick={() => stopSession("Manual")}
                className="w-full py-2.5 bg-red-600 text-white rounded-xl font-black uppercase tracking-[0.18em] text-[10px] hover:bg-red-500 transition-all flex items-center justify-center gap-2"
              >
                <PhoneOff size={13} />
                Finalizar Enlace
              </button>
            ) : !error && (
              <button
                onClick={startSession}
                disabled={isConnecting}
                className={`w-full py-2.5 bg-mcvill-accent text-white rounded-xl font-black uppercase tracking-[0.18em] text-[10px] hover:bg-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
              >
                {isConnecting ? <Loader2 className="animate-spin" size={13} /> : <Sparkles size={13} />}
                {isConnecting ? 'Enlazando...' : 'Iniciar Voz IA'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (!isOpen && !isPanel) return null;

  if (isPanel) return Content;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
      >
        {Content}
      </motion.div>
    </AnimatePresence>
  );
};

export default LiveVoiceModalERP;
