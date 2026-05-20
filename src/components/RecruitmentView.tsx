import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  UserPlus, 
  FileSearch, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Zap, 
  Plus, 
  Trash2, 
  Search,
  ChevronRight,
  Filter,
  BarChart3,
  Award,
  ShieldCheck,
  Loader2,
  FileDown,
  LayoutGrid,
  List,
  Edit,
  AlertCircle,
  Check
} from 'lucide-react';
import { recruitmentService } from '../services/recruitmentService';
import { aiService } from '../services/aiService';
import type { Vacancy, Candidate } from '../types/index';
import { reportUtils } from '../utils/reportUtils';
import clsx from 'clsx';
import { useConfig } from '../contexts/ConfigContext';
import { toast } from '../lib/dialogs';
import { PrintButton } from './common/PrintButton';

export const RecruitmentView: React.FC = () => {
  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    toast(message, type === 'error' ? 'error' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info', title);
  };
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [view, setView] = useState<'dashboard' | 'vacancy_detail' | 'talent_pool'>('dashboard');
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [editingVacancyId, setEditingVacancyId] = useState<string | null>(null);
  
  // Search & Batch Selection state for Vacancies
  const [vacancySearchQuery, setVacancySearchQuery] = useState('');
  const [selectedVacancyIds, setSelectedVacancyIds] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'single' | 'batch';
    idToDelete?: string;
    message: string;
  }>({
    isOpen: false,
    type: 'single',
    message: ''
  });

  // Filtered vacancies list based on search
  const filteredVacancies = vacancies.filter(v => 
    v.title.toLowerCase().includes(vacancySearchQuery.toLowerCase()) ||
    v.description.toLowerCase().includes(vacancySearchQuery.toLowerCase())
  );

  // Batch delete handler
  const handleBatchDeleteVacancies = () => {
    if (selectedVacancyIds.length === 0) return;
    setDeleteConfirm({
      isOpen: true,
      type: 'batch',
      message: `¿Seguro que deseas dar de baja las ${selectedVacancyIds.length} vacantes seleccionadas? Todos los candidatos asociados perderán su vinculación.`
    });
  };

  const executeBatchDelete = async () => {
    setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
    try {
      setLoading(true);
      await Promise.all(selectedVacancyIds.map(id => recruitmentService.deleteVacancy(id)));
      setSelectedVacancyIds([]);
      await fetchInitialData();
      showAlert('Éxito', 'Vacantes dadas de baja correctamente', 'success');
    } catch (err) {
      console.error('Error deleting batch vacancies:', err);
      showAlert('Error', 'Fallo al dar de baja algunas vacantes', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Form state for controlled inputs
  const [formValues, setFormValues] = useState({
    title: '',
    description: '',
    requirements: ''
  });

  const [candidateForm, setCandidateForm] = useState({
    name: '',
    email: '',
    phone: '',
    resume_text: ''
  });

  // Public Portal Simulator States
  const [publicSearch, setPublicSearch] = useState('');
  const [selectedPublicVacancy, setSelectedPublicVacancy] = useState<Vacancy | null>(null);
  const [publicCandidateForm, setPublicCandidateForm] = useState({
    name: '',
    email: '',
    phone: '',
    resume_text: ''
  });
  const [isSubmittingPublic, setIsSubmittingPublic] = useState(false);
  const [publicStep, setPublicStep] = useState<'idle' | 'extracting' | 'analyzing' | 'success'>('idle');
  const [simulatedScore, setSimulatedScore] = useState<number>(0);

  const VACANCY_TEMPLATES = [
    {
      title: 'Operador de CNC',
      description: 'Responsable de la operación y configuración de centros de maquinado CNC. Lectura de planos y uso de instrumentos de medición.',
      requirements: 'Experiencia previa en CNC\nInterpretación de planos técnicos\nConocimiento de herramientas de medición (Vernier, Micrómetro)\nDisponibilidad de turno'
    },
    {
      title: 'Ingeniero de Calidad',
      description: 'Asegurar el cumplimiento de los estándares ISO 9001:2015. Gestión de No Conformidades, APQP, PPAP y SPC.',
      requirements: 'Ingeniería Industrial o afín\nConocimiento en Core Tools (APQP, PPAP, FMEA)\nExperiencia en auditorías internas\nInglés técnico intermedio'
    },
    {
      title: 'Soldador Certificado',
      description: 'Ejecución de procesos de soldadura TIG/MIG siguiendo especificaciones técnicas de McVill y normas internacionales.',
      requirements: 'Certificación vigente AWS\nExperiencia en soldadura industrial (acero/aluminio)\nUso de equipo de seguridad EPP\nLectura de simbología de soldadura'
    },
    {
      title: 'Supervisor de Producción',
      description: 'Liderar células de producción para cumplir con el programa diario. Monitoreo de OEE, calidad y seguridad industrial.',
      requirements: 'Liderazgo de equipos (min 10 personas)\nEnfoque en mejora continua (Lean Manufacturing)\nControl de mermas y tiempos de ciclo\nExperiencia en ambiente industrial metalmecánico'
    }
  ];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const [analyzingCV, setAnalyzingCV] = useState(false);
  const [isAddingVacancy, setIsAddingVacancy] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const exportCandidatePDF = (candidate: Candidate) => {
    const vacancy = vacancies.find(v => v.id === candidate.vacancy_id);
    const strengths: string[] = candidate.ai_analysis?.strengths ?? [];
    const weaknesses: string[] = candidate.ai_analysis?.weaknesses ?? [];
    const rows = [
      { Campo: 'Candidato', Valor: candidate.name },
      { Campo: 'Email', Valor: candidate.email },
      { Campo: 'TelÃ©fono', Valor: candidate.phone || 'â€”' },
      { Campo: 'Vacante', Valor: vacancy?.title ?? 'Talent Pool' },
      { Campo: 'Score IA', Valor: `${candidate.ai_score ?? 0}%` },
      { Campo: 'Estatus', Valor: candidate.status },
      { Campo: 'Veredicto IA', Valor: candidate.ai_analysis?.recommendation ?? 'â€”' },
      { Campo: 'JustificaciÃ³n', Valor: candidate.ai_analysis?.justification ?? 'â€”' },
      ...strengths.map((s, i) => ({ Campo: `Fortaleza ${i + 1}`, Valor: s })),
      ...weaknesses.map((w, i) => ({ Campo: `Ãrea oportunidad ${i + 1}`, Valor: w })),
    ];
    reportUtils.exportToPDF(
      `AnÃ¡lisis Candidato â€” ${candidate.name}`,
      rows,
      `candidato_${candidate.name.toLowerCase().replace(/\s+/g, '_')}`,
      'RECLUTAMIENTO'
    );
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [vData, cData] = await Promise.all([
        recruitmentService.getVacancies(),
        recruitmentService.getCandidates()
      ]);
      setVacancies(vData);
      setCandidates(cData);
    } catch (err) {
      console.error('Error fetching recruitment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVacancy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVacancyId) {
        await recruitmentService.updateVacancy(editingVacancyId, {
          title: formValues.title,
          description: formValues.description,
          requirements: formValues.requirements.split('\n')
        });
        showAlert('Éxito', 'Vacante actualizada con éxito', 'success');
      } else {
        await recruitmentService.createVacancy({
          title: formValues.title,
          description: formValues.description,
          requirements: formValues.requirements.split('\n'),
          status: 'open'
        });
        showAlert('Éxito', 'Vacante publicada con éxito', 'success');
      }
      setIsAddingVacancy(false);
      setEditingVacancyId(null);
      setFormValues({ title: '', description: '', requirements: '' });
      fetchInitialData();
    } catch (err) {
      console.error('Error saving vacancy:', err);
      showAlert('Error', 'Fallo al guardar la vacante', 'error');
    }
  };

  const handleEditVacancy = (e: React.MouseEvent, vacancy: Vacancy) => {
    e.stopPropagation();
    setEditingVacancyId(vacancy.id);
    setFormValues({
      title: vacancy.title,
      description: vacancy.description,
      requirements: vacancy.requirements?.join('\n') || ''
    });
    setIsAddingVacancy(true);
  };

  const handleDeleteVacancy = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirm({
      isOpen: true,
      type: 'single',
      idToDelete: id,
      message: '¿Seguro que deseas eliminar esta vacante? Todos los candidatos asociados perderán su vinculación.'
    });
  };

  const executeSingleDelete = async (id: string) => {
    setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
    try {
      await recruitmentService.deleteVacancy(id);
      fetchInitialData();
      showAlert('Éxito', 'Vacante eliminada correctamente', 'success');
      if (selectedVacancy?.id === id) {
        setSelectedVacancy(null);
        setView('dashboard');
      }
    } catch (err) {
      console.error('Error deleting vacancy:', err);
      showAlert('Error', 'No se pudo eliminar la vacante', 'error');
    }
  };

  const handlePublicSubmitCV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPublicVacancy) {
      showAlert('Error', 'Por favor selecciona una vacante primero', 'error');
      return;
    }
    
    setIsSubmittingPublic(true);
    setPublicStep('extracting');
    
    try {
      // Step 1: Simulated extraction time
      await new Promise(resolve => setTimeout(resolve, 1500));
      setPublicStep('analyzing');
      
      // Step 2: Push candidate database row
      const candidate = await recruitmentService.addCandidate({
        name: publicCandidateForm.name,
        email: publicCandidateForm.email,
        phone: publicCandidateForm.phone,
        resume_text: publicCandidateForm.resume_text || `Postulado vía Portal Público McVill para la vacante de ${selectedPublicVacancy.title}`,
        vacancy_id: selectedPublicVacancy.id,
        status: 'pending'
      });
      
      // Step 3: Run AI analysis
      const analysis = await recruitmentService.analyzeCandidate(candidate, selectedPublicVacancy);
      
      setSimulatedScore(analysis.score || 75);
      setPublicStep('success');
      setPublicCandidateForm({ name: '', email: '', phone: '', resume_text: '' });
      fetchInitialData(); // Reload for HR view in real-time!
    } catch (err) {
      console.error('Error submitting public applicant:', err);
      showAlert('Error', 'Hubo un error procesando tu postulación', 'error');
      setPublicStep('idle');
    } finally {
      setIsSubmittingPublic(false);
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnalyzingCV(true);
    try {
      const candidate = await recruitmentService.addCandidate({
        name: candidateForm.name,
        email: candidateForm.email,
        phone: candidateForm.phone,
        resume_text: candidateForm.resume_text,
        vacancy_id: selectedVacancy?.id || null,
        status: 'pending'
      });

      if (selectedVacancy) {
        await recruitmentService.analyzeCandidate(candidate, selectedVacancy);
      }

      setIsAddingCandidate(false);
      setCandidateForm({ name: '', email: '', phone: '', resume_text: '' });
      fetchInitialData();
      showAlert('Ã‰xito', 'Candidato registrado', 'success');
    } catch (err) {
      console.error('Error adding candidate:', err);
      showAlert('Error', 'Error al registrar candidato', 'error');
    } finally {
      setAnalyzingCV(false);
    }
  };

  const selectTemplate = (template: typeof VACANCY_TEMPLATES[0]) => {
    setFormValues({
      title: template.title,
      description: template.description,
      requirements: template.requirements
    });
  };

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setAnalyzingCV(true);
    const files = Array.from(e.target.files);
    
    try {
      for (const file of files) {
        const name = file.name.split('.')[0].replace(/_/g, ' ').replace(/-/g, ' ');
        
        // Si es un archivo .txt, leer su texto localmente para alimentar directamente a la IA
        let resumeText = '';
        if (file.name.toLowerCase().endsWith('.txt')) {
          resumeText = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (evt) => resolve(evt.target?.result as string || '');
            reader.onerror = () => resolve('');
            reader.readAsText(file);
          });
        }

        const resumeUrl = await recruitmentService.uploadCV(name, file);
        
        const candidate = await recruitmentService.addCandidate({
          name,
          vacancy_id: selectedVacancy?.id || null,
          resume_url: resumeUrl,
          resume_text: resumeText || null,
          status: 'pending'
        });

        if (selectedVacancy) {
          await recruitmentService.analyzeCandidate(candidate, selectedVacancy);
        }
      }
      
      showAlert('Éxito', `Se procesaron ${files.length} candidatos correctamente`, 'success');
      fetchInitialData();
      setIsAddingCandidate(false);
    } catch (err) {
      console.error('Error procesando CVs masivos:', err);
      showAlert('Error', 'Hubo un problema al procesar uno o más CVs', 'error');
    } finally {
      setAnalyzingCV(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 size={48} className="text-mcvill-accent animate-spin mb-4" />
        <p className="text-slate-500 font-black uppercase tracking-[0.3em] animate-pulse">Iniciando Protocolo_Reclutamiento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Internal Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('dashboard')}
            className={clsx(
              "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
              view === 'dashboard' ? "bg-mcvill-accent text-slate-950 shadow-[0_0_20px_rgba(0,128,255,0.3)]" : "text-slate-500 hover:text-white"
            )}
          >
            Resumen General
          </button>
          <button 
            onClick={() => setView('talent_pool')}
            className={clsx(
              "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
              view === 'talent_pool' ? "bg-mcvill-accent text-slate-950 shadow-[0_0_20px_rgba(0,128,255,0.3)]" : "text-slate-500 hover:text-white"
            )}
          >
            Bolsa de Trabajo
          </button>
          <button 
            onClick={() => setView('public_portal')}
            className={clsx(
              "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
              view === 'public_portal' ? "bg-mcvill-accent text-slate-950 shadow-[0_0_20px_rgba(0,128,255,0.3)]" : "text-slate-500 hover:text-white"
            )}
          >
            🏢 Portal Público (Candidato)
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsAddingCandidate(true)}
            className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-slate-900 border border-mcvill-card-border text-slate-400 hover:text-white transition-all flex items-center gap-2"
          >
            <UserPlus size={14} /> Capturar Candidato
          </button>
          <button
            onClick={() => {
              setFormValues({ title: '', description: '', requirements: '' });
              setIsAddingVacancy(true);
            }}
            className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-mcvill-accent/10 border border-mcvill-accent/30 text-mcvill-accent hover:bg-mcvill-accent/20 transition-all flex items-center gap-2"
          >
            <Plus size={14} /> Nueva Vacante
          </button>
          <PrintButton />
        </div>
      </div>

      {view === 'dashboard' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Vacancies List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                <Briefcase className="text-mcvill-accent" /> Vacantes Activas
              </h3>
              
              <div className="flex bg-slate-950 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setLayoutMode('grid')}
                  className={clsx(
                    "p-2 rounded-lg transition-all",
                    layoutMode === 'grid' ? "bg-mcvill-accent text-slate-950 shadow-md" : "text-slate-500 hover:text-white"
                  )}
                  title="Vista Cuadrícula"
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  onClick={() => setLayoutMode('list')}
                  className={clsx(
                    "p-2 rounded-lg transition-all",
                    layoutMode === 'list' ? "bg-mcvill-accent text-slate-950 shadow-md" : "text-slate-500 hover:text-white"
                  )}
                  title="Vista Lista"
                >
                  <List size={14} />
                </button>
              </div>
            </div>

            {/* Vacancy Search & Batch Actions Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-950/60 rounded-2xl border border-white/5">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={vacancySearchQuery}
                  onChange={e => setVacancySearchQuery(e.target.value)}
                  placeholder="Buscar vacantes por puesto o descripción..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-mcvill-accent"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const allSelected = filteredVacancies.length > 0 && filteredVacancies.every(v => selectedVacancyIds.includes(v.id));
                    if (allSelected) {
                      setSelectedVacancyIds(prev => prev.filter(id => !filteredVacancies.some(fv => fv.id === id)));
                    } else {
                      setSelectedVacancyIds(prev => {
                        const newIds = [...prev];
                        filteredVacancies.forEach(fv => {
                          if (!newIds.includes(fv.id)) newIds.push(fv.id);
                        });
                        return newIds;
                      });
                    }
                  }}
                  className="px-4 py-2 bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 font-bold text-[10px] uppercase rounded-xl transition-all"
                >
                  {filteredVacancies.length > 0 && filteredVacancies.every(v => selectedVacancyIds.includes(v.id)) ? 'Desmarcar Todas' : 'Seleccionar Todas'}
                </button>
                
                {selectedVacancyIds.length > 0 && (
                  <button
                    onClick={handleBatchDeleteVacancies}
                    className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 font-bold text-[10px] uppercase rounded-xl transition-all flex items-center gap-2"
                  >
                    <Trash2 size={12} />
                    Dar de Baja ({selectedVacancyIds.length})
                  </button>
                )}
              </div>
            </div>

            {layoutMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredVacancies.map(v => {
                  const isSelected = selectedVacancyIds.includes(v.id);
                  return (
                    <div 
                      key={v.id}
                      onClick={() => {
                        setSelectedVacancy(v);
                        setView('vacancy_detail');
                      }}
                      className={clsx(
                        "glass-premium p-6 border-mcvill-card-border hover:border-mcvill-accent/30 cursor-pointer group relative transition-all",
                        isSelected && "border-mcvill-accent/55 bg-mcvill-accent/5"
                      )}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          {/* Multiple selector checkbox */}
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVacancyIds(prev => 
                                prev.includes(v.id) ? prev.filter(id => id !== v.id) : [...prev, v.id]
                              );
                            }}
                            className={clsx(
                              "w-5 h-5 rounded border flex items-center justify-center transition-all cursor-pointer",
                              isSelected
                                ? "border-mcvill-accent bg-mcvill-accent text-slate-950"
                                : "border-white/10 bg-slate-900 hover:border-white/30"
                            )}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                          
                          <div className="p-3 rounded-2xl bg-mcvill-accent/10 text-mcvill-accent">
                            <Briefcase size={20} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={clsx(
                            "px-3 py-1 rounded-2xl text-[9px] font-black uppercase tracking-widest border",
                            v.status === 'open' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-slate-500/10 text-slate-500 border-white/10"
                          )}>
                            {v.status}
                          </span>
                          
                          {/* Edit and Delete Buttons */}
                          <button
                            onClick={(e) => handleEditVacancy(e, v)}
                            className="p-1.5 rounded-lg bg-slate-900 border border-white/5 text-slate-400 hover:text-mcvill-accent hover:border-mcvill-accent/30 transition-all"
                            title="Editar Vacante"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteVacancy(e, v.id)}
                            className="p-1.5 rounded-lg bg-slate-900 border border-white/5 text-slate-400 hover:text-red-400 hover:border-red-400/30 transition-all"
                            title="Eliminar Vacante"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <h4 className="text-lg font-black text-white group-hover:text-mcvill-accent transition-colors uppercase">{v.title}</h4>
                      <p className="text-slate-500 text-xs mt-2 line-clamp-2">{v.description}</p>
                      <div className="mt-6 flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-600">Candidatos: {candidates.filter(c => c.vacancy_id === v.id).length}</span>
                        <span className="text-mcvill-accent flex items-center gap-1">Gestionar <ChevronRight size={12} /></span>
                      </div>
                    </div>
                  );
                })}
                {filteredVacancies.length === 0 && (
                  <div className="col-span-2 py-12 text-center text-slate-600 uppercase font-black tracking-widest">
                    No se encontraron vacantes
                  </div>
                )}
              </div>
            ) : (
              /* Gorgeous list view */
              <div className="glass-premium border-mcvill-card-border overflow-hidden rounded-2xl bg-slate-950/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-slate-950/80 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <th className="py-4 px-6 w-12 text-center">
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              const allSelected = filteredVacancies.length > 0 && filteredVacancies.every(v => selectedVacancyIds.includes(v.id));
                              if (allSelected) {
                                setSelectedVacancyIds(prev => prev.filter(id => !filteredVacancies.some(fv => fv.id === id)));
                              } else {
                                setSelectedVacancyIds(prev => {
                                  const newIds = [...prev];
                                  filteredVacancies.forEach(fv => {
                                    if (!newIds.includes(fv.id)) newIds.push(fv.id);
                                  });
                                  return newIds;
                                });
                              }
                            }}
                            className={clsx(
                              "w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer mx-auto",
                              filteredVacancies.length > 0 && filteredVacancies.every(v => selectedVacancyIds.includes(v.id))
                                ? "border-mcvill-accent bg-mcvill-accent text-slate-950"
                                : "border-white/10 bg-transparent"
                            )}
                          >
                            {filteredVacancies.length > 0 && filteredVacancies.every(v => selectedVacancyIds.includes(v.id)) && <Check size={11} strokeWidth={3} />}
                          </div>
                        </th>
                        <th className="py-4 px-6">Puesto</th>
                        <th className="py-4 px-6">Estatus</th>
                        <th className="py-4 px-6 text-center">Candidatos</th>
                        <th className="py-4 px-6 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {filteredVacancies.map(v => {
                        const isSelected = selectedVacancyIds.includes(v.id);
                        return (
                          <tr 
                            key={v.id}
                            onClick={() => {
                              setSelectedVacancy(v);
                              setView('vacancy_detail');
                            }}
                            className={clsx(
                              "hover:bg-white/[0.02] cursor-pointer transition-colors group",
                              isSelected && "bg-mcvill-accent/5"
                            )}
                          >
                            <td className="py-4 px-6 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                              <div 
                                onClick={() => {
                                  setSelectedVacancyIds(prev => 
                                    prev.includes(v.id) ? prev.filter(id => id !== v.id) : [...prev, v.id]
                                  );
                                }}
                                className={clsx(
                                  "w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer mx-auto",
                                  isSelected
                                    ? "border-mcvill-accent bg-mcvill-accent text-slate-950"
                                    : "border-white/10 bg-transparent"
                                )}
                              >
                                {isSelected && <Check size={11} strokeWidth={3} />}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className="font-black text-white group-hover:text-mcvill-accent transition-colors uppercase tracking-tight">
                                {v.title}
                              </span>
                              <p className="text-[10px] text-slate-500 mt-1 max-w-md truncate">{v.description}</p>
                            </td>
                            <td className="py-4 px-6">
                              <span className={clsx(
                                "px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border",
                                v.status === 'open' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-slate-500/10 text-slate-500 border-white/10"
                              )}>
                                {v.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center font-bold text-white">
                              {candidates.filter(c => c.vacancy_id === v.id).length}
                            </td>
                            <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedVacancy(v);
                                    setView('vacancy_detail');
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-mcvill-accent/10 border border-mcvill-accent/20 text-mcvill-accent hover:bg-mcvill-accent/20 text-[9px] font-black uppercase tracking-wider transition-all"
                                >
                                  Gestionar
                                </button>
                                <button
                                  onClick={(e) => handleEditVacancy(e, v)}
                                  className="p-2 rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-mcvill-accent hover:border-mcvill-accent/30 transition-all"
                                  title="Editar"
                                >
                                  <Edit size={12} />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteVacancy(e, v.id)}
                                  className="p-2 rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-red-400 hover:border-red-400/30 transition-all"
                                  title="Eliminar"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredVacancies.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-600 uppercase font-black tracking-widest">
                            No hay vacantes registradas
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* AI Insights / Talent Pool Mini */}
          <div className="space-y-6">
            <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
              <Zap className="text-mcvill-accent" /> AI Talent Analysis
            </h3>
            <div className="glass-premium p-6 border-mcvill-card-border bg-mcvill-accent/5">
              <p className="text-[10px] font-black text-mcvill-accent uppercase tracking-widest mb-4">Top Matches</p>
              <div className="space-y-4">
                {candidates.filter(c => c.ai_score > 80).sort((a,b) => b.ai_score - a.ai_score).slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/50 border border-mcvill-card-border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-[10px] font-black text-mcvill-accent">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white uppercase">{c.name}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase truncate max-w-[120px]">
                          {vacancies.find(v => v.id === c.vacancy_id)?.title || 'Talent Pool'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-emerald-400">{c.ai_score}%</p>
                      <p className="text-[8px] text-slate-600 font-black uppercase tracking-tighter">Match</p>
                    </div>
                  </div>
                ))}
                {candidates.filter(c => c.ai_score > 80).length === 0 && (
                  <p className="text-[10px] text-slate-600 text-center py-4 uppercase font-black tracking-widest">Sin coincidencias de alto nivel</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : view === 'talent_pool' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
              <Award className="text-mcvill-accent" /> Repositorio de Talento
            </h3>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input 
                  type="text"
                  placeholder="Buscar candidatos por habilidad..."
                  className="bg-slate-950 border border-white/5 rounded-2xl py-3 pl-12 pr-6 text-xs text-white outline-none focus:border-mcvill-accent/40 w-64 transition-all"
                />
              </div>
              <button className="p-3 rounded-2xl bg-slate-900 border border-white/5 text-slate-500 hover:text-white transition-all">
                <Filter size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {candidates.map(c => (
              <div 
                key={c.id} 
                onClick={() => { setSelectedCandidate(c); setShowAnalysis(true); }}
                className="glass-premium p-6 border-mcvill-card-border hover:border-mcvill-accent/30 transition-all group cursor-pointer"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-mcvill-card-border flex items-center justify-center text-xl font-black text-mcvill-accent group-hover:scale-110 transition-transform">
                    {c.name.charAt(0)}
                  </div>
                  <div className="text-right">
                    <p className={clsx(
                      "text-xl font-black",
                      c.ai_score > 80 ? "text-emerald-400" : c.ai_score > 60 ? "text-mcvill-accent" : "text-amber-400"
                    )}>{c.ai_score || 0}%</p>
                    <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Score</p>
                  </div>
                </div>
                <h4 className="text-sm font-black text-white uppercase group-hover:text-mcvill-accent transition-colors truncate">{c.name}</h4>
                <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 truncate">{c.email || 'Sin Correo'}</p>
                
                <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">
                    {c.vacancy_id ? 'Vinculado' : 'Disponible'}
                  </span>
                  <button className="text-mcvill-accent text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                    Ver AnÃ¡lisis <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : view === 'public_portal' ? (
        /* Vista Portal Público de Candidatos */
        <div className="animate-in fade-in duration-500 space-y-8">
          {/* Public Portal Visual Header Banner */}
          <div className="cyber-panel p-8 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/20 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-mcvill-accent/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-black tracking-widest uppercase">
                  Piso de Atracción de Talento McVill
                </span>
                <h2 className="text-3xl font-black tracking-tight text-white mt-2 uppercase">
                  Portal de Vacantes Públicas
                </h2>
                <p className="text-xs text-slate-400 mt-2 max-w-2xl leading-relaxed">
                  Buscamos ingenieros, soldadores certificados y operadores de precisión listos para incorporarse a las celdas de alta eficiencia. Postúlate aquí y la IA de McVill evaluará tu CV en tiempo real.
                </p>
              </div>
              <div className="shrink-0 bg-slate-950/80 p-4 border border-white/5 rounded-2xl">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">URL del Portal de Empleos</span>
                <span className="text-[10px] font-mono text-emerald-400 mt-1 block">https://mcvill.jobs/talento-industrial</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left side: Available Vacancies */}
            <div className="lg:col-span-1 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Vacantes Disponibles ({vacancies.filter(v => v.status === 'open').length})
                </h4>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input
                  type="text"
                  value={publicSearch}
                  onChange={e => setPublicSearch(e.target.value)}
                  placeholder="Buscar vacante por nombre..."
                  className="w-full bg-slate-950 border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/40"
                />
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                {vacancies
                  .filter(v => v.status === 'open' && v.title.toLowerCase().includes(publicSearch.toLowerCase()))
                  .map(v => (
                    <div
                      key={v.id}
                      onClick={() => {
                        setSelectedPublicVacancy(v);
                        setPublicStep('idle');
                      }}
                      className={clsx(
                        "p-5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] text-left",
                        selectedPublicVacancy?.id === v.id
                          ? "bg-emerald-500/5 border-emerald-500/40 shadow-lg shadow-emerald-500/5"
                          : "bg-slate-950/40 border-white/5 hover:border-white/10 hover:bg-slate-950/70"
                      )}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h5 className={clsx(
                          "text-sm font-black uppercase tracking-tight",
                          selectedPublicVacancy?.id === v.id ? "text-emerald-400" : "text-white"
                        )}>
                          {v.title}
                        </h5>
                        <ChevronRight size={14} className={selectedPublicVacancy?.id === v.id ? "text-emerald-400" : "text-slate-600"} />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">{v.description}</p>
                      
                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-600">
                        <span>Industrial McVill</span>
                        <span>Full-Time</span>
                      </div>
                    </div>
                  ))}
                {vacancies.filter(v => v.status === 'open').length === 0 && (
                  <p className="text-xs text-slate-600 text-center py-10 uppercase font-black">No hay vacantes activas publicadas en este momento</p>
                )}
              </div>
            </div>

            {/* Right side: Apply / Vacancy Details */}
            <div className="lg:col-span-2">
              {selectedPublicVacancy ? (
                <div className="glass-premium border-emerald-500/10 p-8 space-y-6 relative bg-slate-950/20">
                  <div className="border-b border-white/5 pb-5">
                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Postulación Activa</span>
                    <h3 className="text-2xl font-black text-white uppercase mt-1 tracking-tight">{selectedPublicVacancy.title}</h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{selectedPublicVacancy.description}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Requirements Column */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Requisitos Solicitados</h4>
                      <ul className="space-y-2">
                        {selectedPublicVacancy.requirements?.map((req, i) => (
                          <li key={i} className="text-xs text-slate-400 flex items-start gap-2 leading-relaxed">
                            <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Form Column */}
                    <div className="space-y-4 bg-slate-950/80 p-6 rounded-2xl border border-white/5">
                      <h4 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-1.5">
                        <UserPlus size={14} className="text-emerald-400" /> Registro de Candidato
                      </h4>

                      {publicStep === 'idle' && (
                        <form onSubmit={handlePublicSubmitCV} className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Nombre Completo</label>
                            <input
                              type="text"
                              value={publicCandidateForm.name}
                              onChange={e => setPublicCandidateForm({ ...publicCandidateForm, name: e.target.value })}
                              required
                              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/40"
                              placeholder="Ej. Juan Pérez"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Correo Electrónico</label>
                              <input
                                type="email"
                                value={publicCandidateForm.email}
                                onChange={e => setPublicCandidateForm({ ...publicCandidateForm, email: e.target.value })}
                                required
                                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/40"
                                placeholder="juan@ejemplo.com"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Teléfono de Contacto</label>
                              <input
                                type="text"
                                value={publicCandidateForm.phone}
                                onChange={e => setPublicCandidateForm({ ...publicCandidateForm, phone: e.target.value })}
                                required
                                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/40"
                                placeholder="8712223344"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pega tu Currículum o Perfil Profesional</label>
                            <textarea
                              rows={4}
                              value={publicCandidateForm.resume_text}
                              onChange={e => setPublicCandidateForm({ ...publicCandidateForm, resume_text: e.target.value })}
                              required
                              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500/40 resize-none font-mono"
                              placeholder="Soldador con certificación 6G en tubería y procesos MIG/TIG. 5 años trabajando..."
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
                          >
                            <Upload size={14} /> Postularse con Escaneo IA
                          </button>
                        </form>
                      )}

                      {/* LOADING OR SUCCESS STATES */}
                      {publicStep === 'extracting' && (
                        <div className="py-12 text-center space-y-4">
                          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                          <p className="text-xs font-black text-white uppercase tracking-widest">Extrayendo Datos del CV...</p>
                          <p className="text-[10px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                            El procesador de McVill está extrayendo tus habilidades de soldadura, maquinado y control numérico...
                          </p>
                        </div>
                      )}

                      {publicStep === 'analyzing' && (
                        <div className="py-12 text-center space-y-4">
                          <Loader2 className="w-8 h-8 text-mcvill-accent animate-spin mx-auto" />
                          <p className="text-xs font-black text-mcvill-accent uppercase tracking-widest">Análisis Neural Gemini 2.5...</p>
                          <p className="text-[10px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                            Cruzando tu perfil contra los requisitos críticos de soldadura, OTs de maquinado y celdas de piso McVill.
                          </p>
                        </div>
                      )}

                      {publicStep === 'success' && (
                        <div className="py-10 text-center space-y-4 animate-in zoom-in-50 duration-300">
                          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                            <CheckCircle2 size={24} />
                          </div>
                          <div>
                            <h4 className="text-md font-black text-white uppercase">¡Postulación Enviada!</h4>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Compatibilidad Preliminar Calculada</p>
                          </div>
                          
                          <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl inline-block">
                            <span className="text-3xl font-black text-emerald-400">{simulatedScore}%</span>
                            <span className="text-[8px] font-black text-slate-500 block uppercase mt-0.5">Match IA</span>
                          </div>

                          <p className="text-[10px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                            Tu currículum ha sido cargado con éxito en la bolsa de talento de McVill. El equipo de Recursos Humanos te contactará si tu perfil avanza a entrevistas de piso.
                          </p>
                          
                          <button
                            onClick={() => setPublicStep('idle')}
                            className="mt-2 px-4 py-2 bg-slate-900 border border-white/10 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 transition-all"
                          >
                            Volver a Postularse
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center bg-slate-950/20">
                  <Briefcase size={36} className="text-slate-800 mb-3" />
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Selecciona una vacante de la izquierda para postularte</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in slide-in-from-right-4 duration-500 space-y-8">
          {selectedVacancy && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <button 
                    onClick={() => setView('dashboard')}
                    className="text-mcvill-accent text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1"
                  >
                    <ChevronRight size={12} className="rotate-180" /> Volver al Tablero
                  </button>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tight">{selectedVacancy.title}</h3>
                </div>
                <div className="flex gap-4">
                  <label className={clsx(
                    "cursor-pointer flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-[11px] tracking-[0.2em] uppercase transition-all shadow-lg",
                    analyzingCV ? "bg-slate-800 text-slate-500" : "mcvill-btn-ai"
                  )}>
                    {analyzingCV ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                    {analyzingCV ? "Analizando CV..." : "Subir CV (IA)"}
                    <input type="file" className="hidden" onChange={handleCVUpload} disabled={analyzingCV} accept=".pdf,.doc,.docx,.jpg,.png,.txt" />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="glass-premium p-8 border-mcvill-accent/30">
                    <h4 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                      <Search size={16} /> Candidatos Postulados
                    </h4>
                    <div className="space-y-4">
                      {candidates.filter(c => c.vacancy_id === selectedVacancy.id).map(c => (
                        <div 
                          key={c.id} 
                          onClick={() => { setSelectedCandidate(c); setShowAnalysis(true); }}
                          className="p-6 rounded-2xl bg-slate-950/50 border border-mcvill-accent/30 flex items-center justify-between group hover:border-mcvill-accent/40 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-mcvill-accent/40 flex items-center justify-center text-xl font-black text-mcvill-accent">
                              {c.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-lg font-black text-white uppercase group-hover:text-mcvill-accent transition-colors">{c.name}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{c.status}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-700" />
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Score: {c.ai_score || 0}%</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-8">
                            <div className="text-center">
                              <p className={clsx(
                                "text-2xl font-black",
                                c.ai_score > 80 ? "text-emerald-400" : c.ai_score > 60 ? "text-mcvill-accent" : "text-amber-400"
                              )}>{c.ai_score || 0}%</p>
                              <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Score IA</p>
                            </div>
                            <button className="w-10 h-10 rounded-2xl bg-slate-900 border border-mcvill-accent/30 flex items-center justify-center text-slate-500 hover:text-white transition-all">
                              <ChevronRight size={20} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {candidates.filter(c => c.vacancy_id === selectedVacancy.id).length === 0 && (
                        <div className="py-20 text-center border-2 border-dashed border-mcvill-accent/30 rounded-2xl">
                          <UserPlus size={40} className="mx-auto mb-4 text-slate-800" />
                          <p className="text-slate-600 font-bold uppercase tracking-widest">Sin candidatos para esta vacante</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="glass-premium p-8 border-mcvill-accent/30">
                    <h4 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Detalles de Vacante</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[9px] font-black text-mcvill-accent uppercase mb-1">Estado</p>
                        <p className="text-white text-sm font-bold uppercase">{selectedVacancy.status}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-mcvill-accent uppercase mb-1">DescripciÃ³n</p>
                        <p className="text-slate-400 text-xs leading-relaxed">{selectedVacancy.description}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-mcvill-accent uppercase mb-1">Requisitos CrÃ­ticos</p>
                        <ul className="space-y-2 mt-2">
                          {selectedVacancy.requirements?.map((req, i) => (
                            <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                              <CheckCircle2 size={12} className="mt-0.5 text-mcvill-accent shrink-0" />
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal Nueva Vacante */}
      {isAddingVacancy && (
        <div className="fixed inset-0 lg:left-64 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsAddingVacancy(false)} />
          <div className="relative w-full max-w-4xl glass-premium p-10 border-mcvill-accent/30 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Nueva Vacante</h3>
                <p className="text-[10px] text-mcvill-accent font-black uppercase tracking-widest mt-1">ConfiguraciÃ³n de Requerimiento de Talento</p>
              </div>
              <button onClick={() => setIsAddingVacancy(false)} className="text-slate-500 hover:text-white">
                <XCircle size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Award size={16} className="text-mcvill-accent" />
                  <h4 className="text-[11px] font-black text-white uppercase tracking-widest">GuÃ­a de Perfiles RÃ¡pidos</h4>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {VACANCY_TEMPLATES.map((template, idx) => (
                    <div 
                      key={idx}
                      onClick={() => selectTemplate(template)}
                      className={clsx(
                        "p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group",
                        formValues.title === template.title 
                          ? "bg-mcvill-accent border-mcvill-accent text-slate-950" 
                          : "bg-slate-900/50 border-white/5 hover:border-mcvill-accent/50 text-slate-400"
                      )}
                    >
                      <h5 className={clsx(
                        "text-xs font-black uppercase mb-1",
                        formValues.title === template.title ? "text-slate-950" : "text-white"
                      )}>{template.title}</h5>
                      <p className={clsx(
                        "text-[9px] font-medium line-clamp-2",
                        formValues.title === template.title ? "text-slate-900" : "text-slate-500"
                      )}>{template.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2">
                <form onSubmit={handleCreateVacancy} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Briefcase size={12} /> TÃ­tulo del Puesto
                    </label>
                    <input
                      value={formValues.title}
                      onChange={(e) => setFormValues({ ...formValues, title: e.target.value })}
                      required
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-5 py-3.5 text-sm text-white focus:border-mcvill-accent outline-none"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <FileSearch size={12} /> DescripciÃ³n TÃ©cnica
                    </label>
                    <textarea
                      value={formValues.description}
                      onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                      required
                      rows={4}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-5 py-3.5 text-sm text-white focus:border-mcvill-accent resize-none outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck size={12} /> Requisitos CrÃ­ticos (uno por lÃ­nea)
                    </label>
                    <textarea
                      value={formValues.requirements}
                      onChange={(e) => setFormValues({ ...formValues, requirements: e.target.value })}
                      required
                      rows={5}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-5 py-3.5 text-[13px] text-white focus:border-mcvill-accent resize-none outline-none font-mono"
                    />
                  </div>

                  <div className="flex justify-end gap-4 pt-4">
                    <button type="submit" className="mcvill-btn-primary px-10 h-14 text-[11px] flex items-center gap-3">
                      <Plus size={18} /> Publicar Vacante Industrial
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Capturar Candidato */}
      {isAddingCandidate && (
        <div className="fixed inset-0 lg:left-64 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsAddingCandidate(false)} />
          <div className="relative w-full max-w-2xl glass-premium p-10 border-mcvill-accent/30 animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Captura de Talento</h3>
                <p className="text-[10px] text-mcvill-accent font-black uppercase tracking-widest mt-1">Ingreso al Repositorio de McVill</p>
              </div>
              <button onClick={() => setIsAddingCandidate(false)} className="text-slate-500 hover:text-white">
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleAddCandidate} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nombre Completo</label>
                  <input
                    value={candidateForm.name}
                    onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-5 py-3 text-sm text-white focus:border-mcvill-accent outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Email de Contacto</label>
                  <input
                    type="email"
                    value={candidateForm.email}
                    onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-5 py-3 text-sm text-white focus:border-mcvill-accent outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Extracto de CV o Perfil</label>
                <textarea
                  value={candidateForm.resume_text}
                  onChange={(e) => setCandidateForm({ ...candidateForm, resume_text: e.target.value })}
                  rows={4}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-5 py-4 text-xs text-white focus:border-mcvill-accent outline-none transition-all resize-none font-mono"
                  placeholder="Pega aquí el texto del CV..."
                />
              </div>

              <div className="flex items-center gap-4 py-2">
                <div className="h-px bg-white/5 flex-1"></div>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">O CARGA MASIVA INTELIGENTE</span>
                <div className="h-px bg-white/5 flex-1"></div>
              </div>

              {/* ZONA DE CARGA MASIVA */}
              <div className="w-full relative group">
                <div className="absolute inset-0 bg-emerald-500/10 rounded-xl blur-md group-hover:bg-emerald-500/20 transition-all"></div>
                <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-emerald-500/40 rounded-xl bg-slate-950/50 hover:bg-emerald-500/10 hover:border-emerald-500 transition-all cursor-pointer">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {analyzingCV ? <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" /> : <Upload className="w-8 h-8 text-emerald-400 mb-3 group-hover:-translate-y-1 transition-transform" />}
                    <p className="mb-1 text-sm text-emerald-400 font-bold tracking-tight">{analyzingCV ? 'Procesando Lote de CVs...' : 'Haz clic o arrastra múltiples CVs aquí'}</p>
                    <p className="text-[10px] text-emerald-500/70 font-black uppercase tracking-[0.2em] mt-1">Carga masiva inteligente (PDF, DOCX, TXT)</p>
                  </div>
                  <input type="file" className="hidden" multiple onChange={handleCVUpload} disabled={analyzingCV} accept=".pdf,.doc,.docx,.jpg,.png,.txt" />
                </label>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-white/5">
                <button type="submit" disabled={analyzingCV} className="mcvill-btn-primary px-8 h-12 text-[10px] flex items-center gap-2">
                  {analyzingCV ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  {analyzingCV ? 'Procesando IA...' : 'Guardar en Bolsa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal AnÃ¡lisis de Candidato */}
      {showAnalysis && selectedCandidate && (
        <div className="fixed inset-0 lg:left-64 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl" onClick={() => setShowAnalysis(false)} />
          <div className="relative w-full max-w-3xl glass-premium p-10 border-mcvill-accent/40 animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-mcvill-accent/30 flex items-center justify-center text-3xl font-black text-mcvill-accent">
                  {selectedCandidate.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tight">{selectedCandidate.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-[11px] font-black text-mcvill-accent uppercase tracking-widest">AnÃ¡lisis Neural Gemini 2.5</p>
                    <span className="w-1 h-1 rounded-full bg-slate-700" />
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                      {vacancies.find(v => v.id === selectedCandidate.vacancy_id)?.title || 'Talent Pool'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={clsx(
                  "text-5xl font-black",
                  selectedCandidate.ai_score > 80 ? "text-emerald-400" : selectedCandidate.ai_score > 60 ? "text-mcvill-accent" : "text-amber-400"
                )}>{selectedCandidate.ai_score || 0}%</p>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1">Compatibilidad</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <CheckCircle2 size={14} /> Fortalezas Clave
                  </h4>
                  <div className="space-y-2">
                    {(selectedCandidate.ai_analysis?.strengths || []).map((s: string, i: number) => (
                      <div key={i} className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-xs text-slate-300">
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <AlertCircle size={14} /> Ãreas de Oportunidad
                  </h4>
                  <div className="space-y-2">
                    {(selectedCandidate.ai_analysis?.weaknesses || []).map((w: string, i: number) => (
                      <div key={i} className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-xs text-slate-300">
                        {w}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-slate-900/50 border border-mcvill-accent/20 rounded-2xl">
                  <h4 className="text-[10px] font-black text-mcvill-accent uppercase tracking-widest mb-3">Veredicto IA</h4>
                  <p className="text-sm text-white font-bold mb-2 uppercase">{selectedCandidate.ai_analysis?.recommendation || 'Evaluando...'}</p>
                  <p className="text-xs text-slate-400 leading-relaxed italic">
                    "{selectedCandidate.ai_analysis?.justification || 'AnÃ¡lisis en proceso para determinar viabilidad tÃ©cnica y operativa en McVill Industrial.'}"
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {selectedCandidate.resume_url && (
                    <a 
                      href={selectedCandidate.resume_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full py-4 bg-slate-900 border border-white/10 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest text-center hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                      <FileText size={16} /> Ver CurrÃ­culum Original
                    </a>
                  )}
                  <button
                    onClick={() => exportCandidatePDF(selectedCandidate)}
                    className="w-full py-4 bg-slate-800 border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                  >
                    <FileDown size={14} /> Exportar PDF
                  </button>
                  <button
                    onClick={() => setShowAnalysis(false)}
                    className="w-full py-4 bg-mcvill-accent text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all"
                  >
                    Cerrar AnÃ¡lisis
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruitmentView;
