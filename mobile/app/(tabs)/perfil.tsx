import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import type { User } from '@supabase/supabase-js';
import { checkConnectivity, getSyncQueue, syncQueue } from '../../lib/offline';

interface Stats {
  viajeros_activos: number;
  ops_completadas: number;
  inspecciones_hoy: number;
  pendientes_aprobacion: number;
}

export default function PerfilScreen() {
  const [user,        setUser]        = useState<User | null>(null);
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [loading,     setLoading]     = useState(true);
  
  // Offline sync panel state
  const [queueCount,  setQueueCount]  = useState<number>(0);
  const [queueItems,  setQueueItems]  = useState<any[]>([]);
  const [online,      setOnline]      = useState<boolean>(true);
  const [syncing,     setSyncing]     = useState<boolean>(false);

  const loadQueue = async () => {
    try {
      const q = await getSyncQueue();
      setQueueCount(q.length);
      setQueueItems(q);
      const isOnline = await checkConnectivity();
      setOnline(isOnline);
    } catch (e) {
      console.log('[Offline Panel] Error loading queue state:', e);
    }
  };

  useEffect(() => {
    loadQueue();
    const t = setInterval(loadQueue, 3500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user: u }, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;
        setUser(u);

        const today = new Date(); today.setHours(0,0,0,0);

        const [
          { count: va },
          { count: oc },
          { count: ih },
          { count: pa },
        ] = await Promise.all([
          supabase.from('viajeros').select('id', { count: 'exact', head: true }).not('estatus', 'in', '(completado,cancelado)'),
          supabase.from('viajero_operaciones').select('id', { count: 'exact', head: true }).eq('estatus', 'completado'),
          supabase.from('quality_inspections').select('id', { count: 'exact', head: true }).gte('inspection_date', today.toISOString()),
          supabase.from('viajero_operaciones').select('id', { count: 'exact', head: true }).eq('estatus', 'completado').is('aprobado_por', null),
        ]);

        setStats({
          viajeros_activos:      va ?? 0,
          ops_completadas:       oc ?? 0,
          inspecciones_hoy:      ih ?? 0,
          pendientes_aprobacion: pa ?? 0,
        });
      } catch (e) {
        console.error('Perfil load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const logout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que deseas salir del sistema?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  const role = user?.user_metadata?.role ?? user?.user_metadata?.display_name ?? '—';
  const name = user?.user_metadata?.full_name ?? user?.user_metadata?.display_name ?? user?.email?.split('@')[0] ?? 'Usuario';

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Avatar */}
        <View style={s.avatarCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={s.name}>{name}</Text>
          <Text style={s.email}>{user?.email}</Text>
          <View style={s.roleBadge}>
            <Ionicons name="shield-checkmark-outline" size={12} color={colors.accent} />
            <Text style={s.roleText}>{role}</Text>
          </View>
        </View>

        {/* Panel de Sincronización Offline */}
        <View style={s.syncCard}>
          <View style={s.syncHeader}>
            <Text style={s.syncTitle}>PANEL DE COLA OFFLINE</Text>
            <View style={[s.statusIndicator, { backgroundColor: online ? colors.accent + '20' : colors.warning + '20', borderColor: online ? colors.accent + '40' : colors.warning + '40' }]}>
              <View style={[s.statusDot, { backgroundColor: online ? colors.accent : colors.warning }]} />
              <Text style={[s.statusText, { color: online ? colors.accent : colors.warning }]}>
                {online ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </View>
          </View>

          <View style={s.syncBody}>
            <View style={s.syncStatRow}>
              <Ionicons name="cloud-upload-outline" size={24} color={queueCount > 0 ? colors.warning : colors.muted} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.syncStatVal}>{queueCount} pendientes</Text>
                <Text style={s.syncStatSub}>
                  {queueCount > 0 ? 'Datos retenidos listos para sincronizar' : 'Todos los datos están al día'}
                </Text>
              </View>
            </View>

            {queueCount > 0 ? (
              <View style={s.miniList}>
                {queueItems.slice(0, 3).map((item, idx) => (
                  <View key={item.id || idx} style={s.miniItem}>
                    <Ionicons 
                      name={item.action === 'insert' ? 'add-circle-outline' : 'git-compare-outline'} 
                      size={14} 
                      color={colors.muted} 
                    />
                    <Text style={s.miniItemText} numberOfLines={1}>
                      {item.action === 'insert' ? 'Alta' : 'Modificación'} en {item.table}
                    </Text>
                  </View>
                ))}
                {queueCount > 3 ? (
                  <Text style={s.moreText}>+ {queueCount - 3} elementos más en cola...</Text>
                ) : null}
              </View>
            ) : null}

            <TouchableOpacity 
              style={[s.syncBtn, syncing && s.syncBtnDisabled, queueCount === 0 && s.syncBtnInactive]} 
              disabled={syncing || queueCount === 0} 
              onPress={async () => {
                setSyncing(true);
                try {
                  const res = await syncQueue();
                  Alert.alert(
                    'Sincronización', 
                    `Proceso completado. Éxitos: ${res.successCount}. Errores: ${res.failedCount}.`
                  );
                  await loadQueue();
                } catch (e: any) {
                  Alert.alert('Error', e.message || 'Error al intentar sincronizar');
                } finally {
                  setSyncing(false);
                }
              }}
              activeOpacity={0.8}
            >
              {syncing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="sync-outline" size={18} color="#fff" />
                  <Text style={s.syncBtnText}>SINCRONIZAR COLA</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        {loading ? (
          <View style={s.statsCard}><ActivityIndicator color={colors.accent} /></View>
        ) : stats ? (
          <View style={s.statsCard}>
            <Text style={s.statsTitle}>RESUMEN DEL SISTEMA</Text>
            <View style={s.statsGrid}>
              <StatBox icon="document-text-outline" label="Viajeros activos"     value={stats.viajeros_activos}      color={colors.accent} />
              <StatBox icon="checkmark-done-outline" label="Ops completadas"     value={stats.ops_completadas}       color="#3b82f6" />
              <StatBox icon="shield-checkmark-outline" label="Inspecciones hoy"  value={stats.inspecciones_hoy}      color={colors.warning} />
              <StatBox icon="time-outline" label="Pend. aprobación"             value={stats.pendientes_aprobacion}  color={stats.pendientes_aprobacion > 0 ? colors.warning : colors.muted} />
            </View>
          </View>
        ) : null}

        {/* Info */}
        <View style={s.infoCard}>
          <InfoRow icon="hardware-chip-outline"  label="Sistema"     value="ERP IA PRO" />
          <InfoRow icon="cloud-outline"          label="Datos"       value="Supabase Cloud" />
          <InfoRow icon="phone-portrait-outline" label="Plataforma"  value="Expo SDK 52" />
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={s.logoutText}>CERRAR SESIÓN</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const StatBox: React.FC<{ icon: string; label: string; value: number; color: string }> = ({ icon, label, value, color }) => (
  <View style={sb.wrap}>
    <Ionicons name={icon as any} size={20} color={color} />
    <Text style={[sb.val, { color }]}>{value}</Text>
    <Text style={sb.lbl}>{label}</Text>
  </View>
);
const sb = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', gap: 4, padding: 12 },
  val:  { fontSize: 22, fontWeight: '900' },
  lbl:  { fontSize: 9, color: colors.muted, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },
});

const InfoRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={ir.row}>
    <Ionicons name={icon as any} size={16} color={colors.muted} />
    <Text style={ir.label}>{label}</Text>
    <Text style={ir.value}>{value}</Text>
  </View>
);
const ir = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { fontSize: 12, color: colors.muted, flex: 1 },
  value: { fontSize: 12, color: colors.sub, fontWeight: '600' },
});

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: colors.bg },
  scroll:     { padding: 20, gap: 16, paddingBottom: 40 },
  avatarCard: { backgroundColor: colors.card, borderRadius: 24, padding: 28, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border },
  avatar:     { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.accentDim, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.accent + '40', marginBottom: 4 },
  avatarText: { fontSize: 32, fontWeight: '900', color: colors.accent },
  name:       { fontSize: 20, fontWeight: '900', color: colors.text },
  email:      { fontSize: 13, color: colors.muted },
  roleBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accentDim, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: colors.accent + '30' },
  roleText:   { color: colors.accent, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  syncCard: { backgroundColor: colors.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border },
  syncHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  syncTitle: { fontSize: 9, fontWeight: '900', color: colors.muted, letterSpacing: 2 },
  statusIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  syncBody: { gap: 12 },
  syncStatRow: { flexDirection: 'row', alignItems: 'center' },
  syncStatVal: { color: colors.text, fontSize: 16, fontWeight: '800' },
  syncStatSub: { color: colors.muted, fontSize: 11, marginTop: 1 },
  miniList: { backgroundColor: colors.bg, borderRadius: 12, padding: 12, gap: 6, borderWidth: 1, borderColor: colors.border },
  miniItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniItemText: { color: colors.sub, fontSize: 11 },
  moreText: { color: colors.muted, fontSize: 10, fontStyle: 'italic', marginTop: 2 },
  syncBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accent, borderRadius: 16, height: 48, marginTop: 4 },
  syncBtnDisabled: { opacity: 0.6 },
  syncBtnInactive: { backgroundColor: colors.muted + '40', opacity: 0.8 },
  syncBtnText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  statsCard:  { backgroundColor: colors.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border },
  statsTitle: { fontSize: 9, fontWeight: '900', color: colors.muted, letterSpacing: 2, marginBottom: 12, textAlign: 'center' },
  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap' },
  infoCard:   { backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
  logoutBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: colors.danger + '40', backgroundColor: colors.danger + '0D', borderRadius: 16, height: 52 },
  logoutText: { color: colors.danger, fontWeight: '900', fontSize: 13, letterSpacing: 1.5 },
});
