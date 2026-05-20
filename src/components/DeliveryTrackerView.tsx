import React, { useState, useEffect, useRef } from 'react';
import {
  Truck,
  MapPin,
  Play,
  Pause,
  RotateCcw,
  Bell,
  Navigation,
  Compass,
  Layers,
  ShieldAlert,
  Send,
  CheckCircle2,
  Clock,
  Gauge,
  AlertTriangle,
  Plus,
  Edit,
  X,
  BookOpen,
  Users,
  Route,
  Trash2,
  UserCheck,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useConfig } from '../contexts/ConfigContext';
import { useLanguage } from '../contexts/LanguageContext';
import { PrintButton } from './common/PrintButton';

interface Driver {
  id: string;
  nombre: string;
  licencia: string;
  telefono: string;
  placas: string;
}

interface Ruta {
  id: string;
  nombre: string;
  cliente: string;
  distanciaKm: number;
  geocercaMetros: number;
}

interface CustomerNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  x: number; // For canvas render
  y: number;
  radius: number; // Geofence radius in meters
}

interface DeliveryInfo {
  id: string;
  ot: string;
  partNumber: string;
  customer: string;
  driver: string;
  plates: string;
  status: 'ready' | 'transit' | 'geofence' | 'arrived' | 'unloading';
  speed: number;
  progress: number;
  distance: number; // Remaining km
}

export function DeliveryTrackerView() {
  const { config, isDarkMode } = useConfig();
  const { t } = useLanguage();

  // State for active delivery
  const [activeDelivery, setActiveDelivery] = useState<DeliveryInfo>({
    id: 'del-001',
    ot: 'OT-2026-0043',
    partNumber: 'MCV-ENG-2024-001',
    customer: 'Caterpillar Planta 1',
    driver: 'Roberto Sánchez',
    plates: 'MX-847-B2',
    status: 'ready',
    speed: 0,
    progress: 0,
    distance: 14.5,
  });

  const [geofenceRadius, setGeofenceRadius] = useState<number>(1200); // meters
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1); // multiplier
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [alertsLog, setAlertsLog] = useState<{ id: string; time: string; message: string; type: 'info' | 'success' | 'alert' }[]>([
    { id: '1', time: '11:15:02', message: 'Orden OT-2026-0043 liberada en Almacén de Embarques.', type: 'info' },
    { id: '2', time: '11:16:30', message: 'Chofer Roberto Sánchez asignado al camión MCV-01 (Placas MX-847-B2).', type: 'info' },
    { id: '3', time: '11:17:15', message: 'Sincronización GPS activa. Señal satelital óptima.', type: 'success' },
  ]);

  const [whatsappAlert, setWhatsappAlert] = useState<{ show: boolean; msg: string } | null>(null);

  // Panel tab navigation
  const [panelTab, setPanelTab] = useState<'monitor' | 'choferes' | 'rutas'>('monitor');
  const [showGuide, setShowGuide] = useState(false);

  // Choferes management
  const [drivers, setDrivers] = useState<Driver[]>([
    { id: 'd-001', nombre: 'Roberto Sánchez', licencia: 'MX-LIC-223344', telefono: '81-1234-5678', placas: 'MX-847-B2' },
    { id: 'd-002', nombre: 'Carlos Reyes', licencia: 'MX-LIC-112233', telefono: '81-9876-5432', placas: 'NL-321-AA' },
  ]);
  const [driverForm, setDriverForm] = useState<Omit<Driver, 'id'>>({ nombre: '', licencia: '', telefono: '', placas: '' });
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [showDriverForm, setShowDriverForm] = useState(false);

  // Rutas management
  const [rutas, setRutas] = useState<Ruta[]>([
    { id: 'r-001', nombre: 'Ruta CAT-1', cliente: 'Caterpillar Planta 1', distanciaKm: 14.5, geocercaMetros: 1200 },
    { id: 'r-002', nombre: 'Ruta Wabtec', cliente: 'Wabtec Apodaca', distanciaKm: 9.8, geocercaMetros: 1000 },
    { id: 'r-003', nombre: 'Ruta Jabil', cliente: 'Jabil Apodaca', distanciaKm: 17.2, geocercaMetros: 1500 },
  ]);
  const [rutaForm, setRutaForm] = useState<Omit<Ruta, 'id'>>({ nombre: '', cliente: 'Caterpillar Planta 1', distanciaKm: 12.5, geocercaMetros: 1200 });
  const [editingRutaId, setEditingRutaId] = useState<string | null>(null);
  const [showRutaForm, setShowRutaForm] = useState(false);

  // Modal states for creating/editing route
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formOt, setFormOt] = useState('');
  const [formPartNumber, setFormPartNumber] = useState('');
  const [formCustomer, setFormCustomer] = useState('Caterpillar Planta 1');
  const [formDriver, setFormDriver] = useState('');
  const [formPlates, setFormPlates] = useState('');
  const [formDistance, setFormDistance] = useState(12.5);

  // Simulated Coordinates
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: 25.7725,
    lng: -100.1852, // McVill plant starting point (Apodaca, NL)
  });

  // Target points (Industrial hubs)
  const customers: CustomerNode[] = [
    { id: 'mcvill', name: 'Planta McVill (Origen)', lat: 25.7725, lng: -100.1852, x: 80, y: 320, radius: 200 },
    { id: 'cat', name: 'Caterpillar Planta 1', lat: 25.7954, lng: -100.1382, x: 420, y: 120, radius: geofenceRadius },
    { id: 'wabtec', name: 'Wabtec Apodaca', lat: 25.7512, lng: -100.1604, x: 300, y: 250, radius: 1000 },
    { id: 'jabil', name: 'Jabil Apodaca', lat: 25.7314, lng: -100.1245, x: 500, y: 300, radius: 1500 },
  ];

  const targetNode = customers.find(c => c.name === activeDelivery.customer) || customers[1];
  const originNode = customers[0];

  // Ref for canvas render
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Open modal for editing current delivery
  const handleOpenEdit = () => {
    setFormOt(activeDelivery.ot);
    setFormPartNumber(activeDelivery.partNumber);
    setFormCustomer(activeDelivery.customer);
    setFormDriver(activeDelivery.driver);
    setFormPlates(activeDelivery.plates);
    setFormDistance(activeDelivery.distance);
    setIsModalOpen(true);
  };

  // Open modal for creating new delivery
  const handleOpenNew = () => {
    setFormOt('OT-2026-0' + Math.floor(100 + Math.random() * 900));
    setFormPartNumber('MCV-ENG-2024-' + Math.floor(100 + Math.random() * 900));
    setFormCustomer('Caterpillar Planta 1');
    setFormDriver('');
    setFormPlates('');
    setFormDistance(12.5);
    setIsModalOpen(true);
  };

  // Save modal form
  const handleSaveDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDriver || !formPlates) {
      alert('Por favor complete todos los datos del chofer y las placas.');
      return;
    }

    setIsPlaying(false);
    setActiveDelivery({
      id: 'del-' + Math.floor(100 + Math.random() * 900),
      ot: formOt,
      partNumber: formPartNumber,
      customer: formCustomer,
      driver: formDriver,
      plates: formPlates.toUpperCase(),
      status: 'ready',
      speed: 0,
      progress: 0,
      distance: formDistance,
    });

    setCurrentCoords({ lat: originNode.lat, lng: originNode.lng });
    setWhatsappAlert(null);
    setIsModalOpen(false);

    // Refresh logs
    setAlertsLog([
      { id: '1', time: new Date().toTimeString().split(' ')[0], message: `Embarque ${formOt} registrado para ${formCustomer}.`, type: 'info' },
      { id: '2', time: new Date().toTimeString().split(' ')[0], message: `Chofer ${formDriver} asignado a unidad con placas ${formPlates.toUpperCase()}.`, type: 'info' },
      { id: '3', time: new Date().toTimeString().split(' ')[0], message: `Unidad lista en andén de salida Planta McVill. Presiona "Iniciar Ruta" para simular.`, type: 'success' },
    ]);
  };

  // Handle Play/Pause
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      addLog(`Simulación de entrega iniciada. Operador: ${activeDelivery.driver}. Velocidad: ${simulationSpeed}x`, 'info');
    } else {
      addLog('Simulación pausada temporalmente.', 'info');
    }
  };

  // Reset Simulation
  const resetSimulation = () => {
    setIsPlaying(false);
    setActiveDelivery(prev => ({
      ...prev,
      status: 'ready',
      speed: 0,
      progress: 0,
      distance: formDistance || 14.5,
    }));
    setCurrentCoords({ lat: originNode.lat, lng: originNode.lng });
    setWhatsappAlert(null);
    setAlertsLog([
      { id: '1', time: new Date().toTimeString().split(' ')[0], message: `Embarque restablecido en Planta McVill (Origen).`, type: 'info' },
      { id: '2', time: new Date().toTimeString().split(' ')[0], message: `Chofer ${activeDelivery.driver} listo para iniciar ruta en unidad ${activeDelivery.plates}.`, type: 'info' },
      { id: '3', time: new Date().toTimeString().split(' ')[0], message: `Sincronización GPS activa. Señal satelital óptima.`, type: 'success' },
    ]);
  };

  // Add Log Item
  const addLog = (message: string, type: 'info' | 'success' | 'alert') => {
    const timeStr = new Date().toTimeString().split(' ')[0];
    setAlertsLog(prev => [
      { id: Math.random().toString(), time: timeStr, message, type },
      ...prev
    ]);
  };

  // Simulation Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const interval = setInterval(() => {
      setActiveDelivery(prev => {
        const nextProgress = Math.min(prev.progress + 0.5 * simulationSpeed, 100);
        const nextDistance = Math.max(formDistance * (1 - nextProgress / 100), 0);
        let nextStatus = prev.status;
        let speed = nextProgress > 0 && nextProgress < 100 ? 72 + Math.floor(Math.random() * 8) - 4 : 0;

        // Calculate current coordinates linearly
        const currentLat = originNode.lat + (targetNode.lat - originNode.lat) * (nextProgress / 100);
        const currentLng = originNode.lng + (targetNode.lng - originNode.lng) * (nextProgress / 100);
        setCurrentCoords({ lat: currentLat, lng: currentLng });

        // Geofence trigger point (around 75% of route)
        if (nextProgress >= 72 && nextProgress < 98 && prev.status === 'transit') {
          nextStatus = 'geofence';
          speed = 45; // Slow down as approaching gate
          addLog(`⚠️ ALERTA GEOFENCE: Vehículo ingresando a la geocerca de ${targetNode.name} (Radio: ${geofenceRadius}m).`, 'alert');
          triggerSMSAlert(prev.ot, targetNode.name);
        }

        // Arrived trigger point
        if (nextProgress >= 98 && nextProgress < 100 && prev.status === 'geofence') {
          nextStatus = 'arrived';
          speed = 10;
          addLog(`✅ VEHÍCULO ARRIBADO: El camión ingresó al andén de descarga de ${targetNode.name}.`, 'success');
        }

        // Unloading finished
        if (nextProgress === 100 && prev.status !== 'unloading') {
          nextStatus = 'unloading';
          speed = 0;
          addLog(`📦 DESCARGA ACTIVA: Proceso de recepción del viajero digital y planos en andén.`, 'success');
        }

        if (prev.status === 'ready' && nextProgress > 0) {
          nextStatus = 'transit';
          addLog(`🚚 Salida de camión con placas ${prev.plates} de Planta McVill. En tránsito.`, 'info');
        }

        return {
          ...prev,
          progress: nextProgress,
          distance: parseFloat(nextDistance.toFixed(2)),
          status: nextStatus,
          speed,
        };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, simulationSpeed, geofenceRadius, formDistance]);

  // Trigger Mock SMS/WhatsApp alert
  const triggerSMSAlert = (ot: string, customer: string) => {
    const msg = `📩 [SMS AUTOMÁTICO] MCVILL LOGÍSTICA: El camión MCV-01 con la ${ot} (Viajero Metalmecánico) ingresó a la geocerca de ${customer}. ETA: 4 min. Favor de coordinar andén de descarga.`;
    setWhatsappAlert({
      show: true,
      msg
    });
    // Autoclose alert after 8 seconds
    setTimeout(() => {
      setWhatsappAlert(prev => prev ? { ...prev, show: false } : null);
    }, 8000);
  };

  // Driver CRUD
  const handleSaveDriver = () => {
    if (!driverForm.nombre || !driverForm.placas) return;
    if (editingDriverId) {
      setDrivers(prev => prev.map(d => d.id === editingDriverId ? { ...driverForm, id: editingDriverId } : d));
      setEditingDriverId(null);
    } else {
      setDrivers(prev => [...prev, { ...driverForm, id: 'd-' + Date.now() }]);
    }
    setDriverForm({ nombre: '', licencia: '', telefono: '', placas: '' });
    setShowDriverForm(false);
  };

  const handleEditDriver = (d: Driver) => {
    setDriverForm({ nombre: d.nombre, licencia: d.licencia, telefono: d.telefono, placas: d.placas });
    setEditingDriverId(d.id);
    setShowDriverForm(true);
  };

  const handleDeleteDriver = (id: string) => {
    setDrivers(prev => prev.filter(d => d.id !== id));
  };

  // Ruta CRUD
  const handleSaveRuta = () => {
    if (!rutaForm.nombre || !rutaForm.cliente) return;
    if (editingRutaId) {
      setRutas(prev => prev.map(r => r.id === editingRutaId ? { ...rutaForm, id: editingRutaId } : r));
      setEditingRutaId(null);
    } else {
      setRutas(prev => [...prev, { ...rutaForm, id: 'r-' + Date.now() }]);
    }
    setRutaForm({ nombre: '', cliente: 'Caterpillar Planta 1', distanciaKm: 12.5, geocercaMetros: 1200 });
    setShowRutaForm(false);
  };

  const handleEditRuta = (r: Ruta) => {
    setRutaForm({ nombre: r.nombre, cliente: r.cliente, distanciaKm: r.distanciaKm, geocercaMetros: r.geocercaMetros });
    setEditingRutaId(r.id);
    setShowRutaForm(true);
  };

  const handleDeleteRuta = (id: string) => {
    setRutas(prev => prev.filter(r => r.id !== id));
  };

  // Canvas Radar/Map Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let pulseOffset = 0;

    const draw = () => {
      pulseOffset = (pulseOffset + 0.15) % 15;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Grid Lines (Futuristic radar-cyber style)
      ctx.strokeStyle = isDarkMode ? 'rgba(0, 128, 255, 0.05)' : 'rgba(0, 128, 255, 0.08)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // 2. Draw Simulated Highways / Routes
      ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.05)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(originNode.x, originNode.y); // McVill
      ctx.lineTo(300, 250); // Wabtec
      ctx.lineTo(targetNode.x, targetNode.y); // Target Node
      ctx.stroke();

      // Additional secondary roads for complexity
      ctx.beginPath();
      ctx.moveTo(300, 250);
      ctx.lineTo(500, 300); // Jabil
      ctx.stroke();

      // 3. Draw Route Path Highlight (Blue laser glow)
      ctx.strokeStyle = isDarkMode ? 'rgba(0, 128, 255, 0.35)' : 'rgba(29, 78, 216, 0.3)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(originNode.x, originNode.y);
      const vehicleProgressX = originNode.x + (targetNode.x - originNode.x) * (activeDelivery.progress / 100);
      const vehicleProgressY = originNode.y + (targetNode.y - originNode.y) * (activeDelivery.progress / 100);
      ctx.lineTo(vehicleProgressX, vehicleProgressY);
      ctx.stroke();

      // 4. Draw Customer Geofence Radii (Neon glowing rings)
      customers.forEach(node => {
        if (node.id === 'mcvill') return; // Skip origin for clarity
        const isTarget = node.name === activeDelivery.customer;

        // Draw Radius Circle
        ctx.fillStyle = isTarget
          ? (activeDelivery.status === 'geofence' || activeDelivery.status === 'arrived'
              ? 'rgba(239, 68, 68, 0.05)'
              : 'rgba(59, 130, 246, 0.03)')
          : 'rgba(255, 255, 255, 0.02)';

        ctx.strokeStyle = isTarget
          ? (activeDelivery.status === 'geofence' || activeDelivery.status === 'arrived'
              ? 'rgba(239, 68, 68, 0.4)'
              : 'rgba(59, 130, 246, 0.25)')
          : 'rgba(255, 255, 255, 0.1)';

        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]); // Dashed line for geofence visual representation
        ctx.beginPath();
        const visualRadius = node.name === activeDelivery.customer ? 30 + geofenceRadius / 80 : 35;
        ctx.arc(node.x, node.y, visualRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash

        // Glowing pulse rings inside geofence when active
        if (isTarget && (activeDelivery.status === 'geofence' || activeDelivery.status === 'arrived')) {
          ctx.strokeStyle = 'rgba(239, 68, 68, ' + (1 - pulseOffset / 15) + ')';
          ctx.beginPath();
          ctx.arc(node.x, node.y, visualRadius + pulseOffset, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // 5. Draw Node Landmarks
      customers.forEach(node => {
        const isMcVill = node.id === 'mcvill';
        const isTarget = node.name === activeDelivery.customer;

        // Node Marker Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = isMcVill
          ? 'rgba(16, 185, 129, 0.8)'
          : (isTarget ? 'rgba(59, 130, 246, 0.8)' : 'rgba(255,255,255,0.2)');

        // Node Dot
        ctx.fillStyle = isMcVill
          ? '#10b981'
          : (isTarget ? '#3b82f6' : '#64748b');

        ctx.beginPath();
        ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0; // Reset shadow

        // Label Texts
        ctx.fillStyle = isDarkMode ? '#f8fafc' : '#0f172a';
        ctx.font = 'black 9px Inter, sans-serif';
        ctx.fillText(node.name, node.x - 40, node.y - 12);

        // Coordinates Text (Muted cyber-industrial look)
        ctx.fillStyle = '#64748b';
        ctx.font = '500 7px Courier New, monospace';
        ctx.fillText(`${node.lat.toFixed(4)}, ${node.lng.toFixed(4)}`, node.x - 40, node.y + 15);
      });

      // 6. Draw Simulated Live Truck Position
      ctx.shadowBlur = 15;
      ctx.shadowColor = activeDelivery.status === 'geofence' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(59, 130, 246, 0.9)';
      ctx.fillStyle = activeDelivery.status === 'geofence' ? '#ef4444' : '#3b82f6';
      ctx.beginPath();
      ctx.arc(vehicleProgressX, vehicleProgressY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0; // Reset

      // Direction vector arrow
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(vehicleProgressX, vehicleProgressY);
      const angle = Math.atan2(targetNode.y - originNode.y, targetNode.x - originNode.x);
      ctx.lineTo(
        vehicleProgressX + Math.cos(angle) * 12,
        vehicleProgressY + Math.sin(angle) * 12
      );
      ctx.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [activeDelivery.progress, geofenceRadius, activeDelivery.status, isDarkMode, activeDelivery.customer]);

  // Translate statuses for display
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <span className="px-2 py-0.5 rounded border border-slate-500/30 bg-slate-500/10 text-slate-400 font-bold uppercase text-[9px] tracking-wider">Listo</span>;
      case 'transit':
        return <span className="px-2 py-0.5 rounded border border-blue-500/30 bg-blue-500/10 text-blue-400 font-bold uppercase text-[9px] tracking-wider animate-pulse">En Tránsito</span>;
      case 'geofence':
        return <span className="px-2 py-0.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-400 font-bold uppercase text-[9px] tracking-wider animate-ping">Geocerca Activa</span>;
      case 'arrived':
        return <span className="px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold uppercase text-[9px] tracking-wider">Arribado</span>;
      case 'unloading':
        return <span className="px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold uppercase text-[9px] tracking-wider animate-pulse">Descargando</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 relative">

      {/* CREATION AND EDITION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-mcvill-accent/30 rounded-3xl p-6 max-w-md w-full shadow-[0_0_50px_rgba(0,128,255,0.2)] relative overflow-hidden space-y-4">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-mcvill-accent to-emerald-500" />

            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Truck className="text-mcvill-accent" size={16} />
                Planificación de Ruta de Chofer
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveDelivery} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Orden de Trabajo</label>
                  <input
                    type="text"
                    value={formOt}
                    onChange={e => setFormOt(e.target.value)}
                    placeholder="OT-2026-0043"
                    className="w-full bg-slate-950/85 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-mcvill-accent transition-all font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">No. de Parte</label>
                  <input
                    type="text"
                    value={formPartNumber}
                    onChange={e => setFormPartNumber(e.target.value)}
                    placeholder="MCV-ENG-2026"
                    className="w-full bg-slate-950/85 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-mcvill-accent transition-all font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Cliente Destinatario</label>
                <select
                  value={formCustomer}
                  onChange={e => setFormCustomer(e.target.value)}
                  className="w-full bg-slate-950/85 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-mcvill-accent transition-all"
                >
                  <option value="Caterpillar Planta 1">Caterpillar Planta 1</option>
                  <option value="Wabtec Apodaca">Wabtec Apodaca</option>
                  <option value="Jabil Apodaca">Jabil Apodaca</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Chofer / Operador</label>
                {drivers.length > 0 ? (
                  <select
                    value={formDriver}
                    onChange={e => {
                      const d = drivers.find(d => d.nombre === e.target.value);
                      setFormDriver(e.target.value);
                      if (d) setFormPlates(d.placas);
                    }}
                    className="w-full bg-slate-950/85 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-mcvill-accent transition-all"
                    required
                  >
                    <option value="">-- Seleccionar chofer --</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.nombre}>{d.nombre} ({d.placas})</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                    No hay choferes registrados. Ve a la pestaña "Choferes" para agregar.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Placas del Camión</label>
                  <input
                    type="text"
                    value={formPlates}
                    onChange={e => setFormPlates(e.target.value)}
                    placeholder="MX-847-B2"
                    className="w-full bg-slate-950/85 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-mcvill-accent transition-all font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Distancia de Ruta (KM)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formDistance}
                    onChange={e => setFormDistance(parseFloat(e.target.value))}
                    className="w-full bg-slate-950/85 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-mcvill-accent transition-all font-mono"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-mcvill-accent text-slate-950 hover:bg-mcvill-accent/95 shadow-[0_0_15px_rgba(0,128,255,0.3)] transition-all text-xs font-black uppercase tracking-wider"
                >
                  Asignar y Cargar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SMS/WhatsApp Mock Alert Popup */}
      {whatsappAlert && whatsappAlert.show && (
        <div className="fixed top-6 right-6 z-[250] max-w-sm w-full bg-slate-900 border border-green-500/30 rounded-2xl p-4 shadow-[0_0_30px_rgba(16,185,129,0.25)] flex items-start gap-3 animate-slide-in duration-300">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 border border-green-500/30">
            <Bell className="text-green-400 animate-bounce" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-green-400 tracking-wider">Notificación de Tránsito</span>
              <span className="text-[8px] text-slate-500 font-bold">AHORA</span>
            </div>
            <p className="text-[11px] text-white mt-1 leading-relaxed font-medium">
              {whatsappAlert.msg}
            </p>
            <div className="mt-2.5 flex items-center gap-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest">
              <CheckCircle2 size={10} className="text-green-500" />
              Entregado al cliente vía REST API / SMS
            </div>
          </div>
        </div>
      )}

      {/* Header View Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-mcvill-accent/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-mcvill-accent/10 border border-mcvill-accent/30 text-mcvill-accent text-[8px] font-black tracking-widest uppercase">
              Fase 3: Smart Factory
            </span>
          </div>
          <h2 className="text-xl font-bold uppercase tracking-tight text-white mt-1.5 flex items-center gap-2.5">
            <Truck className="text-mcvill-accent" size={22} />
            Logística de Entrega y Geocercas en Vivo
          </h2>
          <p className="text-xs text-mcvill-text-muted mt-1">
            Centro de monitoreo satelital en tiempo real con disparador automático de notificaciones REST por geocerca.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {/* Tab Navigation */}
          <div className="flex items-center bg-slate-900 border border-white/5 rounded-2xl p-1 gap-1">
            {([
              { key: 'monitor', label: 'Monitor', icon: <Navigation size={12} /> },
              { key: 'choferes', label: 'Choferes', icon: <Users size={12} /> },
              { key: 'rutas', label: 'Rutas', icon: <Route size={12} /> },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setPanelTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  panelTab === tab.key
                    ? 'bg-mcvill-accent text-slate-950 shadow-[0_0_10px_rgba(0,128,255,0.3)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {panelTab === 'monitor' && (
            <button
              onClick={handleOpenNew}
              className="px-4 py-2 rounded-2xl border border-mcvill-accent/30 bg-mcvill-accent/10 text-mcvill-accent hover:bg-mcvill-accent/20 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(0,128,255,0.1)]"
            >
              <Plus size={14} />
              Nuevo Embarque
            </button>
          )}

          <button
            onClick={() => setShowGuide(true)}
            className="px-3 py-2 rounded-2xl border border-white/10 bg-white/5 text-slate-400 hover:text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all"
            title="Ver Guía de Uso"
          >
            <BookOpen size={14} />
            Guía
          </button>

          <div className="px-4 py-2 rounded-2xl border border-white/5 bg-slate-900 flex items-center gap-3">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-white tracking-widest leading-none">GPS Activo</span>
              <span className="text-[7px] text-emerald-400 font-bold uppercase tracking-wider mt-0.5">12 Satélites Enlazados</span>
            </div>
          </div>
          <PrintButton />
        </div>
      </div>

      {/* Main Core Dashboard Grid */}
      {panelTab === 'monitor' && <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN: Map & Live Tracking (Spanning 2 columns) */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Visual Radar Command Grid Map */}
          <div className="border border-mcvill-card-border/30 bg-slate-950/40 rounded-3xl p-4 shadow-xl relative overflow-hidden flex flex-col min-h-[420px]">
            <div className="absolute inset-0 bg-radial-gradient from-mcvill-accent/5 to-transparent pointer-events-none" />

            {/* Map Overlay Panel */}
            <div className="absolute top-6 left-6 z-20 flex items-center gap-2 p-2.5 bg-slate-900/90 backdrop-blur border border-white/5 rounded-2xl shadow-2xl">
              <Compass className="text-mcvill-accent animate-spin-slow" size={16} />
              <span className="text-[10px] font-black uppercase text-white tracking-widest">
                Monitoreo Satelital en Tiempo Real (ZONA METROPOLITANA)
              </span>
            </div>

            {/* Radar Coordinates HUD */}
            <div className="absolute bottom-6 right-6 z-20 flex flex-col text-right p-3 bg-slate-900/90 backdrop-blur border border-white/5 rounded-2xl">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Coordenadas Live</span>
              <span className="text-[10px] font-black text-mcvill-accent font-mono mt-0.5">
                {currentCoords.lat.toFixed(5)}° N
              </span>
              <span className="text-[10px] font-black text-mcvill-accent font-mono">
                {currentCoords.lng.toFixed(5)}° W
              </span>
            </div>

            {/* Actual Canvas */}
            <div className="flex-1 flex items-center justify-center relative bg-slate-900/20 rounded-2xl border border-white/5 overflow-hidden">
              <canvas
                ref={canvasRef}
                width={580}
                height={350}
                className="w-full h-full object-contain max-h-[350px]"
              />
            </div>

            {/* Live Progress Bar (High Premium laser-gradient) */}
            <div className="mt-4 bg-slate-900 border border-white/5 p-3 rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider">
                <span className="text-slate-400">Progreso de la Ruta de Entrega</span>
                <span className="text-mcvill-accent">{activeDelivery.progress.toFixed(0)}% Completado</span>
              </div>
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-mcvill-accent to-emerald-500 shadow-[0_0_12px_rgba(0,128,255,0.8)] transition-all duration-300"
                  style={{ width: `${activeDelivery.progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* SIMULATION AND GEOFENCE CONTROLLER PANEL */}
          <div className="border border-mcvill-card-border/30 bg-slate-950/20 backdrop-blur rounded-3xl p-6 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Simulation Controls */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Gauge size={14} className="text-mcvill-accent" />
                Panel del Simulador Operativo
              </h3>

              <div className="flex flex-wrap gap-2.5">
                {/* Play/Pause Button */}
                <button
                  onClick={togglePlay}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 border ${
                    isPlaying
                      ? 'bg-amber-600/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20'
                      : 'bg-mcvill-accent/10 border-mcvill-accent/30 text-mcvill-accent hover:bg-mcvill-accent/20 shadow-[0_0_15px_rgba(0,128,255,0.15)]'
                  }`}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  {isPlaying ? 'Pausar' : 'Iniciar Ruta'}
                </button>

                {/* Reset Button */}
                <button
                  onClick={resetSimulation}
                  className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                  title="Reiniciar Simulación"
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              {/* Speed Controller */}
              <div className="bg-slate-900/50 border border-white/5 p-3 rounded-2xl space-y-2">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">
                  Velocidad de Simulación
                </span>
                <div className="flex gap-2">
                  {([1, 2, 5, 10] as const).map(speed => (
                    <button
                      key={speed}
                      onClick={() => setSimulationSpeed(speed)}
                      className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                        simulationSpeed === speed
                          ? 'bg-mcvill-accent text-slate-950 shadow-[0_0_10px_rgba(0,128,255,0.4)]'
                          : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Geofence Radii Controls */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Layers size={14} className="text-mcvill-accent" />
                Configurador de Geocercas (GEOFENCING)
              </h3>

              <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-[9px] font-black uppercase">
                  <span className="text-slate-500">Radio de Alerta Activa</span>
                  <span className="text-mcvill-accent font-mono">{geofenceRadius} Metros</span>
                </div>

                {/* Geofence Radius Slider */}
                <input
                  type="range"
                  min="500"
                  max="3000"
                  step="100"
                  value={geofenceRadius}
                  onChange={(e) => {
                    const newRadius = parseInt(e.target.value);
                    setGeofenceRadius(newRadius);
                    addLog(`Geocerca de ${targetNode.name} ajustada a un radio de ${newRadius} metros.`, 'info');
                  }}
                  className="w-full accent-mcvill-accent cursor-pointer bg-slate-950 h-1.5 rounded-lg appearance-none"
                />

                <div className="flex justify-between text-[7px] text-slate-500 font-bold uppercase tracking-wider">
                  <span>500m (Cercano)</span>
                  <span>3,000m (Anticipado)</span>
                </div>
              </div>

              {/* Status Advisory Card */}
              <div className="bg-blue-500/5 border border-blue-500/20 p-3 rounded-2xl flex gap-3 items-start">
                <ShieldAlert className="text-mcvill-accent shrink-0 mt-0.5" size={14} />
                <p className="text-[10px] text-slate-300 leading-normal font-medium">
                  <strong>Flujo Operativo Agus Pro:</strong> Da de alta un nuevo chofer con <strong>"Nuevo Embarque"</strong>, ajusta los detalles, y presiona <strong>"Iniciar Ruta"</strong> para disparar la geocerca y notificar por SMS en tiempo real.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Delivery Metrics & System Log (Spanning 1 column) */}
        <div className="flex flex-col gap-6">

          {/* Active Delivery Card */}
          <div className="border border-mcvill-card-border/30 bg-slate-950/20 backdrop-blur rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex justify-between items-center border-b border-white/5 pb-3.5">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
                <Navigation size={14} className="text-mcvill-accent" />
                Estatus de Embarque Activo
              </h3>
              {getStatusBadge(activeDelivery.status)}
            </div>

            {/* Delivery Data list */}
            <div className="space-y-4">
              {/* OT & Part Number */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Orden de Trabajo</span>
                  <p className="text-xs font-black text-white mt-1 font-mono">{activeDelivery.ot}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">No. de Parte</span>
                  <p className="text-xs font-black text-white mt-1 font-mono">{activeDelivery.partNumber}</p>
                </div>
              </div>

              {/* Customer destination */}
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Destinatario (Cliente AAA)</span>
                <p className="text-xs font-black text-white flex items-center gap-1.5">
                  <MapPin size={12} className="text-blue-500" />
                  {activeDelivery.customer}
                </p>
              </div>

              {/* Driver Details */}
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-2 relative group">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Información del Operador</span>
                  <button
                    onClick={handleOpenEdit}
                    className="text-[9px] font-black uppercase tracking-wider text-mcvill-accent hover:text-white flex items-center gap-1 transition-colors"
                    title="Editar datos del chofer y placas"
                  >
                    <Edit size={10} />
                    Editar
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-300 font-bold">{activeDelivery.driver || 'Sin asignar'}</span>
                  <span className="font-mono bg-slate-950 px-2 py-0.5 rounded text-[10px] font-black border border-white/10 text-white">
                    {activeDelivery.plates || '---'}
                  </span>
                </div>
              </div>

              {/* Live Speed & Distance */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Velocidad GPS</span>
                  <p className="text-sm font-black text-white mt-1 font-mono">
                    {activeDelivery.speed} <span className="text-[10px] text-slate-500">KM/H</span>
                  </p>
                </div>
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Distancia Restante</span>
                  <p className="text-sm font-black text-white mt-1 font-mono">
                    {activeDelivery.distance} <span className="text-[10px] text-slate-500">KM</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* TELEMETRY EVENT LOG SYSTEM */}
          <div className="border border-mcvill-card-border/30 bg-slate-950/20 backdrop-blur rounded-3xl p-6 shadow-xl flex-1 flex flex-col min-h-[300px]">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-2 border-b border-white/5 pb-3.5 shrink-0">
              <Compass size={14} className="text-mcvill-accent" />
              Bitácora de Eventos Satelitales (GPS LOG)
            </h3>

            {/* Scrollable event list */}
            <div className="flex-1 overflow-y-auto mt-4 space-y-3 custom-scrollbar pr-1 max-h-[350px]">
              {alertsLog.map((log) => (
                <div
                  key={log.id}
                  className={`p-2.5 rounded-2xl border text-[10px] leading-relaxed transition-all flex gap-2.5 ${
                    log.type === 'alert'
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                      : (log.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-slate-900 border-white/5 text-slate-400')
                  }`}
                >
                  <span className="font-mono text-slate-500 font-bold shrink-0 mt-0.5">{log.time}</span>
                  <p className="font-medium">{log.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>}

      {/* ── CHOFERES PANEL ── */}
      {panelTab === 'choferes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
              <Users size={16} className="text-mcvill-accent" />
              Gestión de Choferes / Operadores
            </h3>
            <button
              onClick={() => { setDriverForm({ nombre: '', licencia: '', telefono: '', placas: '' }); setEditingDriverId(null); setShowDriverForm(true); }}
              className="px-4 py-2 rounded-2xl border border-mcvill-accent/30 bg-mcvill-accent/10 text-mcvill-accent hover:bg-mcvill-accent/20 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all"
            >
              <Plus size={13} />
              Agregar Chofer
            </button>
          </div>

          {/* Driver Form */}
          {showDriverForm && (
            <div className="border border-mcvill-accent/20 bg-slate-950/60 rounded-3xl p-5 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-mcvill-accent">
                {editingDriverId ? 'Editar Chofer' : 'Nuevo Chofer'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { label: 'Nombre Completo', key: 'nombre', placeholder: 'Ej. Roberto Sánchez' },
                  { label: 'No. Licencia', key: 'licencia', placeholder: 'MX-LIC-223344' },
                  { label: 'Teléfono', key: 'telefono', placeholder: '81-1234-5678' },
                  { label: 'Placas del Camión', key: 'placas', placeholder: 'MX-847-B2' },
                ] as const).map(f => (
                  <div key={f.key} className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">{f.label}</label>
                    <input
                      type="text"
                      value={driverForm[f.key]}
                      onChange={e => setDriverForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-mcvill-accent transition-all"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowDriverForm(false)} className="flex-1 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-all">Cancelar</button>
                <button onClick={handleSaveDriver} className="flex-1 py-2 rounded-xl bg-mcvill-accent text-slate-950 text-xs font-black uppercase tracking-wider transition-all">
                  {editingDriverId ? 'Guardar Cambios' : 'Registrar Chofer'}
                </button>
              </div>
            </div>
          )}

          {/* Drivers list */}
          {drivers.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm">No hay choferes registrados.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {drivers.map(d => (
                <div key={d.id} className="border border-mcvill-card-border/30 bg-slate-950/30 rounded-3xl p-5 space-y-3 hover:border-mcvill-accent/30 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-2xl bg-mcvill-accent/10 border border-mcvill-accent/20 flex items-center justify-center">
                        <UserCheck size={16} className="text-mcvill-accent" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-white">{d.nombre}</p>
                        <p className="text-[9px] text-slate-500 font-mono">{d.licencia}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => handleEditDriver(d)} className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-mcvill-accent transition-colors"><Edit size={11} /></button>
                      <button onClick={() => handleDeleteDriver(d.id)} className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-colors"><Trash2 size={11} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                      <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider block">Teléfono</span>
                      <span className="text-[10px] text-white font-mono font-bold">{d.telefono}</span>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                      <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider block">Placas</span>
                      <span className="text-[10px] text-mcvill-accent font-mono font-black">{d.placas}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── RUTAS PANEL ── */}
      {panelTab === 'rutas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
              <Route size={16} className="text-mcvill-accent" />
              Gestión de Rutas de Entrega
            </h3>
            <button
              onClick={() => { setRutaForm({ nombre: '', cliente: 'Caterpillar Planta 1', distanciaKm: 12.5, geocercaMetros: 1200 }); setEditingRutaId(null); setShowRutaForm(true); }}
              className="px-4 py-2 rounded-2xl border border-mcvill-accent/30 bg-mcvill-accent/10 text-mcvill-accent hover:bg-mcvill-accent/20 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all"
            >
              <Plus size={13} />
              Nueva Ruta
            </button>
          </div>

          {/* Ruta Form */}
          {showRutaForm && (
            <div className="border border-mcvill-accent/20 bg-slate-950/60 rounded-3xl p-5 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-mcvill-accent">
                {editingRutaId ? 'Editar Ruta' : 'Nueva Ruta'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Nombre de la Ruta</label>
                  <input type="text" value={rutaForm.nombre} onChange={e => setRutaForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej. Ruta CAT-1"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-mcvill-accent transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Cliente Destino</label>
                  <select value={rutaForm.cliente} onChange={e => setRutaForm(p => ({ ...p, cliente: e.target.value }))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-mcvill-accent transition-all">
                    <option>Caterpillar Planta 1</option>
                    <option>Wabtec Apodaca</option>
                    <option>Jabil Apodaca</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Distancia (KM)</label>
                  <input type="number" step="0.1" value={rutaForm.distanciaKm} onChange={e => setRutaForm(p => ({ ...p, distanciaKm: parseFloat(e.target.value) }))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-mcvill-accent transition-all font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Geocerca (Metros)</label>
                  <input type="number" step="100" value={rutaForm.geocercaMetros} onChange={e => setRutaForm(p => ({ ...p, geocercaMetros: parseInt(e.target.value) }))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-mcvill-accent transition-all font-mono" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowRutaForm(false)} className="flex-1 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-all">Cancelar</button>
                <button onClick={handleSaveRuta} className="flex-1 py-2 rounded-xl bg-mcvill-accent text-slate-950 text-xs font-black uppercase tracking-wider transition-all">
                  {editingRutaId ? 'Guardar Cambios' : 'Registrar Ruta'}
                </button>
              </div>
            </div>
          )}

          {/* Rutas list */}
          {rutas.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm">No hay rutas registradas.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {rutas.map(r => (
                <div key={r.id} className="border border-mcvill-card-border/30 bg-slate-950/30 rounded-3xl p-5 space-y-3 hover:border-mcvill-accent/30 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Route size={16} className="text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-white">{r.nombre}</p>
                        <p className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5"><MapPin size={9} />{r.cliente}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => handleEditRuta(r)} className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-mcvill-accent transition-colors"><Edit size={11} /></button>
                      <button onClick={() => handleDeleteRuta(r.id)} className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-colors"><Trash2 size={11} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                      <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider block">Distancia</span>
                      <span className="text-[10px] text-white font-mono font-black">{r.distanciaKm} KM</span>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                      <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider block">Geocerca</span>
                      <span className="text-[10px] text-emerald-400 font-mono font-black">{r.geocercaMetros} m</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── GUIDE MODAL ── */}
      {showGuide && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-mcvill-accent/30 rounded-3xl p-6 max-w-lg w-full shadow-[0_0_60px_rgba(0,128,255,0.2)] space-y-5 relative overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-mcvill-accent via-emerald-400 to-mcvill-accent" />
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <BookOpen size={16} className="text-mcvill-accent" />
                Guía de Uso — Tracker de Logística
              </h3>
              <button onClick={() => setShowGuide(false)} className="text-slate-400 hover:text-white transition-colors"><X size={16} /></button>
            </div>

            <div className="space-y-3">
              {[
                { step: '01', title: 'Registrar Choferes', desc: 'Ve a la pestaña "Choferes" y agrega a cada operador con su nombre, licencia, teléfono y placas del camión asignado.', color: 'blue' },
                { step: '02', title: 'Configurar Rutas', desc: 'En la pestaña "Rutas", crea una ruta por cada cliente destino. Define el nombre, KM de distancia y el radio de geocerca en metros.', color: 'emerald' },
                { step: '03', title: 'Crear Embarque', desc: 'En "Monitor" presiona "Nuevo Embarque". Selecciona la OT, número de parte, cliente, elige al chofer del dropdown (se auto-rellena placas) y la distancia.', color: 'blue' },
                { step: '04', title: 'Iniciar Ruta', desc: 'Presiona "Iniciar Ruta" en el simulador. El mapa radar mostrará el avance del camión en tiempo real con coordenadas GPS actualizadas.', color: 'emerald' },
                { step: '05', title: 'Geocerca Automática', desc: 'Al cruzar el 72% de la ruta el sistema detecta la geocerca y dispara automáticamente una notificación SMS/WhatsApp al cliente con ETA.', color: 'amber' },
                { step: '06', title: 'Descarga y Cierre', desc: 'Al llegar al 100% el sistema registra la descarga en la bitácora. El viajero digital se valida en andén sin papel.', color: 'emerald' },
              ].map(s => (
                <div key={s.step} className="flex gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-[11px] ${
                    s.color === 'amber' ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400' :
                    s.color === 'emerald' ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' :
                    'bg-mcvill-accent/15 border border-mcvill-accent/30 text-mcvill-accent'
                  }`}>
                    {s.step}
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-white">{s.title}</p>
                    <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">{s.desc}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-600 shrink-0 mt-2" />
                </div>
              ))}
            </div>

            <div className="bg-mcvill-accent/5 border border-mcvill-accent/20 rounded-2xl p-3 text-[10px] text-slate-300 leading-relaxed">
              <strong className="text-mcvill-accent">Tip:</strong> Los choferes y rutas registrados aquí se sincronizan con el formulario de "Nuevo Embarque". Agrega todos tus operadores antes de planificar embarques.
            </div>

            <button onClick={() => setShowGuide(false)} className="w-full py-2.5 rounded-2xl bg-mcvill-accent text-slate-950 font-black text-xs uppercase tracking-widest transition-all hover:bg-mcvill-accent/90">
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default DeliveryTrackerView;
