import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Users, 
  Send, 
  Settings2, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Play, 
  SkipForward, 
  Trash2, 
  Search, 
  Filter, 
  FileText,
  User,
  Smartphone,
  Check,
  ChevronRight,
  Plus,
  Mail,
  MessageCircle,
  HelpCircle,
  Laptop,
  CheckSquare,
  Network
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfig } from '../contexts/ConfigContext';
import { aiService } from '../services/aiService';
import { toast, appConfirm } from '../lib/dialogs';
import { supabase } from '../lib/supabase';

interface Recipient {
  id: string;
  name: string;
  phone: string;
  email: string;
  meta?: Record<string, string>;
  selected: boolean;
}

interface MessageTemplate {
  id: string;
  name: string;
  subject?: string;
  body: string;
  category: 'production' | 'quality' | 'payroll' | 'rfq' | 'custom';
}

export const WhatsAppCenterView: React.FC = () => {
  const { config, isDarkMode } = useConfig();
  
  // Channels
  const [activeChannel, setActiveChannel] = useState<'whatsapp' | 'email' | 'teams'>('whatsapp');
  
  // Config Settings
  const [waPrefix, setWaPrefix] = useState(() => localStorage.getItem('mcvill_wa_prefix') || '52');
  const [waSignature, setWaSignature] = useState(() => localStorage.getItem('mcvill_wa_signature') || 'Saludos,\nEquipo McVill');
  
  const [emailSender, setEmailSender] = useState(() => localStorage.getItem('mcvill_email_sender') || 'notificaciones@mcvill.com');
  const [emailResendKey, setEmailResendKey] = useState(() => localStorage.getItem('mcvill_email_resend_key') || '');
  const [emailSignature, setEmailSignature] = useState(() => localStorage.getItem('mcvill_email_signature') || '<br><br>Atentamente,<br><strong>Planta de Control McVill</strong>');
  
  const [teamsWebhook, setTeamsWebhook] = useState(() => localStorage.getItem('mcvill_teams_webhook') || '');
  const [teamsCardColor, setTeamsCardColor] = useState(() => localStorage.getItem('mcvill_teams_color') || '#7F56D9'); // Teams Purple

  // State
  const [audienceType, setAudienceType] = useState<'clientes' | 'operadores' | 'proveedores' | 'viajeros'>('clientes');
  const [searchQuery, setSearchQuery] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  
  // Dynamic fields
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  
  // AI template assistant state
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);

  // Queue state
  const [queueIndex, setQueueIndex] = useState<number | null>(null);
  const [sentCount, setSentCount] = useState(0);
  const [isSendingBg, setIsSendingBg] = useState(false);
  
  const [history, setHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('mcvill_omni_history');
    return saved ? JSON.parse(saved) : [];
  });

  const TEMPLATES: MessageTemplate[] = [
    {
      id: 'traveler_status',
      name: '📦 Estatus de Viajero (Cliente)',
      subject: 'McVill: Actualización del Estatus de su Estructura',
      body: 'Estimado {nombre},\n\nLe informamos que su pedido {viajero} ha cambiado de estatus en planta y ahora se encuentra en la etapa de *{celula}*.\n\nSeguimos trabajando con la máxima eficiencia y estándares de control McVill para su entrega.',
      category: 'production'
    },
    {
      id: 'quality_alert',
      name: '⚠️ Alerta de Paro / Calidad',
      subject: '¡ALERTA CRÍTICA!: Calidad Reporta Paro de Celda',
      body: '¡ALERTA DE PRODUCCIÓN MCVILL!\n\nSe ha reportado una incidencia de *{incidencia}* en la celda de *{celula}*.\n\nSupervisor {nombre}, se requiere su presencia inmediata en el piso de control para validar el viajero {viajero}.',
      category: 'quality'
    },
    {
      id: 'kpi_reminder',
      name: '🎯 Recordatorio de KPIs Semanales',
      subject: 'McVill Desempeño: Registro de KPIs pendiente',
      body: 'Hola {nombre},\n\nRecuerda ingresar tus KPIs de rendimiento semanal en el módulo de Desempeño para tu celda de *{celula}* ({turno}).\n\nTu eficiencia impulsa los bonos de productividad de este mes. ¡A darle con todo!',
      category: 'production'
    },
    {
      id: 'payroll_notification',
      name: '💰 Aviso de Recibo de Nómina',
      subject: 'Recibo de Nómina Liberado - McVill',
      body: 'Hola {nombre},\n\nTu cálculo de nómina y complementos correspondientes a esta semana ya se encuentran liberados en tesorería.\n\nDetalles del periodo:\n- Neto a Pagar: *${neto}*\n- Ahorro Prov.: *${ahorro}*\n\nSi tienes dudas, contacta a RH.',
      category: 'payroll'
    }
  ];

  // Load Data
  useEffect(() => {
    loadAudienceData();
  }, [audienceType]);

  const loadAudienceData = async () => {
    setLoading(true);
    try {
      if (audienceType === 'clientes') {
        const { data, error } = await supabase.from('clientes').select('id, razon_social, telefono, email').limit(20);
        if (error) throw error;
        
        const list: Recipient[] = (data || []).map(c => ({
          id: c.id,
          name: c.razon_social,
          phone: c.telefono || '8711000000',
          email: c.email || 'compras@cliente.com',
          meta: { empresa: c.razon_social },
          selected: true
        }));
        if (list.length === 0) {
          list.push(
            { id: 'c1', name: 'MINERA PEÑOLES S.A. DE C.V.', phone: '8712113344', email: 'abastos@penoles.mx', meta: { empresa: 'Peñoles' }, selected: true },
            { id: 'c2', name: 'INDUSTRIAS LALA S.A. DE C.V.', phone: '8717559900', email: 'control.mcv@lala.com', meta: { empresa: 'Lala' }, selected: true },
            { id: 'c3', name: 'ACEROS DE LA LAGUNA S.A.', phone: '8719001122', email: 'compras@aceroslaguna.com', meta: { empresa: 'Aceros Laguna' }, selected: true }
          );
        }
        setRecipients(list);
      } 
      else if (audienceType === 'operadores') {
        const { data, error } = await supabase.from('empleados').select('id, nombre, telefono, email, categoria').limit(20);
        if (error) throw error;
        
        const list: Recipient[] = (data || []).map(e => ({
          id: e.id,
          name: e.nombre,
          phone: e.telefono || '8713000000',
          email: e.email || 'operador@mcvill.com',
          meta: { puesto: e.categoria || 'Operador', celula: 'SOLDADURA', turno: 'Matutino' },
          selected: true
        }));
        if (list.length === 0) {
          list.push(
            { id: 'op1', name: 'Jesús Ramírez Morales', phone: '8713334455', email: 'j.ramirez@mcvill.com', meta: { puesto: 'Soldador Senior', celula: 'SOLDADURA', turno: 'Matutino' }, selected: true },
            { id: 'op2', name: 'Gerardo Ortiz Sánchez', phone: '8717889900', email: 'g.ortiz@mcvill.com', meta: { puesto: 'Operador CNC', celula: 'CORTE', turno: 'Vespertino' }, selected: true },
            { id: 'op3', name: 'Manuel Gómez Fuentes', phone: '8719882211', email: 'm.gomez@mcvill.com', meta: { puesto: 'Pintor Industrial', celula: 'PINTURA', turno: 'Nocturno' }, selected: true }
          );
        }
        setRecipients(list);
      }
      else if (audienceType === 'proveedores') {
        const list: Recipient[] = [
          { id: 'p1', name: 'DISTRIBUIDORA DE ACEROS PTY', phone: '8714002233', email: 'ventas@acerospty.com', meta: { material: 'Placa 1/2"' }, selected: true },
          { id: 'p2', name: 'OXÍGENO Y SOLDADURAS INFRA', phone: '8715006677', email: 'laguna@infra.com.mx', meta: { material: 'Argón / Gases' }, selected: true },
          { id: 'p3', name: 'HERRAMIENTAS INDUSTRIALES MX', phone: '8716008899', email: 'cotizaciones@herramientasmx.com', meta: { material: 'Brocas y Fresas' }, selected: true }
        ];
        setRecipients(list);
      }
      else if (audienceType === 'viajeros') {
        const { data, error } = await supabase.from('ordenes_trabajo').select('id, order_number, status, celula_actual').limit(20);
        
        const list: Recipient[] = (data || []).map(o => ({
          id: o.id,
          name: `Viajero ${o.order_number}`,
          phone: '8711000000',
          email: 'control@mcvill.com',
          meta: { viajero: o.order_number, estatus: o.status, celula: o.celula_actual || 'SOLDADURA', incidencia: 'Sin incidentes' },
          selected: true
        }));
        if (list.length === 0) {
          list.push(
            { id: 'v1', name: 'Viajero VJ-NE9R-M2RX', phone: '8711223344', email: 'supervision@mcvill.com', meta: { viajero: 'VJ-NE9R-M2RX', estatus: 'RETRASADO', celula: 'SOLDADURA', incidencia: 'Paro de Máquina' }, selected: true },
            { id: 'v2', name: 'Viajero VJ-AK74-K109', phone: '8715556677', email: 'calidad@mcvill.com', meta: { viajero: 'VJ-AK74-K109', estatus: 'PROCESO', celula: 'PINTURA', incidencia: 'Sin incidentes' }, selected: true }
          );
        }
        setRecipients(list);
      }
    } catch (e) {
      console.error(e);
      toast('Error al cargar datos de audiencia.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplate(id);
    const tmpl = TEMPLATES.find(t => t.id === id);
    if (tmpl) {
      setMessageBody(tmpl.body);
      if (tmpl.subject) {
        setMessageSubject(tmpl.subject);
      }
    }
  };

  // AI copywriting generator using Gemini 2.5 Flash-Lite
  const handleGenerateAICopy = async () => {
    if (!aiPrompt.trim()) {
      toast('Por favor escribe de qué quieres que hable el mensaje.', 'warning');
      return;
    }
    setGeneratingAI(true);
    try {
      const instructions = `
        Eres el Redactor de Mensajes del Centro Omnicanal del Control ERP de McVill.
        Tu trabajo es escribir un mensaje altamente profesional e industrial.
        Sigue el Estándar Premium de McVill:
        - Usa emojis oportunos (🏭, 📦, ⚡, ⚠️, 🛠️, 💰).
        - Si es correo, mantén párrafos limpios. Si es WhatsApp o Teams, usa negritas de WhatsApp (*texto*) para resaltar datos clave.
        - Puedes incluir variables con llaves como: {nombre}, {viajero}, {celula}, {turno}, {incidencia}.
        Genera únicamente el texto del cuerpo del mensaje, sin marcas externas de formato markdown.
      `;
      
      const res = await aiService.askGemini(
        `Escribe el cuerpo de un mensaje de ${activeChannel} sobre: "${aiPrompt}"`,
        'GENERAL',
        [],
        instructions
      );
      
      setMessageBody(res);
      
      // Asunto IA para Correo Electrónico
      if (activeChannel === 'email') {
        const sub = await aiService.askGemini(
          `Escribe un título de asunto corporativo corto y formal (sin emojis ni marcas) para este correo: "${res.substring(0, 100)}"`,
          'GENERAL',
          [],
          'Genera solamente la frase del asunto.'
        );
        setMessageSubject(sub.replace(/"/g, ''));
      }
      
      toast('Plantilla omnicanal generada con IA.', 'success');
      setAiPrompt('');
    } catch (e) {
      console.error(e);
      toast('Error al generar plantilla con IA.', 'error');
    } finally {
      setGeneratingAI(false);
    }
  };

  // Launch Live Bulk Queue
  const handleStartQueue = () => {
    const selectedList = recipients.filter(r => r.selected);
    if (selectedList.length === 0) {
      toast('Por favor selecciona al menos un destinatario.', 'warning');
      return;
    }
    if (!messageBody.trim()) {
      toast('El cuerpo del mensaje no puede estar vacío.', 'warning');
      return;
    }
    if (activeChannel === 'email' && !messageSubject.trim()) {
      toast('El asunto del correo electrónico es obligatorio.', 'warning');
      return;
    }
    
    // Save settings locally
    localStorage.setItem('mcvill_wa_prefix', waPrefix);
    localStorage.setItem('mcvill_wa_signature', waSignature);
    localStorage.setItem('mcvill_email_sender', emailSender);
    localStorage.setItem('mcvill_email_resend_key', emailResendKey);
    localStorage.setItem('mcvill_email_signature', emailSignature);
    localStorage.setItem('mcvill_teams_webhook', teamsWebhook);
    localStorage.setItem('mcvill_teams_color', teamsCardColor);

    setSentCount(0);
    setQueueIndex(0);
  };

  const getPersonalizedMessage = (recipient: Recipient) => {
    let msg = messageBody;
    msg = msg.replace(/{nombre}/g, recipient.name);
    
    if (recipient.meta) {
      Object.entries(recipient.meta).forEach(([key, val]) => {
        msg = msg.replace(new RegExp(`{${key}}`, 'g'), val);
      });
    }
    
    // Fallbacks
    msg = msg.replace(/{viajero}/g, 'VJ-MCV-2026');
    msg = msg.replace(/{celula}/g, 'SOLDADURA');
    msg = msg.replace(/{turno}/g, 'Matutino');
    msg = msg.replace(/{incidencia}/g, 'Paro de Celda');
    msg = msg.replace(/{neto}/g, '$4,250.00');
    msg = msg.replace(/{ahorro}/g, '$250.00');

    if (activeChannel === 'whatsapp' && waSignature.trim()) {
      msg = `${msg}\n\n${waSignature}`;
    }
    
    return msg;
  };

  const getPersonalizedSubject = (recipient: Recipient) => {
    let sub = messageSubject;
    sub = sub.replace(/{nombre}/g, recipient.name);
    if (recipient.meta && recipient.meta.viajero) {
      sub = sub.replace(/{viajero}/g, recipient.meta.viajero);
    }
    return sub || 'Actualización de Control McVill';
  };

  // Dispatch item according to active channel
  const executeSendItem = async (index: number) => {
    const selectedList = recipients.filter(r => r.selected);
    const recipient = selectedList[index];
    if (!recipient) return;

    const personalizedBody = getPersonalizedMessage(recipient);

    if (activeChannel === 'whatsapp') {
      let cleanPhone = recipient.phone.replace(/[^0-9]/g, '');
      if (waPrefix && cleanPhone.length <= 10 && !cleanPhone.startsWith(waPrefix)) {
        cleanPhone = waPrefix + cleanPhone;
      }
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(personalizedBody)}`;
      window.open(url, '_blank');
      advanceQueue(selectedList.length);
    } 
    else if (activeChannel === 'email') {
      setIsSendingBg(true);
      const subject = getPersonalizedSubject(recipient);
      
      if (emailResendKey.trim()) {
        // Enviar vía Resend API real
        try {
          const formattedHtml = `
            <div style="font-family: sans-serif; max-width: 600px; color: #1e293b; line-height: 1.6;">
              <div style="background-color: #0f172a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h2 style="color: #3b82f6; margin: 0; font-size: 20px; font-weight: 900; letter-spacing: 2px;">MCVILL MASTER CONTROL</h2>
              </div>
              <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
                <p style="margin-top: 0; font-size: 14px;">${personalizedBody.replace(/\n/g, '<br>')}</p>
                ${emailSignature}
              </div>
            </div>
          `;

          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${emailResendKey.trim()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: emailSender.trim(),
              to: [recipient.email],
              subject: subject,
              html: formattedHtml
            })
          });

          if (response.ok) {
            toast(`Correo enviado a ${recipient.email} vía Resend API.`, 'success');
          } else {
            throw new Error('Response not OK');
          }
        } catch (e) {
          console.error(e);
          toast('Fallo al despachar por API. Abriendo cliente de correo local mailto...', 'warning');
          const mailtoUrl = `mailto:${recipient.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(personalizedBody)}`;
          window.open(mailtoUrl, '_blank');
        }
      } else {
        // Si no hay API key, costo $0 Deep Link local mailto
        const mailtoUrl = `mailto:${recipient.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(personalizedBody)}`;
        window.open(mailtoUrl, '_blank');
      }
      setIsSendingBg(false);
      advanceQueue(selectedList.length);
    } 
    else if (activeChannel === 'teams') {
      setIsSendingBg(true);
      if (teamsWebhook.trim()) {
        try {
          // Teams Webhook POST Adaptive Card
          const cardPayload = {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": teamsCardColor.replace('#', ''),
            "summary": "Notificación Automatizada de Planta McVill",
            "sections": [{
              "activityTitle": `**NOTIFICACIÓN OMNICANAL MCVILL**`,
              "activitySubtitle": `Destinatario: ${recipient.name}`,
              "activityImage": "https://img.icons8.com/color/96/microsoft-teams.png",
              "text": personalizedBody.replace(/\n/g, '<br>'),
              "markdown": true
            }]
          };

          await fetch(teamsWebhook.trim(), {
            method: 'POST',
            mode: 'no-cors', // Teams incoming webhook usually blocks CORS, no-cors avoids error blocks
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(cardPayload)
          });
          toast(`Tarjeta de Teams enviada a ${recipient.name}.`, 'success');
        } catch (e) {
          console.error(e);
          toast('Error al despachar el webhook de Teams.', 'error');
        }
      } else {
        toast('Teams requiere configurar el webhook en la pestaña lateral.', 'warning');
      }
      setIsSendingBg(false);
      advanceQueue(selectedList.length);
    }
  };

  const advanceQueue = (total: number) => {
    setSentCount(prev => prev + 1);
    if (queueIndex !== null && queueIndex < total - 1) {
      setQueueIndex(queueIndex + 1);
    } else {
      finishQueue(total);
    }
  };

  const skipItem = (index: number) => {
    const selectedList = recipients.filter(r => r.selected);
    if (index < selectedList.length - 1) {
      setQueueIndex(index + 1);
    } else {
      finishQueue(selectedList.length);
    }
  };

  const finishQueue = (total: number) => {
    setQueueIndex(null);
    toast('¡Campaña omnicanal finalizada exitosamente!', 'success');
    
    // Add to history
    const newLog = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      audience: audienceType.toUpperCase(),
      channel: activeChannel.toUpperCase(),
      total,
      sent: sentCount + 1,
      preview: messageBody.substring(0, 50) + '...'
    };
    
    const updatedHistory = [newLog, ...history.slice(0, 19)];
    setHistory(updatedHistory);
    localStorage.setItem('mcvill_omni_history', JSON.stringify(updatedHistory));
  };

  const filteredRecipients = recipients.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.phone.includes(searchQuery) ||
    r.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCount = recipients.filter(r => r.selected).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-mcvill-accent/15 pb-5">
        <div>
          <span className="px-2.5 py-0.5 rounded bg-mcvill-accent/10 border border-mcvill-accent/30 text-mcvill-accent text-[8px] font-black tracking-widest uppercase">
            Master Control Omnichannel
          </span>
          <h2 className="text-2xl font-black tracking-tight text-white mt-1.5 flex items-center gap-3">
            <Network className="text-mcvill-accent" size={24} />
            CENTRO DE MENSAJES MULTI-CANAL
          </h2>
          <p className="text-xs text-mcvill-text-muted mt-1 leading-relaxed">
            Gestión unificada de notificaciones masivas vía WhatsApp, Correo Electrónico (Resend) y Webhooks de Microsoft Teams.
          </p>
        </div>

        {/* Channel Selection Buttons */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-white/10 shrink-0 self-start">
          <button
            onClick={() => { setActiveChannel('whatsapp'); handleSelectTemplate(selectedTemplate); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
              activeChannel === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone size={13} /> WhatsApp
          </button>
          <button
            onClick={() => { setActiveChannel('email'); handleSelectTemplate(selectedTemplate); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
              activeChannel === 'email'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail size={13} /> Correo
          </button>
          <button
            onClick={() => { setActiveChannel('teams'); handleSelectTemplate(selectedTemplate); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
              activeChannel === 'teams'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Laptop size={13} /> Teams
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Setup & Copywriting */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Template and IA copywriter */}
          <div className="cyber-panel p-6 bg-slate-950/40 relative">
            <div className="flex items-center justify-between mb-4 border-b border-mcvill-accent/10 pb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                <Sparkles className="text-mcvill-accent" size={14} />
                1. Selección de Mensaje y Copiloto IA ({activeChannel.toUpperCase()})
              </h3>
            </div>

            <div className="space-y-4">
              {/* Plantillas predefinidas */}
              <div>
                <label className="agus-label-blue mb-2">Plantillas del Sistema</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleSelectTemplate(t.id)}
                      className={`p-3 rounded-xl border text-left text-xs transition-all flex flex-col gap-1 ${
                        selectedTemplate === t.id
                          ? activeChannel === 'whatsapp' ? 'border-emerald-500 bg-emerald-500/10 text-white'
                            : activeChannel === 'email' ? 'border-blue-500 bg-blue-500/10 text-white'
                            : 'border-violet-500 bg-violet-500/10 text-white'
                          : 'border-white/5 bg-slate-900/40 text-slate-400 hover:border-white/10 hover:bg-slate-900/60'
                      }`}
                    >
                      <span className="font-bold text-white">{t.name}</span>
                      <span className="opacity-60 truncate">{t.body}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Redactor IA */}
              <div className="p-4 bg-mcvill-accent/5 rounded-2xl border border-mcvill-accent/20">
                <label className="agus-label-blue mb-2 flex items-center gap-1.5">
                  <Sparkles size={11} /> Redactor Inteligente (Gemini 2.5 Flash-Lite)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    placeholder={`Ej. Escribir plantilla de ${activeChannel === 'whatsapp' ? 'WhatsApp' : activeChannel === 'email' ? 'Correo' : 'Teams'} para la entrega...`}
                    className="flex-1 bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-mcvill-accent"
                  />
                  <button
                    onClick={handleGenerateAICopy}
                    disabled={generatingAI}
                    className="px-4 py-2 bg-mcvill-accent text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-mcvill-accent/90 disabled:opacity-40 transition-all flex items-center gap-1 shrink-0 shadow-lg shadow-mcvill-accent/20"
                  >
                    {generatingAI ? 'Generando...' : 'Generar'}
                  </button>
                </div>
              </div>

              {/* Condicional Asunto para Correo */}
              {activeChannel === 'email' && (
                <div className="space-y-1.5">
                  <label className="agus-label-blue">Asunto del Correo Electrónico</label>
                  <input
                    type="text"
                    value={messageSubject}
                    onChange={e => setMessageSubject(e.target.value)}
                    placeholder="Asunto del correo electrónico..."
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-mcvill-accent"
                  />
                </div>
              )}

              {/* Textarea del mensaje */}
              <div className="space-y-2">
                <label className="agus-label-blue">Cuerpo del Mensaje (Soporta Brackets `{'{'}`variable`{'}'}`)</label>
                <textarea
                  rows={6}
                  value={messageBody}
                  onChange={e => setMessageBody(e.target.value)}
                  placeholder="Escribe el cuerpo del mensaje..."
                  className="w-full bg-slate-900/60 border border-white/10 rounded-2xl px-5 py-4 text-xs focus:outline-none focus:border-mcvill-accent focus:ring-4 focus:ring-mcvill-accent/5 transition-all text-white resize-none"
                />
                <div className="flex flex-wrap gap-2 text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                  <span>Sustitución en cola:</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">{'{nombre}'}</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">{'{viajero}'}</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">{'{celula}'}</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">{'{turno}'}</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">{'{incidencia}'}</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">{'{neto}'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Audience Selection & List */}
          <div className="cyber-panel p-6 bg-slate-950/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-mcvill-accent/10 pb-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                <Users className="text-mcvill-accent" size={14} />
                2. Destinatarios ({selectedCount} de {recipients.length} seleccionados)
              </h3>
              
              <div className="flex bg-slate-900/80 p-1 rounded-xl border border-white/5 shrink-0 self-start">
                {(['clientes', 'operadores', 'proveedores', 'viajeros'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setAudienceType(type)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                      audienceType === type
                        ? 'bg-mcvill-accent text-slate-950 shadow-md font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* List & Filtering */}
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Filtrar por nombre, correo o teléfono..."
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-8 pr-4 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-mcvill-accent"
                  />
                </div>
                
                <button
                  onClick={() => {
                    const allSelected = recipients.every(r => r.selected);
                    setRecipients(prev => prev.map(r => ({ ...r, selected: !allSelected })));
                  }}
                  className="px-3 py-2 bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 font-bold text-[10px] uppercase rounded-xl transition-all"
                >
                  {recipients.every(r => r.selected) ? 'Desmarcar Todos' : 'Marcar Todos'}
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto border border-white/5 rounded-xl bg-slate-900/20 custom-scrollbar divide-y divide-white/5">
                {loading ? (
                  <div className="p-8 text-center text-slate-500 text-xs">Cargando registros...</div>
                ) : filteredRecipients.length === 0 ? (
                  <div className="p-8 text-center text-slate-600 text-xs">No se encontraron destinatarios.</div>
                ) : (
                  filteredRecipients.map(r => (
                    <div
                      key={r.id}
                      onClick={() => setRecipients(prev => prev.map(x => x.id === r.id ? { ...x, selected: !x.selected } : x))}
                      className="flex items-center justify-between p-3.5 hover:bg-white/[0.02] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          r.selected
                            ? 'border-mcvill-accent bg-mcvill-accent text-slate-950'
                            : 'border-white/10 bg-transparent'
                        }`}>
                          {r.selected && <Check size={11} strokeWidth={3} />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white uppercase tracking-tight">{r.name}</p>
                          <div className="flex gap-3 text-[9px] text-slate-500 mt-0.5">
                            <span className="font-mono">{r.phone}</span>
                            <span>•</span>
                            <span className="italic">{r.email}</span>
                          </div>
                        </div>
                      </div>
                      
                      {r.meta && (
                        <div className="flex gap-2">
                          {Object.entries(r.meta).slice(0, 1).map(([key, val]) => (
                            <span
                              key={key}
                              className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-slate-400 text-[8px] font-black uppercase tracking-wider"
                            >
                              {key}: {val}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Botón de acción principal */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleStartQueue}
                  disabled={loading || selectedCount === 0 || !messageBody.trim()}
                  className={`px-8 py-4 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer ${
                    activeChannel === 'whatsapp' ? 'bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                      : activeChannel === 'email' ? 'bg-blue-500 hover:bg-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                      : 'bg-violet-500 hover:bg-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.2)]'
                  }`}
                >
                  <Send size={15} />
                  Iniciar Cola de {activeChannel === 'whatsapp' ? 'WhatsApp' : activeChannel === 'email' ? 'Correo' : 'Teams'} ({selectedCount} Destinatarios)
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right column: Config & History */}
        <div className="space-y-6">
          
          {/* Config Settings */}
          <div className="cyber-panel p-6 bg-slate-950/40">
            <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2 border-b border-mcvill-accent/10 pb-3 mb-4">
              <Settings2 className="text-mcvill-accent" size={14} />
              Configuración de Canales
            </h3>
            
            <div className="space-y-4">
              
              {/* WhatsApp Config fields */}
              {activeChannel === 'whatsapp' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div>
                    <label className="agus-label-blue mb-1">Prefijo Telefónico por Defecto</label>
                    <input
                      type="text"
                      value={waPrefix}
                      onChange={e => setWaPrefix(e.target.value)}
                      placeholder="Ej. 52 (México)"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-mcvill-accent font-mono"
                    />
                  </div>

                  <div>
                    <label className="agus-label-blue mb-1">Firma del Mensaje (Automática)</label>
                    <textarea
                      rows={3}
                      value={waSignature}
                      onChange={e => setWaSignature(e.target.value)}
                      placeholder="Firma corporativa final..."
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-mcvill-accent resize-none"
                    />
                  </div>
                </motion.div>
              )}

              {/* Email Config fields */}
              {activeChannel === 'email' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div>
                    <label className="agus-label-blue mb-1">Remitente Autorizado (Resend)</label>
                    <input
                      type="text"
                      value={emailSender}
                      onChange={e => setEmailSender(e.target.value)}
                      placeholder="Ej. notificaciones@tudominio.com"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-mcvill-accent font-mono"
                    />
                  </div>

                  <div>
                    <label className="agus-label-blue mb-1">Resend API Key</label>
                    <input
                      type="password"
                      value={emailResendKey}
                      onChange={e => setEmailResendKey(e.target.value)}
                      placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-mcvill-accent font-mono"
                    />
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mt-1">
                      Si se deja en blanco, se usará mailto local (Costo $0)
                    </span>
                  </div>

                  <div>
                    <label className="agus-label-blue mb-1">Firma HTML del Correo</label>
                    <textarea
                      rows={3}
                      value={emailSignature}
                      onChange={e => setEmailSignature(e.target.value)}
                      placeholder="Ej. <br><br>Atentamente..."
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-mcvill-accent resize-none font-mono"
                    />
                  </div>
                </motion.div>
              )}

              {/* Teams Config fields */}
              {activeChannel === 'teams' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div>
                    <label className="agus-label-blue mb-1">Teams Webhook URL del Canal</label>
                    <input
                      type="text"
                      value={teamsWebhook}
                      onChange={e => setTeamsWebhook(e.target.value)}
                      placeholder="https://mcvill.webhook.office.com/..."
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-mcvill-accent font-mono"
                    />
                  </div>

                  <div>
                    <label className="agus-label-blue mb-1">Color de Borde de Tarjeta Teams</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={teamsCardColor}
                        onChange={e => setTeamsCardColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={teamsCardColor}
                        onChange={e => setTeamsCardColor(e.target.value)}
                        className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-mcvill-accent font-mono"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-3 text-amber-300">
                <AlertTriangle className="shrink-0 mt-0.5" size={14} />
                <div className="text-[10px] leading-relaxed">
                  <span className="font-bold">Agus Pro Standard:</span> Toda credencial ingresada se almacena localmente y de forma segura, respetando la total soberanía de planta.
                </div>
              </div>
            </div>
          </div>

          {/* Broadcast History */}
          <div className="cyber-panel p-6 bg-slate-950/40">
            <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2 border-b border-mcvill-accent/10 pb-3 mb-4">
              <Clock className="text-mcvill-accent" size={14} />
              Historial Omnicanal
            </h3>

            <div className="space-y-3">
              {history.length > 0 ? (
                history.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-1.5"
                  >
                    <div className="flex justify-between items-center text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                      <span>{log.date}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                        log.channel === 'WHATSAPP' ? 'bg-emerald-500/10 text-emerald-400'
                          : log.channel === 'EMAIL' ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-violet-500/10 text-violet-400'
                      }`}>
                        {log.channel}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[11px] font-black text-white uppercase tracking-tight">Audiencia: {log.audience}</span>
                      <span className="text-[10px] font-bold text-mcvill-accent font-mono">{log.sent}/{log.total} envíos</span>
                    </div>
                    <p className="text-[10px] text-slate-400 italic truncate font-medium">"{log.preview}"</p>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-600 text-xs flex flex-col items-center gap-2">
                  <MessageSquare size={24} />
                  <span>No hay envíos omnicanal registrados aún</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Queue Modal with Smartphone / Email / Teams Mockups */}
      <AnimatePresence>
        {queueIndex !== null && recipients.filter(r => r.selected).length > 0 && (() => {
          const selectedList = recipients.filter(r => r.selected);
          const currentItem = selectedList[queueIndex];
          const totalCount = selectedList.length;
          
          if (!currentItem) return null;

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-950 border border-mcvill-accent/30 rounded-[2rem] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
              >
                {/* Left panel: Send Queue */}
                <div className="flex-1 p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/10">
                  <div>
                    <div className="flex items-center gap-4 mb-5">
                      <div className={`p-3 border rounded-2xl ${
                        activeChannel === 'whatsapp' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : activeChannel === 'email' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                          : 'bg-violet-500/10 border-violet-500/30 text-violet-400'
                      }`}>
                        {activeChannel === 'whatsapp' ? <Smartphone className="w-6 h-6 animate-pulse" />
                          : activeChannel === 'email' ? <Mail className="w-6 h-6 animate-pulse" />
                          : <Laptop className="w-6 h-6 animate-pulse" />
                        }
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white uppercase tracking-wider">
                          Cola de Envío {activeChannel.toUpperCase()}
                        </h4>
                        <p className="text-xs text-mcvill-text-muted mt-0.5">Destinatario {queueIndex + 1} de {totalCount}</p>
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-6">
                      <div
                        className={`h-full shadow-[0_0_12px_rgba(0,128,255,0.8)] transition-all duration-300 ${
                          activeChannel === 'whatsapp' ? 'bg-emerald-500'
                            : activeChannel === 'email' ? 'bg-blue-500'
                            : 'bg-violet-500'
                        }`}
                        style={{ width: `${((queueIndex + 1) / totalCount) * 100}%` }}
                      />
                    </div>

                    {/* Ficha del Destinatario */}
                    <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 mb-5 flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-base font-black ${
                        activeChannel === 'whatsapp' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : activeChannel === 'email' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                          : 'bg-violet-500/10 border-violet-500/20 text-violet-400'
                      }`}>
                        {(currentItem.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white uppercase tracking-wide">{currentItem.name}</p>
                        <div className="flex gap-3 text-[10px] text-slate-500 font-mono mt-0.5">
                          <span>Phone: {currentItem.phone}</span>
                          <span>Email: {currentItem.email}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <button
                      onClick={() => skipItem(queueIndex)}
                      className="flex items-center justify-center gap-2 py-3.5 bg-slate-900 hover:bg-slate-900/80 text-slate-400 font-black rounded-2xl border border-white/5 transition-all uppercase tracking-widest text-[10px] cursor-pointer"
                    >
                      <SkipForward className="w-4 h-4" /> Omitir
                    </button>
                    <button
                      onClick={() => executeSendItem(queueIndex)}
                      disabled={isSendingBg}
                      className={`flex items-center justify-center gap-2 py-3.5 text-slate-950 font-black rounded-2xl hover:scale-[1.02] transition-all uppercase tracking-widest text-[10px] cursor-pointer ${
                        activeChannel === 'whatsapp' ? 'bg-emerald-500 shadow-xl shadow-emerald-500/20'
                          : activeChannel === 'email' ? 'bg-blue-500 shadow-xl shadow-blue-500/20'
                          : 'bg-violet-500 shadow-xl shadow-violet-500/20'
                      }`}
                    >
                      {isSendingBg ? (
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      {activeChannel === 'whatsapp' ? 'Enviar a WA' : activeChannel === 'email' ? 'Enviar Correo' : 'Despachar Teams'}
                    </button>
                  </div>
                </div>

                {/* Right panel: Active channel mockup preview */}
                <div className="w-full md:w-[420px] p-6 bg-slate-900/40 flex flex-col justify-center items-center">
                  <p className="text-[10px] font-black text-mcvill-accent uppercase tracking-widest mb-4">Vista Previa Móvil / Desktop</p>
                  
                  {/* Smartphone WhatsApp mockup */}
                  {activeChannel === 'whatsapp' && (
                    <div className="w-full max-w-[300px] h-[480px] bg-slate-950 border-4 border-slate-800 rounded-[2.2rem] shadow-2xl overflow-hidden flex flex-col relative">
                      <div className="h-10 bg-slate-900/90 flex items-center px-4 justify-between border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span className="text-[8px] font-black text-white/90 uppercase truncate max-w-[120px]">{currentItem.name}</span>
                        </div>
                        <span className="text-[8px] text-slate-600 font-mono">10:32 AM</span>
                      </div>

                      <div className="flex-1 p-3 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.03)_1px,transparent_0)] bg-[size:16px_16px] bg-slate-950 overflow-y-auto flex flex-col justify-end">
                        <div className="max-w-[90%] self-end bg-emerald-600 border border-emerald-500/20 text-white p-3 rounded-2xl rounded-tr-none text-[10px] leading-relaxed shadow-md whitespace-pre-wrap">
                          {getPersonalizedMessage(currentItem)}
                          <div className="text-[7px] text-white/60 text-right mt-1.5 font-bold uppercase tracking-wider">✓✓ 10:32 AM</div>
                        </div>
                      </div>

                      <div className="h-10 bg-slate-900/90 border-t border-white/5 flex items-center px-4 justify-between">
                        <div className="w-full h-6 rounded-full bg-slate-950 border border-white/5 flex items-center px-3">
                          <span className="text-[8px] text-slate-600">Escribir mensaje...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mail browser mockup */}
                  {activeChannel === 'email' && (
                    <div className="w-full h-[400px] bg-slate-950 border-2 border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                      <div className="h-9 bg-slate-900 px-4 flex items-center gap-1.5 border-b border-white/5">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <div className="ml-4 flex-1 h-5 rounded bg-slate-950 border border-white/5 flex items-center px-2 text-[8px] text-slate-400 truncate">
                          mcvill.com/mail-client
                        </div>
                      </div>

                      <div className="p-4 border-b border-white/5 space-y-1 bg-slate-950 text-[9px]">
                        <div className="flex text-slate-500"><span className="w-10 font-bold">De:</span> <span className="text-blue-400">{emailSender}</span></div>
                        <div className="flex text-slate-500"><span className="w-10 font-bold">Para:</span> <span className="text-white">{currentItem.email}</span></div>
                        <div className="flex text-slate-500"><span className="w-10 font-bold">Asunto:</span> <span className="text-white font-bold">{getPersonalizedSubject(currentItem)}</span></div>
                      </div>

                      <div className="flex-1 p-4 bg-white text-slate-800 overflow-y-auto text-[9px] leading-relaxed">
                        <div className="bg-slate-900 text-white p-3 rounded-lg text-center font-bold tracking-widest text-[10px] mb-3">
                          MCVILL MASTER CONTROL
                        </div>
                        <div className="whitespace-pre-wrap">{getPersonalizedMessage(currentItem)}</div>
                        <div className="mt-4 border-t border-slate-200 pt-3 text-slate-500 font-mono text-[7px]" dangerouslySetInnerHTML={{ __html: emailSignature }} />
                      </div>
                    </div>
                  )}

                  {/* Teams adaptive card mockup */}
                  {activeChannel === 'teams' && (
                    <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center text-white text-xs font-black">T</div>
                        <span className="text-[10px] font-black text-white">Teams Channel Feed</span>
                      </div>

                      <div className="border-l-4 p-4 bg-slate-900 rounded-r-xl space-y-2 border-violet-500" style={{ borderLeftColor: teamsCardColor }}>
                        <div className="flex items-center gap-2">
                          <img src="https://img.icons8.com/color/48/microsoft-teams.png" className="w-5 h-5" alt="Teams" />
                          <span className="text-[9px] font-black text-white uppercase tracking-wider">NOTIFICACIÓN OMNICANAL MCVILL</span>
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium">Destinatario: {currentItem.name}</div>
                        <div className="text-[9px] text-slate-300 leading-relaxed whitespace-pre-wrap">{getPersonalizedMessage(currentItem)}</div>
                        
                        <div className="pt-2">
                          <button className="px-3 py-1 bg-violet-600 text-white rounded text-[8px] font-black uppercase">
                            Ver Viajero
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={() => setQueueIndex(null)}
                    className="mt-6 text-[10px] font-black text-rose-400 hover:text-rose-300 uppercase tracking-widest flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={12} /> Cancelar Cola
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};
