import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';

interface DashStats {
  viajeros_activos: number;
  ops_hoy: number;
  presentes_hoy: number;
  retardos_hoy: number;
  total_empleados: number;
  inspecciones_hoy: number;
  pass_rate: number;
  pendientes_aprobacion: number;
}

interface ViajeroRow {
  id: string;
  numero_parte: string;
  cliente: string;
  descripcion_ensamble?: string;
  progreso?: number;
}

function todayISO() { return new Date().toISOString().split('T')[0]; }
function todayStart() { const d = new Date(); d.setUTCHours(0,0,0,0); return d.toISOString(); }

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function DashboardScreen() {
  const [stats,    setStats]    = useState<DashStats | null>(null);
  const [viajeros, setViajeros] = useState<ViajeroRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [refresh,  setRefresh]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const date  = todayISO();
      const start = todayStart();

      const [
        { count: va },
        { count: oc },
        { count: ph },
        { count: rh },
        { data: inspData },
        { count: pa },
        { count: te },
        { data: vData },
      ] = await Promise.all([
        supabase.from('viajeros').select('id', { count: 'exact', head: true })
          .not('estatus', 'in', '(completado,cancelado)'),
        supabase.from('viajero_operaciones').select('id', { count: 'exact', head: true })
          .eq('estatus', 'completado').gte('updated_at', start),
        supabase.from('time_attendance').select('id', { count: 'exact', head: true })
          .eq('date', date).in('status', ['present', 'late']),
        supabase.from('time_attendance').select('id', { count: 'exact', head: true })
          .eq('date', date).eq('status', 'late'),
        supabase.from('quality_inspections')
          .select('quantity_inspected,quantity_passed').gte('inspection_date', start),
        supabase.from('viajero_operaciones').select('id', { count: 'exact', head: true })
          .eq('estatus', 'completado').is('aprobado_por', null),
        supabase.from('employees').select('id', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase.from('viajeros')
          .select('id,numero_parte,cliente,descripcion_ensamble')
          .not('estatus', 'in', '(completado,cancelado)')
          .limit(5),
      ]);

      let passRate = 0;
      if (inspData && inspData.length > 0) {
        const totalI = inspData.reduce((a, x) => a + (x.quantity_inspected || 0), 0);
        const totalP = inspData.reduce((a, x) => a + (x.quantity_passed    || 0), 0);
        passRate = totalI > 0 ? Math.round((totalP / totalI) * 100) : 0;
      }

      setStats({
        viajeros_activos:      va ?? 0,
        ops_hoy:               oc ?? 0,
        presentes_hoy:         ph ?? 0,
        retardos_hoy:          rh ?? 0,
        total_empleados:       te ?? 0,
        inspecciones_hoy:      inspData?.length ?? 0,
        pass_rate:             passRate,
        pendientes_aprobacion: pa ?? 0,
      });
      setViajeros((vData || []) as ViajeroRow[]);
    } catch (e: any) {
      setError('Error al cargar datos. Desliza para reintentar.');
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dateLabel = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const asistPct = stats && stats.total_empleados > 0
    ? Math.round((stats.presentes_hoy / stats.total_empleados) * 100)
    : 0;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refresh}
            onRefresh={() => { setRefresh(true); load(); }}
            tintColor={colors.accent}
          />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{greeting()}</Text>
            <Text style={s.date} numberOfLines={1}>{dateLabel}</Text>
          </View>
          <View style={s.liveBadge}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>EN VIVO</Text>
          </View>
        </View>

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={s.loadingText}>Cargando indicadores...</Text>
          </View>
        ) : error ? (
          <View style={s.center}>
            <Ionicons name="cloud-offline-outline" size={48} color={colors.muted} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : stats ? (
          <>
            {/* KPI Grid 2×3 */}
            <View style={s.grid}>
              <KPI
                icon="document-text"
                label="Viajeros activos"
                value={String(stats.viajeros_activos)}
                color={colors.accent}
              />
              <KPI
                icon="checkmark-done"
                label="Ops completadas hoy"
                value={String(stats.ops_hoy)}
                color="#3b82f6"
              />
              <KPI
                icon="people"
                label="Asistencia"
                value={`${stats.presentes_hoy}/${stats.total_empleados}`}
                sub={`${asistPct}% presentes`}
                color={asistPct >= 90 ? colors.accent : colors.warning}
              />
              <KPI
                icon="time"
                label="Retardos hoy"
                value={String(stats.retardos_hoy)}
                color={stats.retardos_hoy > 0 ? colors.warning : colors.muted}
              />
              <KPI
                icon="shield-checkmark"
                label="Pass rate calidad"
                value={stats.inspecciones_hoy > 0 ? `${stats.pass_rate}%` : '—'}
                sub={stats.inspecciones_hoy > 0 ? `${stats.inspecciones_hoy} insp.` : 'Sin inspecciones'}
                color={
                  stats.inspecciones_hoy === 0 ? colors.muted :
                  stats.pass_rate >= 95 ? colors.accent :
                  stats.pass_rate >= 80 ? colors.warning : colors.danger
                }
              />
              <KPI
                icon="alert-circle"
                label="Pendientes aprobación"
                value={String(stats.pendientes_aprobacion)}
                color={stats.pendientes_aprobacion > 0 ? colors.warning : colors.muted}
              />
            </View>

            {/* Asistencia bar */}
            <View style={s.card}>
              <View style={s.cardHead}>
                <Text style={s.cardTitle}>ASISTENCIA HOY</Text>
                <Text style={s.cardBadge}>{asistPct}%</Text>
              </View>
              <View style={s.barBg}>
                <View style={[s.barFill, {
                  width: `${asistPct}%`,
                  backgroundColor: asistPct >= 90 ? colors.accent : colors.warning,
                }]} />
              </View>
              <View style={s.barLabels}>
                <Text style={s.barLabel}>
                  <Text style={{ color: colors.accent }}>{stats.presentes_hoy} presentes</Text>
                  {stats.retardos_hoy > 0 && (
                    <Text style={{ color: colors.warning }}>  ·  {stats.retardos_hoy} retardos</Text>
                  )}
                </Text>
                <Text style={s.barLabel}>{stats.total_empleados} total</Text>
              </View>
            </View>

            {/* Viajeros en producción */}
            {viajeros.length > 0 && (
              <View style={s.card}>
                <Text style={s.cardTitle}>ÓRDENES ACTIVAS</Text>
                {viajeros.map((v, idx) => (
                  <View key={v.id} style={[s.viajeroRow, idx < viajeros.length - 1 && s.viajeroRowBorder]}>
                    <View style={s.viajeroBullet}>
                      <Text style={s.viajeroBulletText}>{idx + 1}</Text>
                    </View>
                    <View style={s.viajeroInfo}>
                      <Text style={s.viajeroNum}>{v.numero_parte}</Text>
                      <Text style={s.viajeroSub} numberOfLines={1}>
                        {v.cliente}{v.descripcion_ensamble ? ` · ${v.descripcion_ensamble}` : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={colors.muted} />
                  </View>
                ))}
              </View>
            )}

            {/* Alertas */}
            {(stats.pendientes_aprobacion > 0 || stats.retardos_hoy > 0) && (
              <View style={[s.card, s.alertCard]}>
                <Text style={[s.cardTitle, { color: colors.warning }]}>ALERTAS</Text>
                {stats.pendientes_aprobacion > 0 && (
                  <View style={s.alertRow}>
                    <Ionicons name="hourglass-outline" size={16} color={colors.warning} />
                    <Text style={s.alertText}>
                      {stats.pendientes_aprobacion} operación{stats.pendientes_aprobacion !== 1 ? 'es' : ''} pendiente{stats.pendientes_aprobacion !== 1 ? 's' : ''} de aprobación
                    </Text>
                  </View>
                )}
                {stats.retardos_hoy > 0 && (
                  <View style={s.alertRow}>
                    <Ionicons name="time-outline" size={16} color={colors.warning} />
                    <Text style={s.alertText}>
                      {stats.retardos_hoy} empleado{stats.retardos_hoy !== 1 ? 's' : ''} llegó tarde hoy
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const KPI: React.FC<{
  icon: string; label: string; value: string; color: string; sub?: string;
}> = ({ icon, label, value, color, sub }) => (
  <View style={kpi.card}>
    <Ionicons name={icon as any} size={20} color={color} />
    <Text style={[kpi.value, { color }]}>{value}</Text>
    <Text style={kpi.label}>{label}</Text>
    {sub ? <Text style={kpi.sub}>{sub}</Text> : null}
  </View>
);

const kpi = StyleSheet.create({
  card:  { width: '47%', backgroundColor: colors.card, borderRadius: 16, padding: 14, alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.border },
  value: { fontSize: 22, fontWeight: '900' },
  label: { fontSize: 9, color: colors.muted, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },
  sub:   { fontSize: 9, color: colors.muted, textAlign: 'center' },
});

const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: colors.bg },
  scroll:          { padding: 16, paddingBottom: 40, gap: 14 },

  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting:        { fontSize: 22, fontWeight: '900', color: colors.text },
  date:            { fontSize: 12, color: colors.muted, marginTop: 2, textTransform: 'capitalize', maxWidth: 220 },
  liveBadge:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accentDim, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: colors.accent + '30' },
  liveDot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  liveText:        { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },

  center:          { paddingVertical: 80, alignItems: 'center', gap: 12 },
  loadingText:     { color: colors.muted, fontSize: 13 },
  errorText:       { color: colors.muted, fontSize: 13, textAlign: 'center' },

  grid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },

  card:            { backgroundColor: colors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 12 },
  alertCard:       { borderColor: colors.warning + '30' },
  cardHead:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle:       { fontSize: 10, fontWeight: '900', color: colors.muted, letterSpacing: 2 },
  cardBadge:       { fontSize: 13, fontWeight: '900', color: colors.accent },

  barBg:           { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  barFill:         { height: '100%', borderRadius: 3 },
  barLabels:       { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel:        { fontSize: 11, color: colors.muted },

  viajeroRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  viajeroRowBorder:{ borderBottomWidth: 1, borderBottomColor: colors.border },
  viajeroBullet:   { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accentDim, alignItems: 'center', justifyContent: 'center' },
  viajeroBulletText:{ color: colors.accent, fontSize: 11, fontWeight: '800' },
  viajeroInfo:     { flex: 1 },
  viajeroNum:      { color: colors.text, fontSize: 13, fontWeight: '700' },
  viajeroSub:      { color: colors.muted, fontSize: 11, marginTop: 1 },

  alertRow:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  alertText:       { color: colors.sub, fontSize: 13, flex: 1 },
});
