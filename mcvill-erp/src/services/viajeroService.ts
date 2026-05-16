import { Viajero, ViajeroRuta, ViajeroMaterial, ViajeroParametrosMaterial } from '../types/viajero';

/**
 * 🚀 IA.AGUS: Motor de Lógica Industrial para Viajeros
 * Implementa cálculos automáticos de ingeniería y manufactura.
 */
export const viajeroService = {
  /**
   * Cálculo de Horas Estimadas:
   * Crea una función que calcule el tiempo total de la orden sumando el tiempo de 'Configurar' 
   * más el tiempo resultante de la 'Tasa Proceso' (multiplicado por la cantidad a fabricar) 
   * de todas las operaciones en la tabla Ruta.
   */
  calculateEstimatedHours: (rutas: ViajeroRuta[], cantidad: number): number => {
    if (!rutas || rutas.length === 0) return 0;
    
    const totalMinutes = rutas.reduce((sum, ruta) => {
      const config = Number(ruta.tiempo_configuracion) || 0;
      const tasa = Number(ruta.tasa_proceso) || 0;
      const operacionTotal = config + (tasa * cantidad);
      return sum + operacionTotal;
    }, 0);
    
    // Retornar en horas con 2 decimales
    return Number((totalMinutes / 60).toFixed(2));
  },

  /**
   * Parámetros de Corte de Material:
   * Crea una lógica de transformación para materiales crudos (láminas o tubos). 
   * Si el material es placa/lámina, debe calcular las 'Partes/Hoja' basado en la longitud y ancho. 
   * Si es tubo, debe calcular 'Partes/Barra' considerando la longitud de la parte y la merma del corte.
   */
  calculatePartsPerUnit: (tipo: 'placa' | 'tubo', params: Partial<ViajeroParametrosMaterial>): number => {
    if (tipo === 'placa') {
      // Estándar Industrial: Hoja de 4x8 pies (1220 x 2440 mm)
      const HOJA_W = 1220;
      const HOJA_L = 2440;
      
      const partW = params.ancho_parte || 0;
      const partL = params.longitud_parte || 0;
      
      if (partW <= 0 || partL <= 0) return 0;

      // Cálculo de aprovechamiento (Nesting básico)
      const orientation1 = Math.floor(HOJA_W / partW) * Math.floor(HOJA_L / partL);
      const orientation2 = Math.floor(HOJA_W / partL) * Math.floor(HOJA_L / partW);
      
      return Math.max(orientation1, orientation2);
    } else {
      // Estándar Industrial: Barra de 6.1 metros (6100 mm)
      const BARRA_L = 6100;
      const partL = params.longitud_parte || 0;
      const merma = params.merma_corte || 3; // Default 3mm por disco de corte
      
      if (partL <= 0) return 0;
      
      return Math.floor(BARRA_L / (partL + merma));
    }
  },

  /**
   * Anidamiento de Ensambles:
   * Lógica para procesar la jerarquía de sub-ensambles.
   */
  processEnsembleHierarchy: async (parentViajero: Viajero): Promise<Viajero[]> => {
    console.log(`🔍 IA.AGUS: Procesando jerarquía para ${parentViajero.numero_parte}`);
    // En una implementación real, esto consultaría recursivamente la tabla viajero_componentes
    // y recuperaría los datos de los Viajeros hijos.
    return [parentViajero]; // Retorna el array de viajeros a imprimir
  }
};
