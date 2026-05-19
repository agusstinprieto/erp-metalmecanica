import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCw, Zap, ShieldAlert, Sparkles } from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import { toast } from '../lib/dialogs';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export const ShopFloorQRScannerModal: React.FC<Props> = ({ isOpen, onClose, onScanSuccess }) => {
  const { isDarkMode } = useConfig();
  const [cameras, setCameras] = useState<any[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'shopfloor-qr-reader';

  // Obtener cámaras disponibles al abrir
  useEffect(() => {
    if (!isOpen) return;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Priorizar cámara trasera por defecto
          const backCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('trasera') ||
              d.label.toLowerCase().includes('environment')
          );
          setActiveCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setErrorMsg('No se detectaron cámaras en este dispositivo.');
        }
      })
      .catch((err) => {
        console.error('Error al listar cámaras:', err);
        setErrorMsg('Permiso de cámara denegado o no disponible.');
      });

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  // Iniciar escaneo cuando tengamos una cámara seleccionada
  useEffect(() => {
    if (!isOpen || !activeCameraId) return;

    startScanner(activeCameraId);

    return () => {
      stopScanner();
    };
  }, [isOpen, activeCameraId]);

  const startScanner = async (cameraId: string) => {
    setErrorMsg(null);
    setIsScanning(false);
    
    // Detener escaneo anterior si existía
    await stopScanner();

    try {
      const html5Qrcode = new Html5Qrcode(containerId);
      scannerRef.current = html5Qrcode;

      const config = {
        fps: 15,
        qrbox: (width: number, height: number) => {
          const size = Math.min(width, height) * 0.7;
          return { width: size, height: size };
        },
      };

      await html5Qrcode.start(
        cameraId,
        config,
        (decodedText) => {
          // Éxito al escanear
          try {
            // Retroalimentación háptica (vibración) si es soportada por el móvil
            if ('vibrate' in navigator) {
              navigator.vibrate(100);
            }
          } catch (e) {}

          toast(`Escaneado con éxito: ${decodedText}`, 'success');
          onScanSuccess(decodedText);
          onClose();
        },
        (errorMessage) => {
          // Logs silenciosos de no-lectura para no saturar la consola
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Error al iniciar escáner:', err);
      setErrorMsg(`No se pudo iniciar la cámara: ${err.message || err}`);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      if (scannerRef.current.isScanning) {
        try {
          await scannerRef.current.stop();
        } catch (err) {
          console.error('Error al detener escáner:', err);
        }
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === activeCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setActiveCameraId(cameras[nextIndex].id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className={`relative w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
        isDarkMode ? 'bg-[#030712] border-white/10 text-white' : 'bg-slate-900 border-slate-800 text-white'
      }`}>
        
        {/* Glow de fondo futurista */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-600/10 blur-[80px] pointer-events-none rounded-full" />

        {/* Header HUD */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.25em] text-white">Escáner de Planta</h3>
              <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mt-0.5">Visor QR de Viajeros</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Cámara y HUD Overlay */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[300px] sm:min-h-[360px]">
          
          {/* Contenedor del scanner HTML5 */}
          <div id={containerId} className="w-full h-full text-center" />

          {/* Overlay HUD de Realidad Aumentada */}
          {isScanning && !errorMsg && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6 z-20">
              
              {/* Esquinas de enfoque de neón */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white/10 flex items-center justify-center">
                
                {/* Esquina superior izquierda */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
                {/* Esquina superior derecha */}
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
                {/* Esquina inferior izquierda */}
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
                {/* Esquina inferior derecha */}
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />

                {/* Línea láser de escaneo en movimiento */}
                <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_12px_#00a3ff] animate-scanline" />
              </div>

              {/* Status pill superior */}
              <div className="bg-black/75 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-2 text-[8px] font-black uppercase tracking-widest mt-2">
                <Camera size={10} className="text-blue-400 animate-pulse" />
                <span>Cámara Activa</span>
              </div>

              {/* Instrucción inferior */}
              <div className="bg-black/85 backdrop-blur-md border border-white/5 rounded-2xl p-4 text-center max-w-[280px] mb-2 shadow-2xl">
                <p className="text-[10px] font-black text-white uppercase tracking-wide">Apunta al código QR</p>
                <p className="text-[8px] text-slate-500 font-bold uppercase mt-1 leading-relaxed">
                  Coloca el QR impreso en el centro del recuadro para abrir el viajero de producción.
                </p>
              </div>
            </div>
          )}

          {/* Estado de error */}
          {errorMsg && (
            <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center gap-4 z-30">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <ShieldAlert size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase tracking-widest text-rose-400">Error de Cámara</h4>
                <p className="text-[10px] text-slate-400 font-bold leading-relaxed max-w-[240px] mx-auto">{errorMsg}</p>
              </div>
              <button
                onClick={() => {
                  if (cameras.length > 0) startScanner(activeCameraId);
                  else onClose();
                }}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>

        {/* Footer Controles */}
        <div className="px-6 py-5 border-t border-white/5 bg-black/40 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-2">
            {cameras.length > 1 && (
              <button
                onClick={switchCamera}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all text-slate-300 hover:text-white"
              >
                <RefreshCw size={10} />
                Cambiar Cámara ({cameras.length})
              </button>
            )}
          </div>
          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1">
            <Sparkles size={9} className="text-blue-500" /> McVill Visor v1.4
          </span>
        </div>
      </div>
    </div>
  );
};
