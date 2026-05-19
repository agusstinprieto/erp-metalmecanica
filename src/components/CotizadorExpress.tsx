import React, { useState, useEffect } from 'react';
import { Calculator, AlertTriangle, TrendingUp, DollarSign, Settings, Scale, Loader2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useConfig } from '../contexts/ConfigContext';
import clsx from 'clsx';
import { toast } from '../lib/dialogs';
import { stripLeadingZeros, parseFormattedNumber } from '../utils/inputFormatters';

export const CotizadorExpress: React.FC = () => {
  const { isDarkMode } = useConfig();
  const [pesoNeto, setPesoNeto] = useState<number>(0);
  const [pesoNetoStr, setPesoNetoStr] = useState('0');
  const [materiales, setMateriales] = useState<any[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [loadingParams, setLoadingParams] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nombrePieza, setNombrePieza] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Variables Globales (desde Supabase)
  const [desperdicioPct, setDesperdicioPct] = useState(30);
  const [desperdicioPctStr, setDesperdicioPctStr] = useState('30');
  const [exchangeRate, setExchangeRate] = useState(19.56);
  const [exchangeRateStr, setExchangeRateStr] = useState('19.56');
  const [indirectosPct, setIndirectosPct] = useState(30);
  const [indirectosPctStr, setIndirectosPctStr] = useState('30');
  const [utilidadPct, setUtilidadPct] = useState(18);
  const [utilidadPctStr, setUtilidadPctStr] = useState('18');

  // Synchronize string states with numeric states
  useEffect(() => {
    const parsed = parseFormattedNumber(pesoNetoStr);
    if (parsed !== pesoNeto) {
      setPesoNetoStr(stripLeadingZeros(pesoNeto.toString()));
    }
  }, [pesoNeto]);

  useEffect(() => {
    const parsed = parseFormattedNumber(exchangeRateStr);
    if (parsed !== exchangeRate) {
      setExchangeRateStr(stripLeadingZeros(exchangeRate.toString()));
    }
  }, [exchangeRate]);

  useEffect(() => {
    const parsed = parseFormattedNumber(desperdicioPctStr);
    if (parsed !== desperdicioPct) {
      setDesperdicioPctStr(stripLeadingZeros(desperdicioPct.toString()));
    }
  }, [desperdicioPct]);

  useEffect(() => {
    const parsed = parseFormattedNumber(indirectosPctStr);
    if (parsed !== indirectosPct) {
      setIndirectosPctStr(stripLeadingZeros(indirectosPct.toString()));
    }
  }, [indirectosPct]);

  useEffect(() => {
    const parsed = parseFormattedNumber(utilidadPctStr);
    if (parsed !== utilidadPct) {
      setUtilidadPctStr(stripLeadingZeros(utilidadPct.toString()));
    }
  }, [utilidadPct]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingParams(true);
        
        // Cargar Parámetros Globales
        const { data: paramsData, error: paramsError } = await supabase
          .from('parametros_globales')
          .select('*')
          .eq('activo', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (paramsError) setErrorMessage(`Error parámetros: ${paramsError.message}`);

        if (paramsData) {
          setExchangeRate(Number(paramsData.tipo_cambio) || 19.56);
          setDesperdicioPct(Number(paramsData.porcentaje_desperdicio) * 100 || 30);
          setIndirectosPct(Number(paramsData.porcentaje_indirectos) * 100 || 30);
          setUtilidadPct(Number(paramsData.porcentaje_utilidad) * 100 || 18);
        }

        // Cargar Materiales
        const { data: matData, error: matError } = await supabase
          .from('materiales')
          .select('id, descripcion_mp, precio_total_usd_ton')
          .order('descripcion_mp', { ascending: true });

        if (matError) {
          setErrorMessage(`Error Materiales: ${matError.message}`);
        }

        if (matData && matData.length > 0) {
          setMateriales(matData);
          setSelectedMaterialId(matData[0].id);
          setErrorMessage(null);
        } else {
          if (!matError) setErrorMessage("La tabla de materiales está vacía en Supabase.");
        }
      } catch (err: any) {
        setErrorMessage(`Error crítico: ${err.message || 'Desconocido'}`);
      } finally {
        setLoadingParams(false);
      }
    };
    fetchData();
  }, []);

  const selectedMaterial = materiales.find(m => m.id === selectedMaterialId);
  const steelCostUsdKg = selectedMaterial ? Number(selectedMaterial.precio_total_usd_ton) / 1000 : 0;

  // Fórmulas Core (Calculadas primero en USD, luego convertidas a MXN)
  const pesoBruto = desperdicioPct >= 100 ? pesoNeto : pesoNeto / (1 - desperdicioPct / 100);
  const scrapWeight = Math.max(0, pesoBruto - pesoNeto);
  const scrapRecoveryRateUSD = steelCostUsdKg * 0.15; // Acreditación del 15% del valor del acero base
  const scrapRecoveryUSD = scrapWeight * scrapRecoveryRateUSD;
  const costoMaterialUSD = pesoBruto * steelCostUsdKg;
  const costoAceroNetoUSD = Math.max(0, costoMaterialUSD - scrapRecoveryUSD);
  
  const costoIndirectosUSD = costoAceroNetoUSD * (indirectosPct / 100);
  const costoTotalUSD = costoAceroNetoUSD + costoIndirectosUSD; // Subtotal
  
  const precioVentaUSD = costoTotalUSD / (1 - utilidadPct / 100);
  const utilidadUSD = precioVentaUSD - costoTotalUSD;

  // Conversión a MXN
  const precioVentaMXN = precioVentaUSD * exchangeRate;
  const utilidadMXN = utilidadUSD * exchangeRate;

  const handleSave = async () => {
    if (pesoNeto <= 0) return toast('Ingresa un peso neto mayor a 0', 'error');
    setSaving(true);
    try {
      const payload = {
        nombre_pieza: nombrePieza || 'Pieza Genérica',
        peso_neto_fw: pesoNeto,
        desperdicio_aplicado: desperdicioPct / 100,
        precio_acero_aplicado: steelCostUsdKg,
        costo_acero_usd: costoAceroNetoUSD, // Se guarda el costo de acero neto compensado por scrap
        subtotal_usd: costoTotalUSD,
        indirectos_usd: costoIndirectosUSD,
        utilidad_usd: utilidadUSD,
        precio_venta_final_usd: precioVentaUSD,
      };

      const { error } = await supabase.from('cotizaciones_express').insert(payload);
      if (error) throw error;
      
      toast('Cotización Express registrada en el historial', 'success');
      setPesoNeto(0);
      setNombrePieza('');
    } catch (err: any) {
      toast(`Error al guardar: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cyber-panel p-4 bg-[var(--mcvill-card)]/40 relative overflow-hidden border-mcvill-card-border shadow-2xl">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.1)]">
            <Calculator className="text-cyan-400" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-tight">Cotizador Express (ROI)</h3>
            <p className="text-[9px] text-cyan-400 font-black uppercase tracking-widest">Cálculo paramétrico en tiempo real</p>
          </div>
        </div>
      </div>

      <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-3 mb-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0 border border-cyan-500/20">
          <TrendingUp className="text-cyan-400" size={14} />
        </div>
        <div>
          <h4 className="text-[9px] font-black text-cyan-400 uppercase tracking-[0.2em] mb-0.5">Algoritmo Paramétrico</h4>
          <p className="text-[10px] text-slate-500 leading-tight">
            Cálculo basado en <span className="text-white font-bold">masa total (Peso Neto)</span>. Aplica desperdicio, indirectos y ROI en segundos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Inputs del Usuario */}
        <div className="space-y-4 lg:col-span-1">
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Nombre de la Pieza / Proyecto</label>
            <input 
              type="text" 
              value={nombrePieza}
              onChange={(e) => setNombrePieza(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 h-9 text-xs font-bold text-white focus:border-cyan-500/50 transition-all outline-none mb-4 shadow-inner"
              placeholder="Ej: Base Motor v1"
            />

            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Peso Neto (FW - Kgs)</label>
            <div className="relative group mb-4">
              <Scale className="absolute left-3 top-2.5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" size={16} />
              <input 
                type="text" 
                value={pesoNetoStr} 
                onChange={(e) => {
                  const clean = stripLeadingZeros(e.target.value);
                  setPesoNetoStr(clean);
                  setPesoNeto(parseFormattedNumber(clean));
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 h-10 text-base font-black text-white focus-border-cyan-500/50 transition-all outline-none"
                placeholder="0.00"
              />
            </div>

            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Material Base (Cotización Acero)</label>
            {materiales.length > 0 ? (
              <select 
                value={selectedMaterialId} 
                onChange={(e) => setSelectedMaterialId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 h-10 text-xs font-bold text-white focus:border-cyan-500/50 outline-none"
              >
                {materiales.map(m => (
                  <option key={m.id} value={m.id}>{m.descripcion_mp} (${Number(m.precio_total_usd_ton).toLocaleString()}/ton)</option>
                ))}
              </select>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="h-10 border border-slate-800 border-dashed rounded-lg flex items-center justify-center text-slate-600 text-[9px] font-bold uppercase tracking-widest bg-slate-950">
                  {loadingParams ? 'Cargando...' : 'No hay materiales'}
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3 relative">
            {loadingParams && <div className="absolute top-4 right-4"><Loader2 size={16} className="animate-spin text-cyan-500" /></div>}
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2">
              <Settings size={12} /> Parámetros Globales (Supabase)
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[8px] font-bold text-slate-400 uppercase">Costo Acero</label>
                <div className="text-cyan-400 font-mono text-[10px] font-bold">${steelCostUsdKg.toFixed(4)}</div>
              </div>
              <div>
                <label className="text-[8px] font-bold text-slate-400 uppercase">TC</label>
                <input 
                  type="text" 
                  value={exchangeRateStr} 
                  onChange={e => {
                    const clean = stripLeadingZeros(e.target.value);
                    setExchangeRateStr(clean);
                    setExchangeRate(parseFormattedNumber(clean));
                  }} 
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[10px] text-white" 
                />
              </div>
              <div>
                <label className="text-[8px] font-bold text-slate-400 uppercase">% Desp</label>
                <input 
                  type="text" 
                  value={desperdicioPctStr} 
                  onChange={e => {
                    const clean = stripLeadingZeros(e.target.value);
                    setDesperdicioPctStr(clean);
                    setDesperdicioPct(parseFormattedNumber(clean));
                  }} 
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[10px] text-white" 
                />
              </div>
              <div>
                <label className="text-[8px] font-bold text-slate-400 uppercase">% Ind</label>
                <input 
                  type="text" 
                  value={indirectosPctStr} 
                  onChange={e => {
                    const clean = stripLeadingZeros(e.target.value);
                    setIndirectosPctStr(clean);
                    setIndirectosPct(parseFormattedNumber(clean));
                  }} 
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[10px] text-white" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Resultados Compactos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                <div>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Masa Bruta (Nesting)</p>
                  <p className="text-[10px] text-slate-400 font-mono">{pesoBruto.toFixed(2)} kgs @ ${steelCostUsdKg.toFixed(3)}/kg</p>
                </div>
                <span className="text-sm font-bold text-white font-mono">${costoMaterialUSD.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              
              <div className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                <div>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Crédito Scrap Recuperado</p>
                  <p className="text-[10px] text-emerald-400 font-mono">{scrapWeight.toFixed(2)} kgs @ ${(scrapRecoveryRateUSD).toFixed(3)}/kg</p>
                </div>
                <span className="text-sm font-bold text-emerald-400 font-mono">-${scrapRecoveryUSD.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              
              <div className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                <div>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Costo Neto Acero</p>
                  <p className="text-[10px] text-slate-400 font-mono">Material Compensado</p>
                </div>
                <span className="text-sm font-bold text-white font-mono">${costoAceroNetoUSD.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              
              <div className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                <div>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Indirectos / Op</p>
                  <p className="text-[10px] text-slate-400 font-mono">{indirectosPct}% aplicado</p>
                </div>
                <span className="text-sm font-bold text-white font-mono">${costoIndirectosUSD.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
            </div>

            <div className="flex justify-between items-center mt-3 bg-cyan-950/20 p-3 rounded-lg border border-cyan-900/30">
              <p className="text-[9px] text-cyan-500 font-black uppercase tracking-widest">Costo Total (Break-even)</p>
              <span className="text-lg font-black text-cyan-400 font-mono">${costoTotalUSD.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD</span>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">Precio Sugerido</p>
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] text-slate-500 font-bold uppercase">Util:</span>
                    <input 
                      type="text" 
                      value={utilidadPctStr} 
                      onChange={e => {
                        const clean = stripLeadingZeros(e.target.value);
                        setUtilidadPctStr(clean);
                        setUtilidadPct(parseFormattedNumber(clean));
                      }} 
                      className="w-10 bg-slate-950 border border-emerald-900/50 text-emerald-400 rounded px-1 text-[10px] text-center font-bold outline-none" 
                    />
                    <span className="text-[10px] text-emerald-500 font-black">%</span>
                  </div>
                </div>
                <p className="text-3xl font-black text-white font-mono tracking-tighter leading-none">
                  ${precioVentaUSD.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
                <p className="text-sm font-bold text-cyan-400 font-mono">
                  ${precioVentaMXN.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})} MXN
                </p>
              </div>

              <div className="bg-emerald-950/10 p-3 rounded-lg border border-emerald-900/20 flex flex-col justify-center relative group">
                <p className="text-[9px] text-emerald-600 font-black uppercase tracking-widest flex items-center gap-2 mb-1">
                  <TrendingUp size={10} /> ROI / Utilidad
                </p>
                <p className="text-2xl font-black text-emerald-400 font-mono tracking-tighter leading-none">
                  +${utilidadUSD.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
                
                <button 
                  onClick={handleSave}
                  disabled={saving || pesoNeto <= 0}
                  className="absolute bottom-3 right-3 p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/40 disabled:opacity-50 disabled:grayscale"
                >
                  {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
