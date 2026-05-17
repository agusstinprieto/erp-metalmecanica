import React, { useState, useCallback } from 'react';
import type { RFQCotizacion, RFQEstado } from '../types/quote.types';
import { updateEstado } from '../services/quoteService';

export function useQuoteStatus(
  rfqs: RFQCotizacion[],
  setRfqs: React.Dispatch<React.SetStateAction<RFQCotizacion[]>>,
  tenantId: string
) {
  const [movingId, setMovingId] = useState<string | null>(null);

  const moveTo = useCallback(async (id: string, newEstado: RFQEstado) => {
    // Capture original estado before optimistic update so rollback can restore it
    const originalEstado = rfqs.find(r => r.id === id)?.estado;

    setRfqs(prev =>
      prev.map(r => r.id === id ? {
        ...r,
        estado: newEstado,
        ...(newEstado === 'enviada' ? { fecha_envio: new Date().toISOString().split('T')[0] } : {})
      } : r)
    );
    setMovingId(id);
    try {
      await updateEstado(id, newEstado, tenantId);
    } catch (e) {
      console.error('Failed to update RFQ estado:', e);
      if (originalEstado) {
        setRfqs(prev => prev.map(r => r.id === id ? { ...r, estado: originalEstado } : r));
      }
    } finally {
      setMovingId(null);
    }
  }, [rfqs, setRfqs, tenantId]);

  return { moveTo, movingId };
}
