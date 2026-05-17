import React, { useState, useMemo } from 'react';
import { Search, BookOpen, Mail, Globe, Database, Upload, ExternalLink, ChevronRight } from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import { MODULE_GUIDES } from '../data/moduleGuides';
import { MODULE_GUIDES_EN } from '../data/moduleGuidesEn';
import { useLanguage } from '../contexts/LanguageContext';
import clsx from 'clsx';

export const HelpView = () => {
  const { isDarkMode, config } = useConfig();
  const { language, t } = useLanguage();
  const [search, setSearch] = useState('');

  const allModules = useMemo(() => {
    return Object.values(language === 'en' ? MODULE_GUIDES_EN : MODULE_GUIDES);
  }, [language]);

  const filteredModules = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allModules;
    return allModules.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.moduleId.toLowerCase().includes(q)
    );
  }, [search, allModules]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className={clsx(
        'rounded-2xl border p-8 relative overflow-hidden',
        isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-white border-blue-100'
      )}>
        <div className="flex items-center gap-6 relative z-10">
          <div className={clsx(
            'w-16 h-16 rounded-2xl flex items-center justify-center shrink-0',
            isDarkMode ? 'bg-mcvill-accent/10 border border-mcvill-accent/30' : 'bg-blue-50 border border-blue-200'
          )}>
            <BookOpen className="text-mcvill-accent" size={30} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-mcvill-accent mb-1">
              {language === 'en' ? 'Help Center' : 'Centro de Ayuda'}
            </p>
            <h1 className={clsx(
              'text-2xl font-black uppercase tracking-tight leading-none mb-1',
              isDarkMode ? 'text-white' : 'text-slate-900'
            )}>
              {language === 'en' ? 'Manual & Support' : 'Manual y Soporte'}{' '}
              <span className="text-mcvill-accent">{config.logoText}</span>
            </h1>
            <p className={clsx(
              'text-sm font-medium',
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            )}>
              {language === 'en'
                ? 'Explore guides by module, contact support, or learn to use the AI corporate memory.'
                : 'Explora guías por módulo, contacta soporte o aprende a usar la memoria corporativa IA.'}
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <Search
          className={clsx(
            'absolute left-5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-mcvill-accent',
            isDarkMode ? 'text-slate-600' : 'text-slate-400'
          )}
          size={18}
        />
        <input
          type="text"
          placeholder={
            language === 'en'
              ? 'Search module... (Inventory, Quality, Payroll...)'
              : 'Buscar módulo... (Inventario, Calidad, Nómina...)'
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={clsx(
            'w-full rounded-2xl py-4 pl-14 pr-6 text-sm font-bold outline-none transition-all',
            'focus:ring-4 focus:ring-mcvill-accent/10 placeholder:font-medium',
            isDarkMode
              ? 'bg-slate-900/60 border border-white/5 text-white placeholder:text-slate-600 focus:border-mcvill-accent/30'
              : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-300'
          )}
        />
      </div>

      {/* Module Cards Grid */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1 bg-white/5" />
          <p className={clsx(
            'text-[9px] font-black uppercase tracking-[0.3em]',
            isDarkMode ? 'text-slate-600' : 'text-slate-400'
          )}>
            {filteredModules.length}{' '}
            {language === 'en'
              ? `available module${filteredModules.length !== 1 ? 's' : ''}`
              : `módulo${filteredModules.length !== 1 ? 's' : ''} disponible${filteredModules.length !== 1 ? 's' : ''}`}
          </p>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        {filteredModules.length === 0 ? (
          <div className={clsx(
            'rounded-2xl border p-12 text-center',
            isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200'
          )}>
            <Search size={40} className="mx-auto mb-4 opacity-20" />
            <p className={clsx(
              'text-sm font-black uppercase tracking-widest',
              isDarkMode ? 'text-slate-600' : 'text-slate-400'
            )}>
              {language === 'en'
                ? `No modules found for "${search}"`
                : `No se encontraron módulos para "${search}"`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredModules.map((mod) => (
              <div
                key={mod.moduleId}
                className={clsx(
                  'group rounded-xl border p-5 flex flex-col gap-3 transition-all duration-200',
                  isDarkMode
                    ? 'bg-slate-900/40 border-white/5 hover:border-mcvill-accent/30 hover:bg-slate-900/60'
                    : 'bg-white border-slate-100 hover:border-blue-200 shadow-sm hover:shadow-md'
                )}
              >
                {/* Card Header */}
                <div className="flex items-start gap-3">
                  <div className={clsx(
                    'w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0',
                    isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-slate-50 border border-slate-200'
                  )}>
                    {mod.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={clsx(
                      'text-[11px] font-black uppercase tracking-widest truncate',
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    )}>
                      {mod.label}
                    </p>
                    <p className={clsx(
                      'text-[10px] font-medium leading-snug mt-0.5',
                      isDarkMode ? 'text-slate-500' : 'text-slate-500'
                    )}>
                      {mod.description}
                    </p>
                  </div>
                </div>

                {/* Steps count */}
                <p className={clsx(
                  'text-[9px] font-black uppercase tracking-widest',
                  isDarkMode ? 'text-slate-700' : 'text-slate-400'
                )}>
                  {mod.steps.length}{' '}
                  {language === 'en'
                    ? `guide section${mod.steps.length !== 1 ? 's' : ''}`
                    : `sección${mod.steps.length !== 1 ? 'es' : ''} de guía`}
                </p>

                {/* Ver Guia button */}
                <a
                  href={`#${mod.moduleId}`}
                  onClick={(e) => {
                    e.preventDefault();
                    // Dispatch a custom event so App.tsx can open the ModuleGuideModal if desired
                    window.dispatchEvent(new CustomEvent('mcvill:open-guide', { detail: { moduleId: mod.moduleId } }));
                  }}
                  className={clsx(
                    'mt-auto flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all',
                    isDarkMode
                      ? 'border-mcvill-accent/20 text-mcvill-accent bg-mcvill-accent/5 hover:bg-mcvill-accent/15 hover:border-mcvill-accent/40'
                      : 'border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100'
                  )}
                >
                  <span>{language === 'en' ? 'View Guide' : 'Ver Guía'}</span>
                  <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                </a>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Documentos RAG — Memoria Corporativa */}
      <section className={clsx(
        'rounded-2xl border p-6 space-y-5',
        isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-100'
      )}>
        <div className="flex items-center gap-3">
          <div className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            isDarkMode ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-purple-50 border border-purple-200'
          )}>
            <Database className="text-purple-400" size={18} />
          </div>
          <div>
            <p className={clsx(
              'text-[10px] font-black uppercase tracking-[0.25em]',
              isDarkMode ? 'text-purple-400' : 'text-purple-600'
            )}>
              {language === 'en' ? 'AI Corporate Memory' : 'Memoria Corporativa IA'}
            </p>
            <h2 className={clsx(
              'text-sm font-black uppercase tracking-tight',
              isDarkMode ? 'text-white' : 'text-slate-900'
            )}>
              {language === 'en' ? 'RAG Documents' : 'Documentos RAG'}
            </h2>
          </div>
        </div>

        <p className={clsx(
          'text-[11px] leading-relaxed',
          isDarkMode ? 'text-slate-500' : 'text-slate-500'
        )}>
          {language === 'en'
            ? `The AI system of ${config.logoText} utilizes Retrieval-Augmented Generation (RAG) to access internal company documents in real time. By uploading documents to the corporate memory, the AI assistant can answer questions based on the real content of ${config.brandName}.`
            : `El sistema de IA de ${config.logoText} utiliza Retrieval-Augmented Generation (RAG) para acceder a documentos internos de la empresa en tiempo real. Al subir documentos a la memoria corporativa, el asistente IA puede responder preguntas basadas en el contenido real de ${config.brandName}.`}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: Upload,
              title: language === 'en' ? 'Upload Documents' : 'Subir Documentos',
              desc: language === 'en'
                ? 'PDF, Word, or plain text containing procedures, compliance standards, or internal manuals.'
                : 'PDF, Word o texto plano con procedimientos, normas o manuales internos.',
              color: isDarkMode ? 'text-purple-400' : 'text-purple-600',
              bg: isDarkMode ? 'bg-purple-500/5 border-purple-500/20' : 'bg-purple-50 border-purple-200',
            },
            {
              icon: Database,
              title: language === 'en' ? 'Automatic Indexing' : 'Indexación Automática',
              desc: language === 'en'
                ? 'The system converts documents into semantic vectors for intelligent real-time searching.'
                : 'El sistema convierte los documentos en vectores semánticos para búsqueda inteligente.',
              color: isDarkMode ? 'text-blue-400' : 'text-blue-600',
              bg: isDarkMode ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-200',
            },
            {
              icon: BookOpen,
              title: language === 'en' ? 'Query in AI Chat' : 'Consulta en Chat IA',
              desc: language === 'en'
                ? 'Ask the assistant and it will fetch contextual answers based on your loaded documents.'
                : 'Pregunta al asistente y obtendrá respuestas contextuales basadas en tus documentos.',
              color: isDarkMode ? 'text-emerald-400' : 'text-emerald-600',
              bg: isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200',
            },
          ].map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} className={clsx('rounded-xl border p-4', bg)}>
              <Icon size={16} className={clsx('mb-2', color)} />
              <p className={clsx('text-[10px] font-black uppercase tracking-widest mb-1', color)}>{title}</p>
              <p className={clsx('text-[10px] leading-snug', isDarkMode ? 'text-slate-600' : 'text-slate-500')}>
                {desc}
              </p>
            </div>
          ))}
        </div>

        <p className={clsx(
          'text-[10px] italic',
          isDarkMode ? 'text-slate-700' : 'text-slate-400'
        )}>
          {language === 'en'
            ? 'To manage RAG documents, navigate to Settings > Corporate Memory or contact your system administrator.'
            : 'Para gestionar documentos RAG, accede a Configuración > Memoria Corporativa o contacta al administrador del sistema.'}
        </p>
      </section>

      {/* Contacto Soporte */}
      <section className={clsx(
        'rounded-2xl border p-6',
        isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-100'
      )}>
        <div className="flex items-center gap-3 mb-5">
          <div className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            isDarkMode ? 'bg-mcvill-accent/10 border border-mcvill-accent/30' : 'bg-blue-50 border border-blue-200'
          )}>
            <Mail className="text-mcvill-accent" size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-mcvill-accent">
              {language === 'en' ? 'Technical Support' : 'Soporte Técnico'}
            </p>
            <h2 className={clsx(
              'text-sm font-black uppercase tracking-tight',
              isDarkMode ? 'text-white' : 'text-slate-900'
            )}>
              {language === 'en' ? 'Contact Us' : 'Contacto'}
            </h2>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Email */}
          <a
            href={`mailto:${config.supportEmail}`}
            className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all flex-1',
              isDarkMode
                ? 'bg-white/3 border-white/5 hover:border-mcvill-accent/30 hover:bg-white/5'
                : 'bg-slate-50 border-slate-200 hover:border-blue-300'
            )}
          >
            <Mail size={16} className="text-mcvill-accent shrink-0" />
            <div>
              <p className={clsx(
                'text-[9px] font-black uppercase tracking-widest',
                isDarkMode ? 'text-slate-600' : 'text-slate-400'
              )}>
                {language === 'en' ? 'Support Email' : 'Email Soporte'}
              </p>
              <p className={clsx(
                'text-[11px] font-bold',
                isDarkMode ? 'text-white' : 'text-slate-900'
              )}>
                {config.supportEmail}
              </p>
            </div>
            <ExternalLink size={12} className={clsx('ml-auto', isDarkMode ? 'text-slate-700' : 'text-slate-400')} />
          </a>

          {/* Web */}
          <a
            href={config.developerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all flex-1',
              isDarkMode
                ? 'bg-white/3 border-white/5 hover:border-mcvill-accent/30 hover:bg-white/5'
                : 'bg-slate-50 border-slate-200 hover:border-blue-300'
            )}
          >
            <Globe size={16} className="text-mcvill-accent shrink-0" />
            <div>
              <p className={clsx(
                'text-[9px] font-black uppercase tracking-widest',
                isDarkMode ? 'text-slate-600' : 'text-slate-400'
              )}>
                {language === 'en' ? 'Website' : 'Sitio Web'}
              </p>
              <p className={clsx(
                'text-[11px] font-bold',
                isDarkMode ? 'text-white' : 'text-slate-900'
              )}>
                {config.developerUrl.replace('https://', '')}
              </p>
            </div>
            <ExternalLink size={12} className={clsx('ml-auto', isDarkMode ? 'text-slate-700' : 'text-slate-400')} />
          </a>
        </div>

        <p className={clsx(
          'text-[9px] mt-4 font-medium',
          isDarkMode ? 'text-slate-700' : 'text-slate-400'
        )}>
          {language === 'en'
            ? 'Typical response time: under 24 hours on business days. For critical emergencies mention "URGENT" in the subject line.'
            : 'Tiempo de respuesta típico: menos de 24 horas en días hábiles. Para urgencias críticas menciona "URGENTE" en el asunto.'}
        </p>
      </section>

    </div>
  );
};

export default HelpView;
