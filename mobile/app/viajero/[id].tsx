import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { Badge } from '../../components/Badge';

interface Operacion {
  id: string;
  orden: number;
  clave_operacion: string;
  nombre_operacion: string;
  centro_trabajo: string;
  tiempo_estimado?: number;
  estatus?: string;
  notas_campo?: string;
  completado_por?: string;
  completado_en?: string;
  foto_url?: string;
}

interface ViajeroDetalle {
  id: string;
  numero_viajero?: string;
  numero_parte: string;
  cliente: string;
  descripcion_ensamble?: string;
  revision?: string;
  cantidad_orden: number;
  cantidad_fabricada?: number;
  estatus: string;
  fecha_orden?: string;
  horas_est_totales?: number;
  notas?: string;
}

export default function ViajeroDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();

  const [viajero,    setViajero]    = useState<ViajeroDetalle | null>(null);
  const [ops,        setOps]        = useState<Operacion[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activeOp,   setActiveOp]   = useState<string | null>(null);
  const [notaInput,  setNotaInput]  = useState('');
  const [photo,      setPhoto]      = useState<string | null>(null);
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    const [{ data: v }, { data: o }] = await Promise.all([
      supabase.from('viajeros').select('*').eq('id', id).single(),
      supabase.from('viajero_operaciones').select('*').eq('viajero_id', id).order('orden'),
    ]);
    setViajero(v);
    setOps(o || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const selectPhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: false,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const uploadPhoto = async (uri: string, opId: string): Promise<string | null> => {
    try {
      const ext  = uri.split('.').pop() ?? 'jpg';
      const path = `viajeros/${id}/${opId}_${Date.now()}.${ext}`;
      const resp = await fetch(uri);
      const blob = await resp.blob();
      const { error } = await supabase.storage.from('mcvill-fotos').upload(path, blob, { contentType: `image/${ext}` });
      if (error) return null;
      const { data } = supabase.storage.from('mcvill-fotos').getPublicUrl(path);
      return data.publicUrl;
    } catch { return null; }
  };

  const completarOp = async (op: Operacion) => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    let fotoUrl: string | null = null;
    if (photo) fotoUrl = await uploadPhoto(photo, op.id);

    await supabase.from('viajero_operaciones').update({
      estatus: 'completado',
      notas_campo: notaInput.trim() || null,
      foto_url: fotoUrl,
      completado_por: user?.email ?? 'desconocido',
      completado_en: new Date().toISOString(),
    }).eq('id', op.id);

    setOps(prev => prev.map(o => o.id === op.id
      ? { ...o, estatus: 'completado', notas_campo: notaInput.trim(), foto_url: fotoUrl ?? undefined, completado_por: user?.email ?? '' }
      : o
    ));

    const allDone = ops.every(o => o.id === op.id || o.estatus === 'completado');
    if (allDone) {
      await supabase.from('viajeros').update({ estatus: 'completado' }).eq('id', id);
      setViajero(v => v ? { ...v, estatus: 'completado' } : v);
    }

    setActiveOp(null); setNotaInput(''); setPhoto(null); setSaving(false);
  };

  const opColor = (est?: string) => {
    if (est === 'completado') return colors.accent;
    if (est === 'en_proceso') return '#3b82f6';
    return colors.muted;
  };

  if (loading) return (
    <View style={s.loadRoot}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );

  if (!viajero) return (
    <View style={s.loadRoot}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
      <Text style={s.notFoundText}>Viajero no encontrado</Text>
      <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
        <Text style={s.backBtnText}>Volver</Text>
      </TouchableOpacity>
    </View>
  );

  const completadas = ops.filter(o => o.estatus === 'completado').length;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backIcon}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <Text style={s.headerPart} numberOfLines={1}>{viajero.numero_parte}</Text>
          <Text style={s.headerCliente}>{viajero.cliente}</Text>
        </View>
        <Badge status={viajero.estatus} size="md" />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Info card */}
        <View style={s.infoCard}>
          {viajero.descripcion_ensamble ? (
            <Text style={s.desc}>{viajero.descripcion_ensamble}</Text>
          ) : null}
          <View style={s.infoGrid}>
            <InfoPill icon="cube-outline"    label="CANTIDAD" value={`${viajero.cantidad_fabricada ?? 0} / ${viajero.cantidad_orden}`} />
            {viajero.revision ?
              <InfoPill icon="git-branch-outline" label="REV" value={viajero.revision} /> : null}
            {viajero.horas_est_totales ?
              <InfoPill icon="time-outline" label="HRS EST" value={`${viajero.horas_est_totales} h`} /> : null}
            {viajero.fecha_orden ?
              <InfoPill icon="calendar-outline" label="FECHA" value={new Date(viajero.fecha_orden).toLocaleDateString('es-MX')} /> : null}
          </View>
          {/* Progress bar */}
          <View style={s.progRow}>
            <Text style={s.progLabel}>OPERACIONES: {completadas}/{ops.length}</Text>
            <Text style={s.progPct}>{ops.length > 0 ? Math.round((completadas / ops.length) * 100) : 0}%</Text>
          </View>
          <View style={s.progBg}>
            <View style={[s.progFill, { width: ops.length > 0 ? `${(completadas / ops.length) * 100}%` as any : '0%' }]} />
          </View>
        </View>

        {/* Operaciones */}
        <Text style={s.sectionTitle}>OPERACIONES DE RUTA</Text>
        {ops.map(op => (
          <View key={op.id} style={s.opCard}>
            <View style={s.opHead}>
              <View style={[s.opNum, { borderColor: opColor(op.estatus) }]}>
                {op.estatus === 'completado'
                  ? <Ionicons name="checkmark" size={14} color={colors.accent} />
                  : <Text style={[s.opNumText, { color: opColor(op.estatus) }]}>{op.orden}</Text>
                }
              </View>
              <View style={s.opInfo}>
                <Text style={s.opName}>{op.nombre_operacion}</Text>
                <Text style={s.opSub}>{op.centro_trabajo}{op.tiempo_estimado ? `  ·  ${op.tiempo_estimado} min` : ''}</Text>
              </View>
              {op.estatus !== 'completado' && (
                <TouchableOpacity
                  style={[s.opAction, activeOp === op.id && s.opActionActive]}
                  onPress={() => { setActiveOp(activeOp === op.id ? null : op.id); setNotaInput(''); setPhoto(null); }}
                >
                  <Ionicons name={activeOp === op.id ? 'chevron-up' : 'checkmark-done-outline'} size={16} color={activeOp === op.id ? colors.accent : colors.text} />
                </TouchableOpacity>
              )}
            </View>

            {op.notas_campo ? (
              <Text style={s.opNota}>{op.notas_campo}</Text>
            ) : null}

            {op.foto_url ? (
              <Image source={{ uri: op.foto_url }} style={s.opPhoto} resizeMode="cover" />
            ) : null}

            {op.completado_por ? (
              <Text style={s.opMeta}>✓ {op.completado_por}  ·  {op.completado_en ? new Date(op.completado_en).toLocaleString('es-MX') : ''}</Text>
            ) : null}

            {/* Panel de firma */}
            {activeOp === op.id && (
              <View style={s.signPanel}>
                <TextInput
                  style={s.notaInput}
                  value={notaInput}
                  onChangeText={setNotaInput}
                  placeholder="Notas (opcional)"
                  placeholderTextColor={colors.muted}
                  multiline
                />
                <View style={s.signRow}>
                  <TouchableOpacity style={s.photoBtn} onPress={selectPhoto}>
                    <Ionicons name={photo ? 'image' : 'camera-outline'} size={18} color={photo ? colors.accent : colors.muted} />
                    <Text style={[s.photoBtnText, photo ? { color: colors.accent } : {}]}>
                      {photo ? 'Foto adjunta' : 'Agregar foto'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.doneBtn, saving && { opacity: 0.6 }]}
                    onPress={() => Alert.alert('Confirmar', `¿Marcar "${op.nombre_operacion}" como completada?`, [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Completar', onPress: () => completarOp(op) },
                    ])}
                    disabled={saving}
                  >
                    {saving
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <><Ionicons name="checkmark-done" size={16} color="#fff" /><Text style={s.doneBtnText}>COMPLETAR</Text></>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ))}

        {viajero.notas ? (
          <View style={s.notasCard}>
            <Text style={s.notasLabel}>NOTAS DE ORDEN</Text>
            <Text style={s.notasText}>{viajero.notas}</Text>
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const InfoPill: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={ip.wrap}>
    <Ionicons name={icon as any} size={12} color={colors.muted} />
    <Text style={ip.label}>{label}</Text>
    <Text style={ip.value}>{value}</Text>
  </View>
);
const ip = StyleSheet.create({
  wrap:  { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', gap: 2, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 8, fontWeight: '900', color: colors.muted, letterSpacing: 1 },
  value: { fontSize: 12, fontWeight: '800', color: colors.text },
});

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: colors.bg },
  loadRoot:    { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', gap: 16 },
  notFoundText:{ color: colors.text, fontSize: 16 },
  backBtn:     { backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: colors.border },
  backBtnText: { color: colors.text },
  header:      { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  backIcon:    { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerInfo:  { flex: 1 },
  headerPart:  { fontSize: 16, fontWeight: '900', color: colors.text },
  headerCliente:{ fontSize: 12, color: colors.sub },
  scroll:      { padding: 16, gap: 12 },
  infoCard:    { backgroundColor: colors.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border },
  desc:        { fontSize: 13, color: colors.sub, marginBottom: 12 },
  infoGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  progRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progLabel:   { fontSize: 9, fontWeight: '900', color: colors.muted, letterSpacing: 1 },
  progPct:     { fontSize: 9, fontWeight: '900', color: colors.accent },
  progBg:      { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  progFill:    { height: 6, backgroundColor: colors.accent, borderRadius: 3 },
  sectionTitle:{ fontSize: 9, fontWeight: '900', color: colors.muted, letterSpacing: 2, marginTop: 4, marginBottom: 4, paddingHorizontal: 4 },
  opCard:      { backgroundColor: colors.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 8 },
  opHead:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  opNum:       { width: 32, height: 32, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  opNumText:   { fontSize: 13, fontWeight: '800' },
  opInfo:      { flex: 1 },
  opName:      { fontSize: 14, fontWeight: '700', color: colors.text },
  opSub:       { fontSize: 11, color: colors.muted, marginTop: 1 },
  opAction:    { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  opActionActive:{ borderColor: colors.accent, backgroundColor: colors.accentDim },
  opNota:      { fontSize: 12, color: colors.sub, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 8 },
  opPhoto:     { width: '100%', height: 140, borderRadius: 10, marginTop: 4 },
  opMeta:      { fontSize: 10, color: colors.muted },
  signPanel:   { gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  notaInput:   { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.text, padding: 12, fontSize: 13, minHeight: 60 },
  signRow:     { flexDirection: 'row', gap: 10, alignItems: 'center' },
  photoBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  photoBtnText:{ fontSize: 12, color: colors.muted },
  doneBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  doneBtnText: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  notasCard:   { backgroundColor: colors.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border },
  notasLabel:  { fontSize: 9, fontWeight: '900', color: colors.muted, letterSpacing: 2, marginBottom: 6 },
  notasText:   { fontSize: 13, color: colors.sub },
});
