import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';

interface AttendanceRecord {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  minutes_worked: number | null;
  overtime_minutes: number;
  status: string;
  location: string;
}

interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  job_title: string;
  department: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  present:    { label: 'Presente',    color: colors.accent,   icon: 'checkmark-circle' },
  late:       { label: 'Retardo',     color: colors.warning,  icon: 'time' },
  absent:     { label: 'Ausente',     color: colors.danger,   icon: 'close-circle' },
  incomplete: { label: 'Incompleto',  color: colors.warning,  icon: 'alert-circle' },
  holiday:    { label: 'Festivo',     color: colors.muted,    icon: 'calendar' },
  vacation:   { label: 'Vacaciones',  color: '#3b82f6',       icon: 'airplane' },
};

function fmtTime(iso: string | null): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}

function minutesToHHMM(min: number | null): string {
  if (!min || min <= 0) return '0h 0m';
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export default function AsistenciaScreen() {
  const router = useRouter();
  const [employee, setEmployee]     = useState<Employee | null>(null);
  const [today, setToday]           = useState<AttendanceRecord | null>(null);
  const [history, setHistory]       = useState<AttendanceRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [refresh, setRefresh]       = useState(false);
  const [clock, setClock]           = useState(new Date());

  // Reloj en tiempo real
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar empleado por email
      const { data: emp } = await supabase
        .from('employees')
        .select('id, employee_number, first_name, last_name, job_title, department')
        .eq('email', user.email)
        .maybeSingle();

      if (!emp) { setLoading(false); setRefresh(false); return; }
      setEmployee(emp);

      const dateStr = todayISO();

      // Checada de hoy
      const { data: rec } = await supabase
        .from('time_attendance')
        .select('*')
        .eq('employee_id', emp.employee_number)
        .eq('date', dateStr)
        .maybeSingle();

      setToday(rec || null);

      // Historial últimos 7 días (sin hoy)
      const { data: hist } = await supabase
        .from('time_attendance')
        .select('*')
        .eq('employee_id', emp.employee_number)
        .lt('date', dateStr)
        .order('date', { ascending: false })
        .limit(7);

      setHistory(hist || []);
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCheckin = async () => {
    if (!employee || saving) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const dateStr = todayISO();
      const isLate = new Date().getHours() > 8 || (new Date().getHours() === 8 && new Date().getMinutes() > 10);

      const { data, error } = await supabase
        .from('time_attendance')
        .insert({
          employee_id: employee.employee_number,
          employee_name: `${employee.first_name} ${employee.last_name}`,
          date: dateStr,
          check_in: now,
          method: 'mobile_gps',
          status: isLate ? 'late' : 'present',
          location: 'planta',
          created_by: employee.employee_number,
        })
        .select()
        .single();

      if (error) throw error;
      setToday(data);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo registrar la entrada');
    } finally {
      setSaving(false);
    }
  };

  const handleCheckout = async () => {
    if (!employee || !today || saving) return;
    setSaving(true);
    try {
      const now = new Date();
      const checkIn = new Date(today.check_in!);
      const diffMin = Math.round((now.getTime() - checkIn.getTime()) / 60000);
      const regularMin = Math.min(diffMin, 8 * 60); // máx 8h regulares
      const overtimeMin = Math.max(0, diffMin - 8 * 60);

      const { data, error } = await supabase
        .from('time_attendance')
        .update({
          check_out: now.toISOString(),
          minutes_worked: regularMin,
          overtime_minutes: overtimeMin,
        })
        .eq('id', today.id)
        .select()
        .single();

      if (error) throw error;
      setToday(data);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo registrar la salida');
    } finally {
      setSaving(false);
    }
  };

  // ─── Determinar estado del botón principal ────────────────────────────────
  const hasCheckIn  = !!today?.check_in;
  const hasCheckOut = !!today?.check_out;
  const isComplete  = hasCheckIn && hasCheckOut;

  const btnLabel  = !hasCheckIn ? 'REGISTRAR ENTRADA' : !hasCheckOut ? 'REGISTRAR SALIDA' : 'JORNADA COMPLETA';
  const btnColor  = !hasCheckIn ? colors.accent : !hasCheckOut ? colors.warning : colors.muted;
  const btnIcon   = !hasCheckIn ? 'log-in' : !hasCheckOut ? 'log-out' : 'checkmark-done';
  const btnAction = !hasCheckIn ? handleCheckin : !hasCheckOut ? handleCheckout : undefined;

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (!employee) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.emptyWrap}>
          <Ionicons name="person-circle-outline" size={64} color={colors.muted} />
          <Text style={s.emptyTitle}>Empleado no encontrado</Text>
          <Text style={s.emptySub}>Tu cuenta no está vinculada a un empleado activo.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => { setRefresh(true); loadData(); }} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerName}>{employee.first_name} {employee.last_name}</Text>
            <Text style={s.headerSub}>{employee.job_title} · {employee.department}</Text>
          </View>
          {/* Botón kiosk (modo escáner de planta) */}
          <TouchableOpacity style={s.kioskBtn} onPress={() => router.push('/kiosk')}>
            <Ionicons name="qr-code-outline" size={18} color={colors.accent} />
            <Text style={s.kioskBtnText}>KIOSK</Text>
          </TouchableOpacity>
        </View>

        {/* Reloj */}
        <View style={s.clockCard}>
          <Text style={s.clockTime}>
            {clock.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </Text>
          <Text style={s.clockDate}>
            {clock.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>

        {/* Checadas de hoy */}
        <View style={s.todayCard}>
          <Text style={s.sectionTitle}>HOY</Text>
          <View style={s.checksRow}>
            <View style={s.checkItem}>
              <Ionicons name="log-in-outline" size={20} color={hasCheckIn ? colors.accent : colors.muted} />
              <Text style={s.checkLabel}>Entrada</Text>
              <Text style={[s.checkTime, { color: hasCheckIn ? colors.text : colors.muted }]}>
                {fmtTime(today?.check_in ?? null)}
              </Text>
            </View>
            <View style={s.divider} />
            <View style={s.checkItem}>
              <Ionicons name="log-out-outline" size={20} color={hasCheckOut ? colors.warning : colors.muted} />
              <Text style={s.checkLabel}>Salida</Text>
              <Text style={[s.checkTime, { color: hasCheckOut ? colors.text : colors.muted }]}>
                {fmtTime(today?.check_out ?? null)}
              </Text>
            </View>
            <View style={s.divider} />
            <View style={s.checkItem}>
              <Ionicons name="timer-outline" size={20} color={isComplete ? colors.accent : colors.muted} />
              <Text style={s.checkLabel}>Horas</Text>
              <Text style={[s.checkTime, { color: isComplete ? colors.text : colors.muted }]}>
                {minutesToHHMM(today?.minutes_worked ?? null)}
              </Text>
            </View>
          </View>
          {today?.overtime_minutes ? (
            <View style={s.overtimeBadge}>
              <Ionicons name="flash" size={13} color={colors.warning} />
              <Text style={s.overtimeText}>Horas extra: {minutesToHHMM(today.overtime_minutes)}</Text>
            </View>
          ) : null}
        </View>

        {/* Botón principal */}
        <TouchableOpacity
          style={[s.mainBtn, { backgroundColor: btnColor + '22', borderColor: btnColor }, isComplete && s.mainBtnDisabled]}
          onPress={btnAction}
          disabled={isComplete || saving}
          activeOpacity={0.75}
        >
          {saving
            ? <ActivityIndicator color={btnColor} />
            : <>
                <Ionicons name={btnIcon as any} size={28} color={btnColor} />
                <Text style={[s.mainBtnText, { color: btnColor }]}>{btnLabel}</Text>
              </>
          }
        </TouchableOpacity>

        {/* Historial reciente */}
        {history.length > 0 && (
          <View style={s.historySection}>
            <Text style={s.sectionTitle}>ÚLTIMOS 7 DÍAS</Text>
            {history.map(rec => {
              const cfg = STATUS_CONFIG[rec.status] ?? STATUS_CONFIG.present;
              return (
                <View key={rec.id} style={s.histRow}>
                  <View style={[s.histStatus, { backgroundColor: cfg.color + '22' }]}>
                    <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
                  </View>
                  <View style={s.histInfo}>
                    <Text style={s.histDate}>{fmtDate(rec.date)}</Text>
                    <Text style={s.histTimes}>
                      {fmtTime(rec.check_in)} → {fmtTime(rec.check_out)}
                    </Text>
                  </View>
                  <View style={s.histRight}>
                    <Text style={s.histHours}>{minutesToHHMM(rec.minutes_worked)}</Text>
                    <Text style={[s.histLabel, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.bg },
  scroll:       { padding: 16, paddingBottom: 32 },

  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerName:   { color: colors.text, fontSize: 18, fontWeight: '700' },
  headerSub:    { color: colors.sub,  fontSize: 12, marginTop: 2 },
  kioskBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.accentDim, borderRadius: 10, borderWidth: 1, borderColor: colors.accent + '30' },
  kioskBtnText: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  clockCard:    { backgroundColor: colors.card, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  clockTime:    { color: colors.text, fontSize: 42, fontWeight: '200', letterSpacing: 2 },
  clockDate:    { color: colors.sub,  fontSize: 13, marginTop: 4, textTransform: 'capitalize' },

  todayCard:    { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12 },
  checksRow:    { flexDirection: 'row', justifyContent: 'space-between' },
  checkItem:    { flex: 1, alignItems: 'center', gap: 4 },
  divider:      { width: 1, backgroundColor: colors.border },
  checkLabel:   { color: colors.muted, fontSize: 11 },
  checkTime:    { fontSize: 18, fontWeight: '600' },

  overtimeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, backgroundColor: colors.warning + '18', borderRadius: 8, padding: 8 },
  overtimeText:  { color: colors.warning, fontSize: 12, fontWeight: '600' },

  mainBtn:      { borderRadius: 16, borderWidth: 1.5, padding: 20, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 },
  mainBtnDisabled: { opacity: 0.5 },
  mainBtnText:  { fontSize: 17, fontWeight: '800', letterSpacing: 1 },

  historySection: { gap: 8 },
  histRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 12, gap: 12, borderWidth: 1, borderColor: colors.border },
  histStatus:   { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  histInfo:     { flex: 1, gap: 2 },
  histDate:     { color: colors.text, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  histTimes:    { color: colors.sub,  fontSize: 11 },
  histRight:    { alignItems: 'flex-end', gap: 2 },
  histHours:    { color: colors.text, fontSize: 13, fontWeight: '700' },
  histLabel:    { fontSize: 10, fontWeight: '600' },

  emptyWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 40 },
  emptyTitle:   { color: colors.text, fontSize: 16, fontWeight: '700' },
  emptySub:     { color: colors.muted, fontSize: 13, textAlign: 'center' },
});
