import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { Badge } from '../../components/Badge';

interface Viajero {
  id: string;
  numero_viajero?: string;
  numero_parte: string;
  cliente: string;
  descripcion_ensamble?: string;
  cantidad_orden: number;
  cantidad_fabricada?: number;
  estatus: string;
  fecha_orden?: string;
  horas_est_totales?: number;
}

export default function ViajerosScreen() {
  const router = useRouter();
  const [viajeros, setViajeros] = useState<Viajero[]>([]);
  const [filtered, setFiltered] = useState<Viajero[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [refresh,  setRefresh]  = useState(false);
  const [query,    setQuery]    = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('viajeros')
      .select('id, numero_viajero, numero_parte, cliente, descripcion_ensamble, cantidad_orden, cantidad_fabricada, estatus, fecha_orden, horas_est_totales')
      .order('fecha_orden', { ascending: false })
      .limit(80);
    setViajeros(data || []);
    setFiltered(data || []);
    setLoading(false);
    setRefresh(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!query.trim()) { setFiltered(viajeros); return; }
    const q = query.toLowerCase();
    setFiltered(viajeros.filter(v =>
      v.numero_parte.toLowerCase().includes(q) ||
      v.cliente.toLowerCase().includes(q) ||
      (v.descripcion_ensamble || '').toLowerCase().includes(q) ||
      (v.numero_viajero || '').toLowerCase().includes(q)
    ));
  }, [query, viajeros]);

  const onRefresh = () => { setRefresh(true); load(); };

  const pct = (v: Viajero) => v.cantidad_orden > 0
    ? Math.min(100, Math.round(((v.cantidad_fabricada ?? 0) / v.cantidad_orden) * 100))
    : 0;

  const renderItem = ({ item }: { item: Viajero }) => {
    const p = pct(item);
    return (
      <TouchableOpacity style={s.card} activeOpacity={0.75} onPress={() => router.push(`/viajero/${item.id}`)}>
        <View style={s.cardHead}>
          <View style={s.partInfo}>
            <Text style={s.partNum}>{item.numero_parte}</Text>
            <Text style={s.cliente}>{item.cliente}</Text>
          </View>
          <Badge status={item.estatus} />
        </View>

        {item.descripcion_ensamble ? (
          <Text style={s.desc} numberOfLines={1}>{item.descripcion_ensamble}</Text>
        ) : null}

        <View style={s.cardFoot}>
          <View style={s.stat}>
            <Ionicons name="cube-outline" size={13} color={colors.muted} />
            <Text style={s.statText}>{item.cantidad_fabricada ?? 0} / {item.cantidad_orden} pzas</Text>
          </View>
          {item.horas_est_totales ? (
            <View style={s.stat}>
              <Ionicons name="time-outline" size={13} color={colors.muted} />
              <Text style={s.statText}>{item.horas_est_totales} hrs est.</Text>
            </View>
          ) : null}
          <View style={s.progressWrap}>
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${p}%` as any, backgroundColor: p >= 100 ? colors.accent : '#3b82f6' }]} />
            </View>
            <Text style={s.progressTxt}>{p}%</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>VIAJEROS</Text>
          <Text style={s.sub}>{filtered.length} órdenes activas</Text>
        </View>
        <TouchableOpacity style={s.scanBtn} activeOpacity={0.8} onPress={() => router.push('/scan')}>
          <Ionicons name="qr-code-outline" size={20} color="#fff" />
          <Text style={s.scanBtnTxt}>ESCANEAR</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={colors.muted} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por parte, cliente..."
          placeholderTextColor={colors.muted}
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refresh} onRefresh={onRefresh} tintColor={colors.accent} />}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="document-text-outline" size={48} color={colors.muted} />
              <Text style={s.emptyText}>{query ? 'Sin resultados' : 'Sin viajeros activos'}</Text>
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
  scanBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  scanBtnTxt:   { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  searchWrap:   { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 4, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, height: 44 },
  searchIcon:   { marginRight: 8 },
  searchInput:  { flex: 1, color: colors.text, fontSize: 14 },
  card:         { backgroundColor: colors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border },
  cardHead:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  partInfo:     { flex: 1, marginRight: 8 },
  partNum:      { fontSize: 15, fontWeight: '800', color: colors.text, letterSpacing: 0.5 },
  cliente:      { fontSize: 11, color: colors.sub, marginTop: 2 },
  desc:         { fontSize: 12, color: colors.muted, marginBottom: 10 },
  cardFoot:     { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 4 },
  stat:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText:     { fontSize: 11, color: colors.muted },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 80 },
  progressBg:   { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  progressTxt:  { fontSize: 10, color: colors.muted, fontWeight: '700', minWidth: 28 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText:    { color: colors.muted, fontSize: 14 },
});
