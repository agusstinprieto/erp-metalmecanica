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
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useConfig } from '../contexts/ConfigContext';
import { useLanguage } from '../contexts/LanguageContext';

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

  // Handle Play/Pause
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      addLog(`Simulación de entrega iniciada. Velocidad: ${simulationSpeed}x`, 'info');
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
      distance: 14.5,
    }));
    setCurrentCoords({ lat: originNode.lat, lng: originNode.lng });
    setWhatsappAlert(null);
    setAlertsLog([
      { id: '1', time: '11:15:02', message: 'Orden OT-2026-0043 liberada en Almacén de Embarques.', type: 'info' },
      { id: '2', time: '11:16:30', message: 'Chofer Roberto Sánchez asignado al camión MCV-01 (Placas MX-847-B2).', type: 'info' },
      { id: '3', time: '11:17:15', message: 'Sincronización GPS activa. Señal satelital óptima.', type: 'success' },
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
        const nextDistance = Math.max(14.5 * (1 - nextProgress / 100), 0);
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
          addLog('🚚 Salida de camión de Planta McVill. En tránsito por autopista industrial.', 'info');
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
  }, [isPlaying, simulationSpeed, geofenceRadius]);

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
        const isTarget = node.id === 'cat';
        
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
        const visualRadius = node.id === 'cat' ? 30 + geofenceRadius / 80 : 35;
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
  }, [activeDelivery.progress, geofenceRadius, activeDelivery.status, isDarkMode]);

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

        {/* Live System Indicator */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="px-4 py-2 rounded-2xl border border-mcvill-accent/30 bg-mcvill-accent/5 flex items-center gap-3">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-white tracking-widest leading-none">GPS Activo</span>
              <span className="text-[7px] text-emerald-400 font-bold uppercase tracking-wider mt-0.5">12 Satélites Enlazados</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Core Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
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
                  {isPlaying ? 'Pausar' : 'Iniciar'}
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
                    addLog(`Geocerca de Caterpillar ajustada a un radio de ${newRadius} metros.`, 'info');
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
                  <strong>Prueba de ROI ante el Cliente:</strong> Cambia la velocidad a <strong>5x</strong> o <strong>10x</strong> y observa cómo al cruzar el radio de geocerca en el mapa, el sistema dispara automáticamente la alerta SMS en el andén de Caterpillar.
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
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-2">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Información de Operador y Unidad</span>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-bold">{activeDelivery.driver}</span>
                  <span className="font-mono bg-slate-950 px-2 py-0.5 rounded text-[10px] font-black border border-white/10 text-white">
                    {activeDelivery.plates}
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

      </div>
    </div>
  );
}

export default DeliveryTrackerView;
