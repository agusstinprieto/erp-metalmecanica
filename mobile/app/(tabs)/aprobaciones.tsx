import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { checkConnectivity, enqueueAction, syncQueue } from '../../lib/offline';

interface PendingOp {
  id: string;
  viajero_id: string;
  orden: number;
  nombre_operacion: string;
  centro_trabajo: string;
  completado_por?: string;
  completado_en?: string;
  notas_campo?: string;
  // joined
  numero_parte?: string;
  cliente?: string;
}

export default function AprobacionesScreen() {
  const router = useRouter();
  const [ops,      setOps]      = useState<PendingOp[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [refresh,  setRefresh]  = useState(false);
  const [comment,  setComment]  = useState<Record<string, string>>({});
  const [acting,   setActing]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      await syncQueue().catch(e => console.log('[Offline] Sync error on approvals load:', e));
    } catch {}

    // Buscar operaciones completadas que aún no tienen aprobacion_supervisor
    const { data } = await supabase
      .from('viajero_operaciones')
      .select(`
        id, viajero_id, orden, nombre_operacion, centro_trabajo,
        completado_por, completado_en, notas_campo,
        viajeros!inner(numero_parte, cliente)
      `)
      .eq('estatus', 'completado')
      .is('aprobado_por', null)
      .order('completado_en', { ascending: false })
      .limit(50);

    const mapped = (data || []).map((r: any) => ({
      ...r,
      numero_parte: r.viajeros?.numero_parte,
      cliente:      r.viajeros?.cliente,
    }));
    setOps(mapped);
    setLoading(false);
    setRefresh(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (op: PendingOp, approved: boolean) => {
    setActing(op.id);
    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    const now = new Date().toISOString();
    const isOnline = await checkConnectivity();

    const payload = {
      aprobado_por:    user?.email ?? 'supervisor',
      aprobado_en:     now,
      estatus:         approved ? 'aprobado' : 'rechazado',
      notas_supervisor: comment[op.id]?.trim() || null,
    };

    if (!isOnline) {
      await enqueueAction({
        table: 'viajero_operaciones',
        action: 'update',
        payload,
        filterField: 'id',
        filterValue: op.id
      });

      setOps(prev => prev.filter(o => o.id !== op.id));
      setActing(null);
      Alert.alert('Modo Offline', 'Aprobación encolada localmente. Se sincronizará al recuperar internet.');
      return;
    }

    await supabase.from('viajero_operaciones').update(payload).eq('id', op.id);
    setOps(prev => prev.filter(o => o.id !== op.id));
    setActing(null);
  };

  const confirmAct = (op: PendingOp, approved: boolean) => {
    Alert.alert(
      approved ? 'Aprobar operación' : 'Rechazar operación',
      `${op.nombre_operacion}\n${op.numero_parte} — ${op.cliente}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: approved ? 'Aprobar' : 'Rechazar', style: approved ? 'default' : 'destructive', onPress: () => act(op, approved) },
      ]
    );
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>APROBACIONES</Text>
          <Text style={s.sub}>{ops.length} pendientes de revisión</Text>
        </View>
        <View style={ops.length > 0 ? s.badge : s.badgeEmpty}>
          <Text style={s.badgeText}>{ops.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : (
        <FlatList
          data={ops}
          keyExtractor={i => i.id}
          refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => { setRefresh(true); load(); }} tintColor={colors.accent} />}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardHead}>
                <View style={s.opNumBadge}>
                  <Text style={s.opNumText}>#{item.orden}</Text>
                </View>
                <View style={s.opInfo}>
                  <Text style={s.opName}>{item.nombre_operacion}</Text>
                  <Text style={s.opSub}>{item.numero_parte}  ·  {item.cliente}</Text>
                  <Text style={s.centro}>{item.centro_trabajo}</Text>
                </View>
              </View>

              {item.notas_campo ? (
                <View style={s.notasWrap}>
                  <Ionicons name="chatbubble-outline" size={12} color={colors.muted} />
                  <Text style={s.notasText}>{item.notas_campo}</Text>
                </View>
              ) : null}

              <View style={s.metaRow}>
                <Ionicons name="person-outline" size={12} color={colors.muted} />
                <Text style={s.metaText}>{item.completado_por ?? '—'}</Text>
                {item.completado_en ? (
                  <Text style={s.metaText}> · {new Date(item.completado_en).toLocaleString('es-MX')}</Text>
                ) : null}
              </View>

              <TouchableOpacity
                style={s.viajeroLink}
                onPress={() => router.push(`/viajero/${item.viajero_id}`)}
              >
                <Ionicons name="document-text-outline" size={13} color={colors.accent} />
                <Text style={s.viajeroLinkText}>Ver viajero completo</Text>
              </TouchableOpacity>

              <TextInput
                style={s.commentInput}
                value={comment[item.id] ?? ''}
                onChangeText={v => setComment(p => ({ ...p, [item.id]: v }))}
                placeholder="Comentario del supervisor (opcional)"
                placeholderTextColor={colors.muted}
              />

              <View style={s.actRow}>
                <TouchableOpacity
                  style={[s.rejectBtn, acting === item.id && { opacity: 0.5 }]}
                  onPress={() => confirmAct(item, false)}
                  disabled={!!acting}
                >
                  {acting === item.id
                    ? <ActivityIndicator color={colors.danger} size="small" />
                    : <><Ionicons name="close" size={16} color={colors.danger} /><Text style={s.rejectText}>RECHAZAR</Text></>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.approveBtn, acting === item.id && { opacity: 0.5 }]}
                  onPress={() => confirmAct(item, true)}
                  disabled={!!acting}
                >
                  {acting === item.id
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <><Ionicons name="checkmark-done" size={16} color="#fff" /><Text style={s.approveText}>APROBAR</Text></>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="checkmark-circle-outline" size={64} color={colors.accent} />
              <Text style={s.emptyTitle}>Todo al día</Text>
              <Text style={s.emptyText}>No hay operaciones pendientes de aprobación</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: colors.bg },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title:        { fontSize: 22, fontWeight: '900', color: colors.text, letterSpacing: 1 },
  sub:          { fontSize: 11, color: colors.muted, marginTop: 2 },
  badge:        { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.warning, justifyContent: 'center', alignItems: 'center' },
  badgeEmpty:   { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accentDim, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.accent + '30' },
  badgeText:    { color: '#fff', fontWeight: '900', fontSize: 13 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle:   { fontSize: 20, fontWeight: '800', color: colors.text },
  emptyText:    { color: colors.muted, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
  card:         { backgroundColor: colors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 10 },
  cardHead:     { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  opNumBadge:   { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.warning + '18', borderWidth: 1, borderColor: colors.warning + '40', justifyContent: 'center', alignItems: 'center' },
  opNumText:    { color: colors.warning, fontWeight: '800', fontSize: 12 },
  opInfo:       { flex: 1 },
  opName:       { fontSize: 14, fontWeight: '700', color: colors.text },
  opSub:        { fontSize: 11, color: colors.sub, marginTop: 2 },
  centro:       { fontSize: 10, color: colors.muted, marginTop: 1 },
  notasWrap:    { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10 },
  notasText:    { flex: 1, fontSize: 12, color: colors.sub },
  metaRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:     { fontSize: 10, color: colors.muted },
  viajeroLink:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  viajeroLinkText: { fontSize: 12, color: colors.accent, fontWeight: '600' },
  commentInput: { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 14, height: 44, fontSize: 13 },
  actRow:       { flexDirection: 'row', gap: 10 },
  rejectBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.danger + '50', backgroundColor: colors.danger + '10', borderRadius: 12, height: 44 },
  rejectText:   { color: colors.danger, fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  approveBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.accent, borderRadius: 12, height: 44 },
  approveText:  { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
});
