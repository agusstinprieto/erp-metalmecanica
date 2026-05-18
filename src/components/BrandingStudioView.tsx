import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Sparkles, 
  Copy, 
  Check, 
  Image as ImageIcon, 
  Layers, 
  Cpu, 
  Type, 
  BadgeAlert,
  UserPlus,
  FileText,
  Briefcase,
  Cake,
  Gift,
  Trophy,
  Award,
  Share2,
  Send,
  Calendar,
  Clock,
  Globe,
  CheckCircle,
  AlertCircle,
  Activity,
  Video
} from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import { useLanguage } from '../contexts/LanguageContext';
import { appAlert } from '../lib/dialogs';
import { tenantService } from '../services/tenantService';

// Custom Social Media SVG Icons for high-fidelity compliance
const Facebook: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const Linkedin: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const Instagram: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);


interface DesignConfig {
  itemType: 'logo' | 'business_card' | 'badge' | 'uniform' | 'web_banner';
  style: 'cyber_industrial' | 'minimalist' | 'neon_glow' | 'eco_steel';
  primaryColor: string;
  secondaryColor: string;
  keywords: string;
}

interface PromptPreset {
  title: string;
  prompt: string;
  imgUrl: string;
}

export function BrandingStudioView() {
  const { config } = useConfig();
  const { t } = useLanguage();

  // Branding Generator States
  const [design, setDesign] = useState<DesignConfig>({
    itemType: 'logo',
    style: 'cyber_industrial',
    primaryColor: '#0080ff',
    secondaryColor: '#10b981',
    keywords: 'premium metalmechanics, high-tech, laser precision, heavy machinery',
  });

  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'recruitment' | 'celebrations' | 'social_media' | 'gallery'>('editor');
  const [currentMockImage, setCurrentMockImage] = useState<string>('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop');

  // Recruitment Generator States
  const [selectedJob, setSelectedJob] = useState<string>('soldador');
  const [recruitmentTurno, setRecruitmentTurno] = useState<string>('rotativo');
  const [recruitmentSalary, setRecruitmentSalary] = useState<string>('$18,500 - $22,000 MXN');
  const [generatedAdText, setGeneratedAdText] = useState<string>('');
  const [generatedAdPrompt, setGeneratedAdPrompt] = useState<string>('');
  const [isGeneratingAd, setIsGeneratingAd] = useState<boolean>(false);
  const [copiedAdText, setCopiedAdText] = useState<boolean>(false);
  const [copiedAdPrompt, setCopiedAdPrompt] = useState<boolean>(false);

  // Celebrations States
  const [selectedCelebrationEmployee, setSelectedCelebrationEmployee] = useState<string>('pedro');
  const [celebrationType, setCelebrationType] = useState<string>('cumpleanos');
  const [celebrationStyle, setCelebrationStyle] = useState<string>('festivo');
  const [generatedCardText, setGeneratedCardText] = useState<string>('');
  const [generatedCardPrompt, setGeneratedCardPrompt] = useState<string>('');
  const [isGeneratingCard, setIsGeneratingCard] = useState<boolean>(false);
  const [copiedCardText, setCopiedCardText] = useState<boolean>(false);
  const [copiedCardPrompt, setCopiedCardPrompt] = useState<boolean>(false);

  // Social Media Hub States
  const [facebookConnected, setFacebookConnected] = useState<boolean>(false);
  const [linkedinConnected, setLinkedinConnected] = useState<boolean>(false);
  const [instagramConnected, setInstagramConnected] = useState<boolean>(false);
  const [tiktokConnected, setTiktokConnected] = useState<boolean>(false);
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);
  const [postText, setPostText] = useState<string>('');
  const [socialTone, setSocialTone] = useState<'original' | 'corporate' | 'friendly' | 'viral'>('original');
  const [originalPostText, setOriginalPostText] = useState<string>('');
  const [scheduleDate, setScheduleDate] = useState<string>('2026-05-19');
  const [scheduleTime, setScheduleTime] = useState<string>('09:00');
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishLogs, setPublishLogs] = useState<string[]>([]);
  const [publishSuccess, setPublishSuccess] = useState<boolean>(false);

  const jobsData: Record<string, { title: string; requirements: string[]; skills: string[]; image: string }> = {
    soldador: {
      title: 'Soldador de Alta Presión (TIG / MIG)',
      requirements: ['Certificación AWS o ASME vigente', 'Experiencia en acero A36 e Inoxidable 304', 'Lectura e interpretación de planos metalmecánicos', 'Uso riguroso de EPP y cumplimiento de normativas STPS'],
      skills: ['Soldadura GMAW/GTAW', 'Trazado de cortes', 'Biselado de precisión'],
      image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=600&auto=format&fit=crop'
    },
    cnc: {
      title: 'Operador CNC (Fresa y Torno)',
      requirements: ['Configuración y programación a pie de máquina (HAAS/Fanuc)', 'Uso de vernier, micrómetro y calibres', 'Experiencia mínima de 2 años en maquinado de piezas de precisión', 'Cumplimiento de orden y limpieza de planta'],
      skills: ['Control Fanuc/Haas', 'Velocidades de corte', 'Tolerancias geométricas'],
      image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=600&auto=format&fit=crop'
    },
    calidad: {
      title: 'Inspector de Control de Calidad',
      requirements: ['Conocimiento de normas ISO 9001:2015', 'Uso de CMM y brazos de medición portátiles', 'Generación de reportes de no conformidad e incidentes', 'Experiencia en inspección dimensional de piezas maquinadas'],
      skills: ['Metrología dimensional', 'Reportes de inspección', 'Control de no conformidades'],
      image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=600&auto=format&fit=crop'
    },
    supervisor: {
      title: 'Supervisor de Planta Metalmecánica',
      requirements: ['Ingeniería Industrial, Mecánica o afín', 'Experiencia liderando cuadrillas de soldadura y maquinado (15+ personas)', 'Control de plan de producción y entrega a tiempo', 'Garantizar seguridad industrial en toda el área'],
      skills: ['Liderazgo de cuadrillas', 'Planificación OTs', 'HSE y STPS compliance'],
      image: 'https://images.unsplash.com/photo-1541462608141-2f58c6e6850d?q=80&w=600&auto=format&fit=crop'
    }
  };

  const employeesData: Record<string, { name: string; role: string; department: string; years: number; image: string }> = {
    pedro: {
      name: 'Pedro Gómez',
      role: 'Soldador de Alta Presión TIG',
      department: 'Planta de Soldadura Especializada',
      years: 5,
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop'
    },
    sofia: {
      name: 'Sofía Rodríguez',
      role: 'Inspectora Senior de Calidad',
      department: 'Aseguramiento de Calidad STPS',
      years: 3,
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop'
    },
    carlos: {
      name: 'Ing. Carlos Mendoza',
      role: 'Gerente de Operaciones Metalmecánicas',
      department: 'Dirección Operativa',
      years: 8,
      image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop'
    },
    diana: {
      name: 'Diana Flores',
      role: 'Operadora CNC Programadora',
      department: 'Maquinados de Precisión CNC',
      years: 2,
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop'
    }
  };

  useEffect(() => {
    const fetchSocialConnections = async () => {
      try {
        const configData = await tenantService.getConfig();
        const fbOk = !!configData.facebook_page_token;
        const liOk = !!configData.linkedin_access_token && !!configData.linkedin_org_id;
        const igOk = !!configData.instagram_access_token && !!configData.instagram_business_id;
        const ttOk = !!configData.tiktok_access_token;

        setFacebookConnected(fbOk);
        setLinkedinConnected(liOk);
        setInstagramConnected(igOk);
        setTiktokConnected(ttOk);

        const activeNets: string[] = [];
        if (fbOk) activeNets.push('facebook');
        if (liOk) activeNets.push('linkedin');
        if (igOk) activeNets.push('instagram');
        if (ttOk) activeNets.push('tiktok');
        setSelectedNetworks(activeNets);
      } catch (err) {
        console.warn('Failed to load social connections from Supabase:', err);
      }
    };
    fetchSocialConnections();
  }, []);

  // Automatically load recruitment or celebration card text into the composer when changing tabs
  useEffect(() => {
    if (activeTab === 'social_media') {
      if (generatedAdText) {
        setPostText(generatedAdText);
        setOriginalPostText(generatedAdText);
      } else if (generatedCardText) {
        setPostText(generatedCardText);
        setOriginalPostText(generatedCardText);
      } else {
        setPostText(`¡Hola desde la planta digital inteligente de ${config.brandName || 'McVill'}! Desarrollando ingeniería de alta precisión con tecnología 4.0. 🛠️🤖⚡ #SmartFactory #Metalmecanica`);
        setOriginalPostText(`¡Hola desde la planta digital inteligente de ${config.brandName || 'McVill'}! Desarrollando ingeniería de alta precisión con tecnología 4.0. 🛠️🤖⚡ #SmartFactory #Metalmecanica`);
      }
      setSocialTone('original');
    }
  }, [activeTab]);

  // Adjust Post copy tone with high fidelity AI Simulation
  useEffect(() => {
    if (socialTone === 'original') {
      setPostText(originalPostText);
    } else if (socialTone === 'corporate') {
      // Professional corporate tone adjustment
      setPostText(
        `📝 [COMUNICADO CORPORATIVO - ${config.brandName?.toUpperCase() || 'MCVILL'}]\n` +
        `Nos complace anunciar el desarrollo de nuevos hitos de capital humano e innovación industrial en nuestra organización.\n\n` +
        originalPostText.replace(/🔥|🎉|💼|💰|⏰|👉|✅|🛠️|🎁|➕|🚀|🏆|🎖️|📦|⭐|💪|⚡/g, '▪️') +
        `\n\nAtentamente,\nDirección de Operaciones e Ingeniería.`
      );
    } else if (socialTone === 'friendly') {
      // Warm, engaging community tone
      setPostText(
        `👋😊 ¡Hola, gran comunidad! Qué gusto saludarlos hoy.\n` +
        `Queremos compartir con todos ustedes una excelente noticia directamente desde el corazón de nuestra planta. ❤️🏭\n\n` +
        originalPostText +
        `\n\n¡Sigamos construyendo juntos el mejor ambiente de trabajo! Déjanos tus felicitaciones en los comentarios. 👇✨`
      );
    } else if (socialTone === 'viral') {
      // Modern interactive social tone with trending hashtags
      setPostText(
        `🚀 TRABAJO INTELIGENTE, FUTURO ASEGURADO 🚀\n` +
        `¿Listo para el siguiente nivel de ingeniería? Miren lo que está sucediendo en nuestra planta 4.0: 👇🤩\n\n` +
        originalPostText +
        `\n\n📌 #SmartFactory #Industria40 #Metalmecanica #Queretaro #CNCOperator #AWSWelding #TeamMcVill #GrowthMindset #ViralChallenge`
      );
    }
  }, [socialTone]);

  const generatePromptText = (cfg: DesignConfig): string => {
    const brand = config.brandName || 'McVill';
    const baseKeywords = cfg.keywords ? `, ${cfg.keywords}` : '';
    const colors = `incorporating a color scheme of ${cfg.primaryColor} and ${cfg.secondaryColor}`;
    
    switch (cfg.itemType) {
      case 'logo':
        return `Ultra-premium corporate logo for "${brand}" industrial group, style: ${cfg.style.replace('_', ' ')}${baseKeywords}, ${colors}, vector graphic, clean steel metallic texture, glowing ambient edge borders, dark premium slate background, 8k resolution, cinematic lighting, photorealistic rendering, sleek high-tech engineering concept, suitable for printing --v 6.0`;
      case 'business_card':
        return `High-end minimalist business card design mock-up front and back for "${brand}" heavy industry, themed: ${cfg.style.replace('_', ' ')}${baseKeywords}, using ${colors}, elegant layout, matte dark charcoal paper texture, glossy embossed silver lettering, micro-metallic bevels, professional product photography display, isolated view, depth of field --ar 16:9 --v 6.0`;
      case 'badge':
        return `Futuristic corporate employee identity smart badge for "${brand}" smart factory, style: ${cfg.style.replace('_', ' ')}${baseKeywords}, ${colors}, built-in transparent glassmorphic acrylic screen, integrated circuit telemetry traces, glowing QR code module, steel frame clasp, secure high-tech design, detailed industrial design rendering --v 6.0`;
      case 'uniform':
        return `Smart factory worker EPP uniform concept, including high-visibility safety vest, carbon fiber hard hat, and protective shirt with "${brand}" logo neatly printed on left chest, style: ${cfg.style.replace('_', ' ')}${baseKeywords}, colors: ${colors}, photorealistic material presentation, tactical industrial design, premium heavy duty safety gears --ar 4:3 --v 6.0`;
      case 'web_banner':
        return `Hero web header banner for "${brand}" metalmechanics division, depicting clean robotic CNC lathe arms cutting heavy steel parts with glowing laser sparks, style: ${cfg.style.replace('_', ' ')}${baseKeywords}, primary color palette ${cfg.primaryColor}, majestic industrial perspective, high contrast glassmorphic overlay space, wide layout suitable for landing page --ar 21:9 --v 6.0`;
      default:
        return '';
    }
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const prompt = generatePromptText(design);
      setGeneratedPrompt(prompt);
      
      const mockImages: Record<DesignConfig['itemType'], string> = {
        logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
        business_card: 'https://images.unsplash.com/photo-1541462608141-2f58c6e6850d?q=80&w=600&auto=format&fit=crop',
        badge: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=600&auto=format&fit=crop',
        uniform: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=600&auto=format&fit=crop',
        web_banner: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=600&auto=format&fit=crop'
      };
      
      setCurrentMockImage(mockImages[design.itemType]);
      setIsGenerating(false);
    }, 1200);
  };

  const handleCopyPrompt = () => {
    if (!generatedPrompt) return;
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // AI Recruitment Ad Generator Logic
  const handleGenerateAd = () => {
    setIsGeneratingAd(true);
    setTimeout(() => {
      const job = jobsData[selectedJob];
      const brand = config.brandName || 'McVill';
      
      const text = `🔥 ¡ÚNETE AL EQUIPO LÍDER EN METALMECÁNICA! 🔥\n` +
        `En ${brand} S.A. de C.V. estamos expandiendo operaciones y buscamos el mejor talento para nuestra planta industrial.\n\n` +
        `💼 Puesto: ${job.title}\n` +
        `📍 Ubicación: Zona Industrial, Querétaro\n` +
        `💰 Sueldo: ${recruitmentSalary} Mensuales (Pago Semanal Libre) + Bonos de Desempeño\n` +
        `⏰ Horario: Turno ${recruitmentTurno.charAt(0).toUpperCase() + recruitmentTurno.slice(1)}\n\n` +
        `👉 REQUISITOS CLAVE:\n` +
        job.requirements.map(req => `  ✅ ${req}`).join('\n') + `\n\n` +
        `👉 HABILIDADES TÉCNICAS:\n` +
        job.skills.map(skill => `  🛠️ ${skill}`).join('\n') + `\n\n` +
        `🎁 BENEFICIOS ADICIONALES:\n` +
        `  ➕ Prestaciones superiores de Ley desde el primer día\n` +
        `  ➕ Caja de ahorro y vales de despensa mensuales\n` +
        `  ➕ Uniformes con EPP Premium (Casco de fibra de carbono, botas dielectricas)\n` +
        `  ➕ Capacitación constante bajo el estándar "Smart Factory"\n\n` +
        `¡Aplica hoy mismo! Envía tu CV o solicitud al correo: reclutamiento@mcvill.com.mx con el asunto "${job.title}" o preséntate directamente en las oficinas de planta. ¡Te estamos esperando! 🚀`;

      const prompt = `Premium high-tech corporate hiring poster graphic for "${brand}" heavy metalmechanics group, featuring a professional portrait photo of a highly skilled ${job.title.toLowerCase()} inside a state-of-the-art automated manufacturing factory, volumetric blue laser lighting and metallic steel sparks fly around, neat layout with empty glassmorphic dark container on the left side for social media text overlay, ultra-realistic cinematic render --ar 16:9 --v 6.0`;

      setGeneratedAdText(text);
      setGeneratedAdPrompt(prompt);
      setIsGeneratingAd(false);
      appAlert('Anuncio de reclutamiento y prompt de banner formulados con éxito por el motor de IA.', 'Anuncio Generado');
    }, 1200);
  };

  const handleCopyAdText = () => {
    if (!generatedAdText) return;
    navigator.clipboard.writeText(generatedAdText);
    setCopiedAdText(true);
    setTimeout(() => setCopiedAdText(false), 2000);
  };

  const handleCopyAdPrompt = () => {
    if (!generatedAdPrompt) return;
    navigator.clipboard.writeText(generatedAdPrompt);
    setCopiedAdPrompt(true);
    setTimeout(() => setCopiedAdPrompt(false), 2000);
  };

  // AI Celebration Card Generator Logic
  const handleGenerateCard = () => {
    setIsGeneratingCard(true);
    setTimeout(() => {
      const emp = employeesData[selectedCelebrationEmployee];
      const brand = config.brandName || 'McVill';

      let text = '';
      let promptSubject = '';

      if (celebrationType === 'cumpleanos') {
        text = `🎉 ¡FELIZ CUMPLEANOS A NUESTRO VALIOSO COLABORADOR! 🎉\n` +
          `Hoy celebramos la vida y la trayectoria de ${emp.name}, quien labora con total dedicación como ${emp.role} en el departamento de ${emp.department}.\n\n` +
          `De parte de toda la junta directiva y compañeros en ${brand}, queremos desearte un día maravilloso, lleno de salud, éxito y la calidez de tu familia. ¡Gracias por forjar la grandeza de nuestra planta con tu incansable esfuerzo diario! 🎂🛠️🔥`;
        promptSubject = `happy birthday celebration theme with micro-sparklers and warm golden ambient lighting`;
      } else if (celebrationType === 'aniversario') {
        text = `🏆 ¡FELICITACIONES POR TU ANIVERSARIO DE LEALTAD EN ${brand}! 🏆\n` +
          `Celebramos con inmenso orgullo el cumplimiento de ${emp.years} Años de servicio ininterrumpidos de nuestro compañero ${emp.name}, desempeñándose como ${emp.role} en ${emp.department}.\n\n` +
          `Tu perseverancia, talento y rigor técnico han sido pilares clave para los estándares de calidad de nuestra industria. ¡Gracias por estos ${emp.years} años soldando el éxito común! ¡Que sigan las grandes metas! 🎖️🚀📦`;
        promptSubject = `glorious industrial work anniversary milestone, polished silver shield and carbon fiber backdrop with volumetric gold particle sparks`;
      } else {
        text = `⭐ ¡MÁXIMO RECONOCIMIENTO: EMPLEADO DEL MES EN ${brand}! ⭐\n` +
          `Extendemos una calurosa felicitación pública a ${emp.name}, ${emp.role} en ${emp.department}, seleccionado como el Empleado del Mes.\n\n` +
          `Este honor destaca tu excelente desempeño, tu iniciativa para resolver retos de producción y tu impecable liderazgo en seguridad de planta. ¡Eres un orgullo e inspiración para todo el equipo de ${brand}! 🏅💪⚡`;
        promptSubject = `outstanding worker of the month award banner, neon cyan laser trophy emblem engraved with high-tech steel framing`;
      }

      const prompt = `Luxurious high-tech employee greeting card flyer background for "${brand}" heavy industry, themed: ${promptSubject}, featuring empty clean glassmorphic overlay card container in the center for emotional text placement, glowing neon accents, sharp high-fidelity corporate digital art, photorealistic industrial design presentation --ar 16:9 --v 6.0`;

      setGeneratedCardText(text);
      setGeneratedCardPrompt(prompt);
      setIsGeneratingCard(false);
      appAlert('Mensaje conmemorativo y prompt de tarjeta de felicitación formulados con éxito por la IA.', 'Felicitación Formulada');
    }, 1200);
  };

  const handleCopyCardText = () => {
    if (!generatedCardText) return;
    navigator.clipboard.writeText(generatedCardText);
    setCopiedCardText(true);
    setTimeout(() => setCopiedCardText(false), 2000);
  };

  const handleCopyCardPrompt = () => {
    if (!generatedCardPrompt) return;
    navigator.clipboard.writeText(generatedCardPrompt);
    setCopiedCardPrompt(true);
    setTimeout(() => setCopiedCardPrompt(false), 2000);
  };

  // Toggle Social Network Selection
  const handleToggleNetwork = (network: string) => {
    if (selectedNetworks.includes(network)) {
      setSelectedNetworks(prev => prev.filter(n => n !== network));
    } else {
      setSelectedNetworks(prev => [...prev, network]);
    }
  };

  // Simulated Social Media Direct Publisher API
  const handlePublishNow = () => {
    if (selectedNetworks.length === 0) {
      appAlert('Por favor, seleccione al menos una red social activa para publicar.', 'Sin Destinos');
      return;
    }
    
    setIsPublishing(true);
    setPublishSuccess(false);
    setPublishLogs([]);

    const logMessages = [
      '🔍 [VALIDATION] Verificando tokens de acceso OAuth2...',
      '🔗 [CONNECTION] Estableciendo canal seguro HTTPS con APIs de Meta & LinkedIn...',
      '📁 [MEDIA] Cargando archivo multimedia e imagen fotorrealista a CDN de almacenamiento...',
      '🛠️ [PROCESS] Procesando redacción con motor de optimización de texto de McVill...',
      '🚀 [TRANSMITTING] Enviando payload enriquecido a nodos de publicación remotos...',
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < logMessages.length) {
        setPublishLogs(prev => [...prev, logMessages[currentStep]]);
        currentStep++;
      } else {
        clearInterval(interval);
        
        // Formulating network-specific success logs
        const networkLogs = selectedNetworks.map(net => {
          const randId = Math.floor(100000 + Math.random() * 900000);
          return `✅ [SUCCESS] ¡Publicado con éxito en ${net.toUpperCase()}! (ID OT: ${net}_post_${randId})`;
        });

        setPublishLogs(prev => [...prev, ...networkLogs, '🎉 [COMPLETE] ¡Transmisión terminada con 100% de efectividad!']);
        setIsPublishing(false);
        setPublishSuccess(true);
        appAlert('La información ha sido transmitida y publicada directamente en las redes seleccionadas.', 'Publicación Exitosa');
      }
    }, 800);
  };

  const handleSchedulePost = () => {
    appAlert(`Publicación programada correctamente para el día ${scheduleDate} a las ${scheduleTime} hrs de forma automática a través del despachador en la base de datos.`, 'Programación Exitosa');
  };

  const galleryPresets: PromptPreset[] = [
    {
      title: 'Logo Cyber-Industrial',
      prompt: 'Sleek geometric logo for McVill S.A. de C.V., heavy industrial steel manufacturer, sharp bevels, deep slate-950 background, glowing cyan neon borders, vector, photorealistic render.',
      imgUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300&auto=format&fit=crop'
    },
    {
      title: 'Gafete Planta Automotriz',
      prompt: 'Identity card for McVill automotive engineering cell, integrated microchip details, semi-transparent plastic cover, high contrast blue text, secure magnetic strip, premium industrial layout.',
      imgUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=300&auto=format&fit=crop'
    },
    {
      title: 'Uniforme EPP Premium',
      prompt: 'HSE engineer smart uniform with safety vest, McVill logo embroidered, carbon-knit gloves, carbon fiber protective helmet, high-visibility orange detailing, extreme realism.',
      imgUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=300&auto=format&fit=crop'
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-mcvill-accent/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-mcvill-accent/10 border border-mcvill-accent/30 text-mcvill-accent text-[8px] font-black tracking-widest uppercase">
              Branding & Marketing IA
            </span>
          </div>
          <h2 className="text-xl font-bold uppercase tracking-tight text-white mt-1.5 flex items-center gap-2.5">
            <Palette className="text-mcvill-accent" size={22} />
            Estudio de Branding e Identidad por IA
          </h2>
          <p className="text-xs text-mcvill-text-muted mt-1">
            Genere prompts de marca, modifique estilos visuales, formule anuncios, tarjetas de felicitación y publique directamente en las redes sociales de McVill.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-900 border border-white/5 rounded-2xl shrink-0">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              activeTab === 'editor' 
                ? 'bg-mcvill-accent text-slate-950 shadow-[0_0_10px_rgba(0,128,255,0.3)]' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Branding
          </button>
          <button
            onClick={() => setActiveTab('recruitment')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              activeTab === 'recruitment' 
                ? 'bg-mcvill-accent text-slate-950 shadow-[0_0_10px_rgba(0,128,255,0.3)]' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Reclutamiento IA
          </button>
          <button
            onClick={() => setActiveTab('celebrations')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              activeTab === 'celebrations' 
                ? 'bg-mcvill-accent text-slate-950 shadow-[0_0_10px_rgba(0,128,255,0.3)]' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Felicitaciones
          </button>
          <button
            onClick={() => setActiveTab('social_media')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === 'social_media' 
                ? 'bg-mcvill-accent text-slate-950 shadow-[0_0_10px_rgba(0,128,255,0.3)]' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Share2 size={12} />
            Gestión Redes
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              activeTab === 'gallery' 
                ? 'bg-mcvill-accent text-slate-950 shadow-[0_0_10px_rgba(0,128,255,0.3)]' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Preajustes
          </button>
        </div>
      </div>

      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1: Config Parameters */}
          <div className="border border-mcvill-card-border/30 bg-slate-950/20 backdrop-blur rounded-3xl p-6 shadow-xl space-y-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-300 border-b border-white/5 pb-3">
              Configurador de Branding
            </h3>

            <div className="space-y-4">
              
              {/* Item Type selection */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">¿Qué desea diseñar?</label>
                <select
                  value={design.itemType}
                  onChange={e => setDesign(prev => ({ ...prev, itemType: e.target.value as any }))}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-mcvill-accent"
                >
                  <option value="logo">Logotipos Corporativos Alternos</option>
                  <option value="business_card">Tarjetas de Presentación Ejecutivas</option>
                  <option value="badge">Gafetes Inteligentes de Planta</option>
                  <option value="uniform">Uniformes & EPP de Operadores</option>
                  <option value="web_banner">Banners Promocionales / Web</option>
                </select>
              </div>

              {/* Style selection */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Estilo Estético</label>
                <select
                  value={design.style}
                  onChange={e => setDesign(prev => ({ ...prev, style: e.target.value as any }))}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-mcvill-accent"
                >
                  <option value="cyber_industrial">Cyber-Industrial / High-Tech</option>
                  <option value="minimalist">Moderno Minimalista (Sleek)</option>
                  <option value="neon_glow">Luminescence & Neon Glow</option>
                  <option value="eco_steel">Eco-Steel / Sostenible</option>
                </select>
              </div>

              {/* Palette Customizer */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Color Principal</label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="color" 
                      value={design.primaryColor}
                      onChange={e => setDesign(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-8 h-8 rounded-lg border-0 bg-transparent cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-slate-300 font-bold">{design.primaryColor}</span>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Color Secundario</label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="color" 
                      value={design.secondaryColor}
                      onChange={e => setDesign(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      className="w-8 h-8 rounded-lg border-0 bg-transparent cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-slate-300 font-bold">{design.secondaryColor}</span>
                  </div>
                </div>
              </div>

              {/* Keywords */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Concepto de Diseño / Palabras Clave</label>
                <textarea
                  value={design.keywords}
                  onChange={e => setDesign(prev => ({ ...prev, keywords: e.target.value }))}
                  rows={3}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-mcvill-accent resize-none placeholder:text-slate-600"
                  placeholder="Ej: metalmechanics, precision laser cutting, robust carbon fiber..."
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-3.5 bg-mcvill-accent hover:bg-mcvill-accent/90 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_20px_rgba(0,128,255,0.2)] flex items-center justify-center gap-2"
              >
                <Sparkles size={14} className={isGenerating ? 'animate-spin' : ''} />
                {isGenerating ? 'Calculando Prompt...' : 'Generar Concepto & Prompt'}
              </button>
            </div>
          </div>

          {/* Columns 2 & 3: Results, Text Prompt & Image Mockup */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Prompt Result Panel */}
            <div className="border border-mcvill-card-border/30 bg-slate-950/40 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <Type size={12} className="text-mcvill-accent" />
                  Prompt Optimizado para Motores de IA
                </span>
                
                {generatedPrompt && (
                  <button
                    onClick={handleCopyPrompt}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all ${
                      copied 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {copied ? <Check size={10} /> : <Copy size={10} />}
                    {copied ? 'Copiado!' : 'Copiar Prompt'}
                  </button>
                )}
              </div>

              {generatedPrompt ? (
                <div className="bg-slate-950 border border-white/5 p-4 rounded-2xl font-mono text-[11px] leading-relaxed text-slate-300 select-all max-h-[140px] overflow-y-auto custom-scrollbar">
                  {generatedPrompt}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-950/20 border border-dashed border-white/5 rounded-2xl">
                  <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">Haga clic en "Generar Concepto" para formular el prompt</p>
                </div>
              )}
            </div>

            {/* Generated Design Mockup Screen */}
            <div className="border border-mcvill-card-border/30 bg-slate-950/20 backdrop-blur rounded-3xl p-6 shadow-xl flex-1 flex flex-col min-h-[300px]">
              <div className="flex justify-between items-center border-b border-white/5 pb-3.5 shrink-0">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
                  <ImageIcon size={14} className="text-mcvill-accent" />
                  Previsualización de Branding de McVill
                </h3>
              </div>

              <div className="flex-1 flex flex-col md:flex-row gap-6 mt-5 items-center">
                
                {/* Mockup Canvas Screen */}
                <div className="w-full md:w-1/2 aspect-square rounded-2xl border border-white/10 bg-slate-950 overflow-hidden relative group">
                  <img 
                    src={currentMockImage} 
                    alt="AI Branding Mockup" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent flex items-end p-4">
                    <div>
                      <span className="text-[8px] font-black text-mcvill-accent uppercase tracking-widest">McVill Digital Mockup</span>
                      <h4 className="text-[11px] font-black text-white uppercase tracking-wider mt-0.5">Diseño Generado en Alta Definición</h4>
                    </div>
                  </div>
                </div>

                {/* Technical Specs HUD */}
                <div className="w-full md:w-1/2 space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Ficha Técnica del Diseño</h4>
                  
                  <div className="space-y-2.5">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Dimensiones</span>
                      <p className="text-[10px] font-black text-white mt-0.5 font-mono">3000 x 3000 PX (Vectorizable)</p>
                    </div>
                    
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Ajuste de Paleta</span>
                      <div className="flex gap-2 mt-1">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: design.primaryColor }} />
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: design.secondaryColor }} />
                        <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider font-mono">RGB Match OK</span>
                      </div>
                    </div>

                    <div className="bg-blue-500/5 border border-blue-500/10 p-3 rounded-xl flex gap-2 items-start">
                      <BadgeAlert size={12} className="text-mcvill-accent shrink-0 mt-0.5" />
                      <p className="text-[9px] text-slate-400 leading-normal">
                        Este generador produce <strong>prompts técnicos optimizados</strong>. Puede utilizarlos directamente en plataformas avanzadas como Midjourney o Stable Diffusion para obtener resultados de imprenta profesional exactos.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* Recruitment IA View (AI Job Ad Creator) */}
      {activeTab === 'recruitment' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Config Position */}
          <div className="border border-mcvill-card-border/30 bg-slate-950/20 backdrop-blur rounded-3xl p-6 shadow-xl space-y-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-300 border-b border-white/5 pb-3 flex items-center gap-2">
              <Briefcase size={14} className="text-mcvill-accent" />
              Parámetros de Reclutamiento
            </h3>

            <div className="space-y-4">
              
              {/* Job selection representing dynamic DB-loaded list */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Vacante Activa (Catálogo DB)</label>
                <select
                  value={selectedJob}
                  onChange={e => {
                    setSelectedJob(e.target.value);
                    setGeneratedAdText('');
                    setGeneratedAdPrompt('');
                  }}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-mcvill-accent"
                >
                  <option value="soldador">Soldador de Alta Presión (TIG / MIG)</option>
                  <option value="cnc">Operador CNC - Torno y Fresa</option>
                  <option value="calidad">Técnico de Control de Calidad</option>
                  <option value="supervisor">Supervisor de Planta Metalmecánica</option>
                </select>
              </div>

              {/* Turno selection */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Turno en Planta</label>
                <select
                  value={recruitmentTurno}
                  onChange={e => setRecruitmentTurno(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-mcvill-accent"
                >
                  <option value="matutino (06:00 - 14:00)">Matutino Fijo</option>
                  <option value="vespertino (14:00 - 22:00)">Vespertino Fijo</option>
                  <option value="nocturno (22:00 - 06:00)">Nocturno Fijo</option>
                  <option value="rotativo (rol de 3 turnos)">Rol de Turnos Semanal</option>
                </select>
              </div>

              {/* Salary selection */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Sueldo Ofrecido (Bruto/Neto)</label>
                <input
                  type="text"
                  value={recruitmentSalary}
                  onChange={e => setRecruitmentSalary(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-mcvill-accent"
                  placeholder="Ej: $18,500 MXN mensuales"
                />
              </div>

              {/* Load requirements preview */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2.5">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Requisitos en BD (Pre-cargados)</span>
                <ul className="space-y-1.5">
                  {jobsData[selectedJob].requirements.map((req, idx) => (
                    <li key={idx} className="text-[10px] text-slate-300 font-bold leading-normal flex items-start gap-1.5">
                      <span className="text-mcvill-accent shrink-0 mt-0.5">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerateAd}
                disabled={isGeneratingAd}
                className="w-full py-3.5 bg-mcvill-accent hover:bg-mcvill-accent/90 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_20px_rgba(0,128,255,0.2)] flex items-center justify-center gap-2"
              >
                <UserPlus size={14} className={isGeneratingAd ? 'animate-spin' : ''} />
                {isGeneratingAd ? 'Procesando Anuncio...' : 'Redactar Anuncio con IA'}
              </button>

            </div>
          </div>

          {/* Columns 2 & 3: Outputs */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Generated Job Ad text */}
            <div className="border border-mcvill-card-border/30 bg-slate-950/40 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <FileText size={12} className="text-mcvill-accent" />
                  Copia de Anuncio de Reclutamiento (Redes / LinkedIn)
                </span>
                
                {generatedAdText && (
                  <button
                    onClick={handleCopyAdText}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all ${
                      copiedAdText 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {copiedAdText ? <Check size={10} /> : <Copy size={10} />}
                    {copiedAdText ? 'Copiado!' : 'Copiar Texto del Anuncio'}
                  </button>
                )}
              </div>

              {generatedAdText ? (
                <div className="bg-slate-950 border border-white/5 p-4 rounded-2xl font-mono text-[10px] leading-relaxed text-slate-300 select-all max-h-[220px] overflow-y-auto custom-scrollbar whitespace-pre-line">
                  {generatedAdText}
                </div>
              ) : (
                <div className="p-12 text-center bg-slate-950/20 border border-dashed border-white/5 rounded-2xl">
                  <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">Formule el anuncio para generar la redacción persuasiva de redes sociales</p>
                </div>
              )}
            </div>

            {/* Generated Recruiting Banner Prompt */}
            {generatedAdPrompt && (
              <div className="border border-mcvill-card-border/30 bg-slate-950/20 backdrop-blur rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <ImageIcon size={12} className="text-mcvill-accent" />
                    Prompt del Banner Visual de Reclutamiento (Midjourney)
                  </span>
                  
                  <button
                    onClick={handleCopyAdPrompt}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all ${
                      copiedAdPrompt 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {copiedAdPrompt ? <Check size={10} /> : <Copy size={10} />}
                    {copiedAdPrompt ? 'Copiado!' : 'Copiar Prompt del Banner'}
                  </button>
                </div>

                <div className="bg-slate-950 border border-white/5 p-3.5 rounded-2xl font-mono text-[10px] leading-relaxed text-slate-400 select-all">
                  {generatedAdPrompt}
                </div>

                <div className="mt-2 flex gap-4 items-center">
                  <div className="w-24 h-16 rounded-xl border border-white/10 overflow-hidden bg-slate-900 shrink-0">
                    <img src={jobsData[selectedJob].image} alt="Hiring Preview" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-mcvill-accent uppercase tracking-widest block">Recruiting Graphic Preview</span>
                    <p className="text-[10px] text-slate-400 font-bold leading-normal mt-0.5">
                      Copie el prompt y genere el banner visual con un render fotorrealista para complementar la publicación de Facebook o LinkedIn.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Birthday & Anniversary / Celebrations Tab */}
      {activeTab === 'celebrations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Config Employee & Celebration parameters */}
          <div className="border border-mcvill-card-border/30 bg-slate-950/20 backdrop-blur rounded-3xl p-6 shadow-xl space-y-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-300 border-b border-white/5 pb-3 flex items-center gap-2">
              <Gift size={14} className="text-mcvill-accent" />
              Celebraciones de Planta
            </h3>

            <div className="space-y-4">
              
              {/* Employee Selector from simulated DB */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Colaborador en Catálogo DB</label>
                <select
                  value={selectedCelebrationEmployee}
                  onChange={e => {
                    setSelectedCelebrationEmployee(e.target.value);
                    setGeneratedCardText('');
                    setGeneratedCardPrompt('');
                  }}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-mcvill-accent"
                >
                  {Object.entries(employeesData).map(([key, emp]) => (
                    <option key={key} value={key}>{emp.name} ({emp.role})</option>
                  ))}
                </select>
              </div>

              {/* Celebration Type */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Motivo de Felicitación</label>
                <select
                  value={celebrationType}
                  onChange={e => setCelebrationType(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-mcvill-accent"
                >
                  <option value="cumpleanos">🎉 Feliz Cumpleaños del Empleado</option>
                  <option value="aniversario">🏆 Aniversario Laboral (Lealtad en Planta)</option>
                  <option value="reconocimiento">⭐ Empleado del Mes (Desempeño OK)</option>
                </select>
              </div>

              {/* Card Style */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Estilo / Tono del Arte</label>
                <select
                  value={celebrationStyle}
                  onChange={e => setCelebrationStyle(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-mcvill-accent"
                >
                  <option value="festivo">Festivo Cyber-Industrial (Chispas de soldadura + Confeti)</option>
                  <option value="elegante">Premium Ejecutivo (Carbono pulido + Oro cepillado)</option>
                  <option value="minimalista">Minimalista Moderno (Vidrio esmerilado + Neon)</option>
                </select>
              </div>

              {/* Employee Preview Box */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex gap-3.5 items-center">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                  <img src={employeesData[selectedCelebrationEmployee].image} alt="Colaborador" className="w-full h-full object-cover" />
                </div>
                <div>
                  <span className="text-[8px] font-black text-mcvill-accent uppercase tracking-widest">Ficha de RH</span>
                  <h4 className="text-[11px] font-black text-white uppercase tracking-wider mt-0.5">
                    {employeesData[selectedCelebrationEmployee].name}
                  </h4>
                  <p className="text-[9px] text-slate-400 font-bold leading-normal">
                    {employeesData[selectedCelebrationEmployee].department} ({employeesData[selectedCelebrationEmployee].years} años de antigüedad)
                  </p>
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerateCard}
                disabled={isGeneratingCard}
                className="w-full py-3.5 bg-mcvill-accent hover:bg-mcvill-accent/90 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_20px_rgba(0,128,255,0.2)] flex items-center justify-center gap-2"
              >
                <Award size={14} className={isGeneratingCard ? 'animate-spin' : ''} />
                {isGeneratingCard ? 'Redactando Felicitación...' : 'Formular Mensaje & Prompt'}
              </button>

            </div>
          </div>

          {/* Columns 2 & 3: Outputs */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Generated Celebration Card message */}
            <div className="border border-mcvill-card-border/30 bg-slate-950/40 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <Cake size={12} className="text-mcvill-accent" />
                  Mensaje Redactado por IA (Para Cartelera o WhatsApp)
                </span>
                
                {generatedCardText && (
                  <button
                    onClick={handleCopyCardText}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all ${
                      copiedCardText 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {copiedCardText ? <Check size={10} /> : <Copy size={10} />}
                    {copiedCardText ? 'Copiado!' : 'Copiar Felicitación'}
                  </button>
                )}
              </div>

              {generatedCardText ? (
                <div className="bg-slate-950 border border-white/5 p-4 rounded-2xl font-mono text-[10px] leading-relaxed text-slate-300 select-all max-h-[160px] overflow-y-auto custom-scrollbar whitespace-pre-line">
                  {generatedCardText}
                </div>
              ) : (
                <div className="p-12 text-center bg-slate-950/20 border border-dashed border-white/5 rounded-2xl">
                  <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">Configure los parámetros para generar una emotiva carta o mensaje de felicitación de planta</p>
                </div>
              )}
            </div>

            {/* Generated Card Prompt */}
            {generatedCardPrompt && (
              <div className="border border-mcvill-card-border/30 bg-slate-950/20 backdrop-blur rounded-3xl p-6 shadow-xl space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                      <ImageIcon size={12} className="text-mcvill-accent" />
                      Prompt de la Tarjeta Gráfica de Felicitación (Midjourney / DALL-E)
                    </span>
                    
                    <button
                      onClick={handleCopyCardPrompt}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all ${
                        copiedCardPrompt 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {copiedCardPrompt ? <Check size={10} /> : <Copy size={10} />}
                      {copiedCardPrompt ? 'Copiado!' : 'Copiar Prompt del Arte'}
                    </button>
                  </div>

                  <div className="bg-slate-950 border border-white/5 p-3.5 rounded-2xl font-mono text-[10px] leading-relaxed text-slate-400 select-all mt-4">
                    {generatedCardPrompt}
                  </div>
                </div>

                <div className="mt-5 border border-mcvill-accent/20 bg-slate-950/80 rounded-2xl p-4 relative overflow-hidden flex flex-col md:flex-row gap-4 items-center shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-r from-mcvill-accent/5 to-transparent pointer-events-none" />
                  <div className="w-24 h-16 rounded-xl overflow-hidden bg-slate-900 border border-white/5 relative shrink-0">
                    <img src={employeesData[selectedCelebrationEmployee].image} alt="Hiring Preview" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-mcvill-accent uppercase tracking-widest block">Celebration Card Visual Composition</span>
                    <h4 className="text-[10px] font-black text-white uppercase tracking-wider mt-0.5">Diseño Conmemorativo con IA</h4>
                    <p className="text-[9px] text-slate-400 leading-normal mt-0.5">
                      Esta composición fusiona el retrato de {employeesData[selectedCelebrationEmployee].name} con un marco digital conmemorativo de {celebrationStyle === 'festivo' ? 'chispas industriales festivas' : celebrationStyle === 'elegante' ? 'carbono pulido y oro ejecutivo' : 'neon minimalista'}.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Social Media Hub Tab */}
      {activeTab === 'social_media' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1: Connected Accounts and Schedulers */}
          <div className="border border-mcvill-card-border/30 bg-slate-950/20 backdrop-blur rounded-3xl p-6 shadow-xl space-y-5">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-300 border-b border-white/5 pb-3 flex items-center gap-2">
                <Globe size={14} className="text-mcvill-accent" />
                Redes Vinculadas
              </h3>
              
              <div className="space-y-3 mt-4">
                
                {/* Facebook Switch */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                      <Facebook size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-white uppercase block">Facebook Page</span>
                      <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider">Activo (@McVillHeavy)</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={facebookConnected}
                    onChange={e => setFacebookConnected(e.target.checked)}
                    className="accent-mcvill-accent cursor-pointer"
                  />
                </div>

                {/* LinkedIn Switch */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-700/10 border border-blue-500/30 flex items-center justify-center text-blue-300">
                      <Linkedin size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-white uppercase block">LinkedIn Corp</span>
                      <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider">Activo (McVill Group)</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={linkedinConnected}
                    onChange={e => setLinkedinConnected(e.target.checked)}
                    className="accent-mcvill-accent cursor-pointer"
                  />
                </div>

                {/* Instagram Switch */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-pink-600/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                      <Instagram size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-white uppercase block">Instagram Biz</span>
                      <span className={`text-[8px] font-bold uppercase tracking-wider ${instagramConnected ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {instagramConnected ? 'Conectado' : 'Desconectado'}
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={instagramConnected}
                    onChange={e => setInstagramConnected(e.target.checked)}
                    className="accent-mcvill-accent cursor-pointer"
                  />
                </div>

                {/* TikTok Switch */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-cyan-600/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <Video size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-white uppercase block">TikTok Business</span>
                      <span className={`text-[8px] font-bold uppercase tracking-wider ${tiktokConnected ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {tiktokConnected ? 'Conectado' : 'Desconectado'}
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={tiktokConnected}
                    onChange={e => setTiktokConnected(e.target.checked)}
                    className="accent-mcvill-accent cursor-pointer"
                  />
                </div>

              </div>
            </div>

            {/* Post Scheduling */}
            <div className="pt-4 border-t border-white/5 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
                <Calendar size={14} className="text-mcvill-accent" />
                Planificador de Horarios
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Fecha de Envío</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-[10px] text-white focus:outline-none focus:border-mcvill-accent"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Hora Programada</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-[10px] text-white focus:outline-none focus:border-mcvill-accent"
                  />
                </div>
              </div>

              <button
                onClick={handleSchedulePost}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 border border-mcvill-accent/30 hover:border-mcvill-accent text-mcvill-accent font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
              >
                Agendar Publicación IA
              </button>
            </div>
          </div>

          {/* Columns 2 & 3: Post Composer & Simulated Live API Publish Monitor */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Post Composer View */}
            <div className="border border-mcvill-card-border/30 bg-slate-950/40 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3 flex-wrap gap-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <Type size={12} className="text-mcvill-accent" />
                  Redactar y Adaptar Mensaje
                </span>

                {/* AI Tone selector switches */}
                <div className="flex gap-1 bg-slate-900 p-0.5 border border-white/5 rounded-xl">
                  {['original', 'corporate', 'friendly', 'viral'].map((tone) => (
                    <button
                      key={tone}
                      onClick={() => setSocialTone(tone as any)}
                      className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all ${
                        socialTone === tone 
                          ? 'bg-mcvill-accent text-slate-950 shadow-sm' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <textarea
                  value={postText}
                  onChange={e => {
                    setPostText(e.target.value);
                    setOriginalPostText(e.target.value);
                  }}
                  rows={6}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-mcvill-accent font-mono leading-relaxed"
                  placeholder="Escriba su mensaje comercial o cargue un diseño del ERP..."
                />

                {/* Select target networks indicator bubbles */}
                <div className="flex gap-2.5 items-center flex-wrap">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Publicar En:</span>
                  
                  <button 
                    onClick={() => handleToggleNetwork('facebook')} 
                    disabled={!facebookConnected}
                    className={`px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                      !facebookConnected ? 'opacity-20 cursor-not-allowed' :
                      selectedNetworks.includes('facebook') 
                        ? 'bg-blue-600/20 border-blue-500/60 text-blue-400' 
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    <Facebook size={10} /> Facebook
                  </button>

                  <button 
                    onClick={() => handleToggleNetwork('linkedin')}
                    disabled={!linkedinConnected}
                    className={`px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                      !linkedinConnected ? 'opacity-20 cursor-not-allowed' :
                      selectedNetworks.includes('linkedin') 
                        ? 'bg-blue-700/20 border-blue-500/60 text-blue-300' 
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    <Linkedin size={10} /> LinkedIn
                  </button>

                  <button 
                    onClick={() => handleToggleNetwork('instagram')}
                    disabled={!instagramConnected}
                    className={`px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                      !instagramConnected ? 'opacity-20 cursor-not-allowed' :
                      selectedNetworks.includes('instagram') 
                        ? 'bg-pink-600/20 border-pink-500/60 text-pink-400' 
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    <Instagram size={10} /> Instagram
                  </button>

                  <button 
                    onClick={() => handleToggleNetwork('tiktok')}
                    disabled={!tiktokConnected}
                    className={`px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                      !tiktokConnected ? 'opacity-20 cursor-not-allowed' :
                      selectedNetworks.includes('tiktok') 
                        ? 'bg-cyan-600/20 border-cyan-500/60 text-cyan-400' 
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    <Video size={10} /> TikTok
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex justify-end gap-3 border-t border-white/5">
                <button
                  onClick={handlePublishNow}
                  disabled={isPublishing || selectedNetworks.length === 0}
                  className="px-6 py-3 bg-mcvill-accent hover:bg-mcvill-accent/90 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(0,128,255,0.2)] flex items-center gap-2"
                >
                  <Send size={12} className={isPublishing ? 'animate-bounce' : ''} />
                  {isPublishing ? 'Publicando...' : 'Publicar Ahora en Redes'}
                </button>
              </div>
            </div>

            {/* Publishing Log Console */}
            {(isPublishing || publishLogs.length > 0) && (
              <div className="border border-mcvill-card-border/30 bg-slate-950 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <Activity size={12} className="text-mcvill-accent animate-pulse" />
                    Consola de Transmisión API (Meta & LinkedIn Gateway)
                  </span>
                  
                  {isPublishing && <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />}
                </div>

                <div className="bg-black p-4 rounded-2xl border border-white/5 font-mono text-[9px] space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar">
                  {publishLogs.map((log, idx) => (
                    <div 
                      key={idx} 
                      className={`leading-relaxed ${
                        log.includes('SUCCESS') ? 'text-emerald-400 font-bold' :
                        log.includes('COMPLETE') ? 'text-cyan-400 font-black tracking-widest' : 'text-slate-400'
                      }`}
                    >
                      {log}
                    </div>
                  ))}
                </div>

                {publishSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl flex gap-3 items-center">
                    <CheckCircle size={18} className="text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block">Trasmisión Exitosa</span>
                      <p className="text-[9px] text-slate-400 leading-normal font-bold">
                        Los anuncios han sido procesados y transmitidos con éxito a los servidores OAuth de Facebook Business y LinkedIn API. El público de McVill ya puede interactuar con el contenido.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* Gallery / Presets Tab */}
      {activeTab === 'gallery' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {galleryPresets.map((p, idx) => (
            <div key={idx} className="border border-mcvill-card-border/30 bg-slate-950/20 backdrop-blur rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4 group">
              <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/5 bg-slate-900 relative">
                <img src={p.imgUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 to-transparent flex items-end p-3.5">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">{p.title}</h4>
                </div>
              </div>

              <div className="bg-slate-950 border border-white/5 p-3 rounded-2xl font-mono text-[9px] leading-relaxed text-slate-400 max-h-[80px] overflow-y-auto custom-scrollbar select-all">
                {p.prompt}
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(p.prompt);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="w-full py-2 bg-mcvill-accent/10 border border-mcvill-accent/25 hover:bg-mcvill-accent hover:text-slate-950 text-mcvill-accent font-black text-[9px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <Copy size={10} /> Copiar Prompt Preajustado
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

export default BrandingStudioView;
