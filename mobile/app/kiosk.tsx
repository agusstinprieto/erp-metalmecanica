import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Vibration } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

type ResultState = {
  type: 'checkin' | 'checkout' | 'complete';
  employeeName: string;
  time: string;
} | null;

function nowISO() { return new Date().toISOString(); }
function todayDate() { return new Date().toISOString().split('T')[0]; }
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function KioskScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned,    setScanned]    = useState(false);
  const [resolving,  setResolving]  = useState(false);
  const [error,      setError]      = useState('');
  const [result,     setResult]     = useState<ResultState>(null);

  const reset = useCallback(() => {
    setScanned(false);
    setResolving(false);
    setError('');
    setResult(null);
  }, []);

  const handleBarcode = useCallback(async ({ data }: { data: string }) => {
    if (scanned || resolving) return;
    setScanned(true);
    setResolving(true);
    setError('');
    Vibration.vibrate(80);

    try {
      // Buscar empleado por employee_number (lo que va codificado en el QR del gafete)
      const { data: emp } = await supabase
        .from('employees')
        .select('id, employee_number, first_name, last_name')
        .eq('employee_number', data.trim())
        .maybeSingle();

      if (!emp) {
        setError(`Empleado no encontrado: "${data}"`);
        setResolving(false);
        setTimeout(reset, 3500);
        return;
      }

      const fullName = `${emp.first_name} ${emp.last_name}`;
      const dateStr  = todayDate();
      const now      = nowISO();

      // Verificar si ya tiene checada hoy
      const { data: existing } = await supabase
        .from('time_attendance')
        .select('id, check_in, check_out')
        .eq('employee_id', emp.employee_number)
        .eq('date', dateStr)
        .maybeSingle();

      if (!existing) {
        // Primera checada del día → Entrada
        const isLate = new Date().getHours() > 8 || (new Date().getHours() === 8 && new Date().getMinutes() > 10);
        await supabase.from('time_attendance').insert({
          employee_id:   emp.employee_number,
          employee_name: fullName,
          date:          dateStr,
          check_in:      now,
          method:        'qr_kiosk',
          status:        isLate ? 'late' : 'present',
          location:      'planta',
          created_by:    'kiosk',
        });
        setResult({ type: 'checkin', employeeName: fullName, time: fmtTime(now) });

      } else if (existing.check_in && !existing.check_out) {
        // Ya tiene entrada pero no salida → Salida
        const checkIn     = new Date(existing.check_in);
        const nowDate     = new Date(now);
        const diffMin     = Math.round((nowDate.getTime() - checkIn.getTime()) / 60000);
        const regularMin  = Math.min(diffMin, 8 * 60);
        const overtimeMin = Math.max(0, diffMin - 8 * 60);

        await supabase.from('time_attendance').update({
          check_out:       now,
          minutes_worked:  regularMin,
          overtime_minutes: overtimeMin,
        }).eq('id', existing.id);

        setResult({ type: 'checkout', employeeName: fullName, time: fmtTime(now) });

      } else {
        // Ya tiene ambas checadas
        setResult({ type: 'complete', employeeName: fullName, time: fmtTime(existing.check_out!) });
      }
    } catch (e: any) {
      setError(e.message || 'Error al registrar asistencia');
    } finally {
      setResolving(false);
      // Auto-reset a los 3 segundos para el siguiente empleado
      setTimeout(reset, 3000);
    }
  }, [scanned, resolving, reset]);

  if (!permission) {
    return <View style={s.root}><ActivityIndicator color={colors.accent} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={s.root}>
        <Ionicons name="camera-outline" size={64} color={colors.muted} />
        <Text style={s.permText}>Se necesita acceso a la cámara para el kiosk de asistencia</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permBtnText}>PERMITIR CÁMARA</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={s.cancelLink}>
          <Text style={s.cancelText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const resultConfig = result ? {
    checkin:  { icon: 'log-in',         color: colors.accent,  label: 'ENTRADA REGISTRADA' },
    checkout: { icon: 'log-out',        color: colors.warning, label: 'SALIDA REGISTRADA'  },
    complete: { icon: 'checkmark-done', color: colors.muted,   label: 'JORNADA COMPLETA'   },
  }[result.type] : null;

  return (
    <View style={s.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'datamatrix'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcode}
      />

      <View style={s.overlay}>
        {/* Top bar */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={s.topCenter}>
            <Ionicons name="finger-print-outline" size={16} color={colors.accent} />
            <Text style={s.topTitle}>KIOSK · CONTROL DE ASISTENCIA</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* Reticle */}
        {!result && !resolving && (
          <View style={s.reticleWrap}>
            <View style={s.reticle}>
              <View style={[s.corner, s.tl]} />
              <View style={[s.corner, s.tr]} />
              <View style={[s.corner, s.bl]} />
              <View style={[s.corner, s.br]} />
            </View>
            <Text style={s.hint}>Escanea el gafete QR del empleado</Text>
          </View>
        )}

        {/* Resolving spinner */}
        {resolving && (
          <View style={s.feedbackWrap}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={s.feedbackText}>Registrando...</Text>
          </View>
        )}

        {/* Resultado exitoso */}
        {result && resultConfig && (
          <View style={s.feedbackWrap}>
            <View style={[s.resultIcon, { backgroundColor: resultConfig.color + '22', borderColor: resultConfig.color }]}>
              <Ionicons name={resultConfig.icon as any} size={48} color={resultConfig.color} />
            </View>
            <Text style={[s.resultLabel, { color: resultConfig.color }]}>{resultConfig.label}</Text>
            <Text style={s.resultName}>{result.employeeName}</Text>
            <Text style={s.resultTime}>{result.time}</Text>
          </View>
        )}

        {/* Error */}
        {error ? (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Footer hint */}
        <View style={s.footer}>
          <Text style={s.footerText}>McVill ERP · Modo Kiosk</Text>
        </View>
      </View>
    </View>
  );
}

const CORNER = 32;
const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  overlay:     { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },

  topBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, backgroundColor: 'rgba(0,0,0,0.75)' },
  closeBtn:    { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 22 },
  topCenter:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topTitle:    { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },

  reticleWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 28 },
  reticle:     { width: 260, height: 260, position: 'relative' },
  corner:      { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.accent, borderWidth: 3 },
  tl:          { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  tr:          { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  bl:          { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  br:          { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  hint:        { color: 'rgba(255,255,255,0.75)', fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },

  feedbackWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 40 },
  feedbackText: { color: '#fff', fontSize: 16 },
  resultIcon:   { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  resultLabel:  { fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  resultName:   { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  resultTime:   { color: 'rgba(255,255,255,0.6)', fontSize: 32, fontWeight: '200', letterSpacing: 3 },

  errorBox:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.danger + 'CC', borderRadius: 14, padding: 16, marginHorizontal: 40, marginBottom: 40 },
  errorText:   { color: '#fff', fontSize: 13, flex: 1 },

  footer:      { padding: 20, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  footerText:  { color: 'rgba(255,255,255,0.3)', fontSize: 11, letterSpacing: 1 },

  permText:    { color: colors.text, fontSize: 15, textAlign: 'center', marginHorizontal: 32, marginVertical: 16 },
  permBtn:     { backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  permBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 1 },
  cancelLink:  { marginTop: 16 },
  cancelText:  { color: colors.muted, fontSize: 14 },
});
