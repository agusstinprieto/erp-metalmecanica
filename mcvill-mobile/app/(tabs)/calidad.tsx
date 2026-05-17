import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image, FlatList, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { Badge } from '../../components/Badge';

const DEFECT_OPTS = ['Dimensional', 'Soldadura', 'Acabado', 'Material', 'Mecanizado', 'Pintura', 'Otro'];

interface Inspection {
  id: string;
  product_code: string;
  product_name: string;
  batch_number?: string;
  inspection_date: string;
  quantity_inspected: number;
  quantity_passed: number;
  quantity_failed: number;
  defect_types?: string[];
  defect_notes?: string;
  status: string;
}

type Mode = 'list' | 'new';

export default function CalidadScreen() {
  const [mode,       setMode]       = useState<Mode>('list');
  const [inspections,setInspections]= useState<Inspection[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refresh,    setRefresh]    = useState(false);
  const [saving,     setSaving]     = useState(false);

  // Form state
  const [partCode,  setPartCode]  = useState('');
  const [partName,  setPartName]  = useState('');
  const [batch,     setBatch]     = useState('');
  const [inspected, setInspected] = useState('');
  const [passed,    setPassed]    = useState('');
  const [failed,    setFailed]    = useState('');
  const [defects,   setDefects]   = useState<string[]>([]);
  const [notes,     setNotes]     = useState('');
  const [photo,     setPhoto]     = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('quality_inspections')
      .select('*')
      .order('inspection_date', { ascending: false })
      .limit(40);
    setInspections(data || []);
    setLoading(false);
    setRefresh(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleDefect = (d: string) =>
    setDefects(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const selectPhoto = async () => {
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!r.canceled) setPhoto(r.assets[0].uri);
  };

  const uploadPhoto = async (uri: string, inspId: string): Promise<string | null> => {
    try {
      const ext  = uri.split('.').pop() ?? 'jpg';
      const path = `calidad/${inspId}_${Date.now()}.${ext}`;
      const resp = await fetch(uri);
      const blob = await resp.blob();
      await supabase.storage.from('mcvill-fotos').upload(path, blob, { contentType: `image/${ext}` });
      const { data } = supabase.storage.from('mcvill-fotos').getPublicUrl(path);
      return data.publicUrl;
    } catch { return null; }
  };

  const submit = async () => {
    if (!partCode.trim() || !inspected) { Alert.alert('Campos requeridos', 'Código de parte y cantidad inspeccionada son obligatorios'); return; }
    const qi = parseInt(inspected) || 0;
    const qp = parseInt(passed)    || 0;
    const qf = parseInt(failed)    || (qi - qp);
    if (qp + qf > qi) { Alert.alert('Error', 'Aprobadas + rechazadas no puede exceder la cantidad inspeccionada'); return; }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

    const { data: ins, error } = await supabase.from('quality_inspections').insert({
      product_code:       partCode.trim().toUpperCase(),
      product_name:       partName.trim() || partCode.trim(),
      batch_number:       batch.trim() || null,
      inspector_id:       user?.id,
      inspection_date:    new Date().toISOString(),
      quantity_inspected: qi,
      quantity_passed:    qp,
      quantity_failed:    qf,
      defect_types:       defects.length ? defects : null,
      defect_notes:       notes.trim() || null,
      status:             qf === 0 ? 'passed' : qf < qi ? 'partial' : 'failed',
      tenant_id:          'mcvill',
    }).select().single();

    if (error) { Alert.alert('Error', error.message); setSaving(false); return; }

    if (photo && ins) await uploadPhoto(photo, ins.id);

    setMode('list'); load();
    setPartCode(''); setPartName(''); setBatch(''); setInspected(''); setPassed(''); setFailed('');
    setDefects([]); setNotes(''); setPhoto(null);
    setSaving(false);
  };

  const passPct = (i: Inspection) =>
    i.quantity_inspected > 0 ? Math.round((i.quantity_passed / i.quantity_inspected) * 100) : 0;

  // ─── List view ──────────────────────────────────────────────────────────────
  if (mode === 'list') {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>CALIDAD</Text>
            <Text style={s.sub}>{inspections.length} inspecciones recientes</Text>
          </View>
          <TouchableOpacity style={s.newBtn} onPress={() => setMode('new')}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={s.newBtnText}>NUEVA</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>
        ) : (
          <FlatList
            data={inspections}
            keyExtractor={i => i.id}
            refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => { setRefresh(true); load(); }} tintColor={colors.accent} />}
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
            renderItem={({ item: i }) => (
              <View style={s.card}>
                <View style={s.cardHead}>
                  <View style={s.partInfo}>
                    <Text style={s.partCode}>{i.product_code}</Text>
                    <Text style={s.partName}>{i.product_name}</Text>
                  </View>
                  <Badge status={i.status === 'passed' ? 'aprobado' : i.status === 'failed' ? 'rechazado' : 'en_proceso'} />
                </View>
                <View style={s.statsRow}>
                  <StatChip icon="checkmark-circle-outline" label="Aprobadas" value={String(i.quantity_passed)} color={colors.accent} />
                  <StatChip icon="close-circle-outline" label="Rechazadas" value={String(i.quantity_failed)} color={i.quantity_failed > 0 ? colors.danger : colors.muted} />
                  <StatChip icon="stats-chart-outline" label="Pass rate" value={`${passPct(i)}%`} color={passPct(i) >= 95 ? colors.accent : colors.warning} />
                </View>
                {i.defect_types && i.defect_types.length > 0 && (
                  <View style={s.defectRow}>
                    {i.defect_types.map(d => (
                      <View key={d} style={s.defectChip}><Text style={s.defectChipText}>{d}</Text></View>
                    ))}
                  </View>
                )}
                <Text style={s.dateText}>{new Date(i.inspection_date).toLocaleString('es-MX')}</Text>
              </View>
            )}
            ListEmptyComponent={
              <View style={s.center}>
                <Ionicons name="shield-checkmark-outline" size={48} color={colors.muted} />
                <Text style={s.emptyText}>Sin inspecciones registradas</Text>
                <TouchableOpacity style={s.newBtn2} onPress={() => setMode('new')}>
                  <Text style={s.newBtnText}>Registrar primera inspección</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </SafeAreaView>
    );
  }

  // ─── New inspection form ─────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.formHeader}>
        <TouchableOpacity onPress={() => setMode('list')} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.formTitle}>NUEVA INSPECCIÓN</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.formScroll}>
        <View style={s.formCard}>
          <Field label="CÓDIGO DE PARTE *">
            <TextInput style={s.input} value={partCode} onChangeText={setPartCode}
              placeholder="ej. MCV-001-A" placeholderTextColor={colors.muted} autoCapitalize="characters" />
          </Field>
          <Field label="DESCRIPCIÓN">
            <TextInput style={s.input} value={partName} onChangeText={setPartName}
              placeholder="Nombre o descripción" placeholderTextColor={colors.muted} />
          </Field>
          <Field label="LOTE / ORDEN">
            <TextInput style={s.input} value={batch} onChangeText={setBatch}
              placeholder="Número de lote u orden" placeholderTextColor={colors.muted} />
          </Field>
        </View>

        <View style={s.formCard}>
          <Text style={s.cardLabel}>RESULTADOS</Text>
          <View style={s.qtyRow}>
            <QtyField label="INSPECCIONADAS" value={inspected} onChange={setInspected} />
            <QtyField label="APROBADAS"      value={passed}    onChange={setPassed}    />
            <QtyField label="RECHAZADAS"     value={failed}    onChange={setFailed}    />
          </View>
        </View>

        <View style={s.formCard}>
          <Text style={s.cardLabel}>TIPOS DE DEFECTO</Text>
          <View style={s.defectGrid}>
            {DEFECT_OPTS.map(d => (
              <TouchableOpacity
                key={d}
                style={[s.defectToggle, defects.includes(d) && s.defectToggleActive]}
                onPress={() => toggleDefect(d)}
              >
                <Text style={[s.defectToggleText, defects.includes(d) && { color: colors.accent }]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.formCard}>
          <Field label="NOTAS / OBSERVACIONES">
            <TextInput
              style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
              value={notes} onChangeText={setNotes}
              placeholder="Describir el problema encontrado..."
              placeholderTextColor={colors.muted}
              multiline
            />
          </Field>
          <TouchableOpacity style={s.photoBtn} onPress={selectPhoto}>
            <Ionicons name={photo ? 'image' : 'camera-outline'} size={20} color={photo ? colors.accent : colors.muted} />
            <Text style={[s.photoBtnText, photo && { color: colors.accent }]}>
              {photo ? '1 foto adjunta — toca para cambiar' : 'Capturar foto del defecto'}
            </Text>
          </TouchableOpacity>
          {photo ? <Image source={{ uri: photo }} style={s.photoPreview} resizeMode="cover" /> : null}
        </View>

        <TouchableOpacity style={[s.submitBtn, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <><Ionicons name="checkmark-done" size={18} color="#fff" /><Text style={s.submitText}>REGISTRAR INSPECCIÓN</Text></>
          }
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <View style={{ gap: 6 }}>
    <Text style={s.fieldLabel}>{label}</Text>
    {children}
  </View>
);

const QtyField: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <View style={s.qtyField}>
    <Text style={s.fieldLabel}>{label}</Text>
    <TextInput style={[s.input, s.qtyInput]} value={value} onChangeText={onChange}
      keyboardType="numeric" placeholder="0" placeholderTextColor={colors.muted} textAlign="center" />
  </View>
);

const StatChip: React.FC<{ icon: string; label: string; value: string; color: string }> = ({ icon, label, value, color }) => (
  <View style={sc.wrap}>
    <Ionicons name={icon as any} size={14} color={color} />
    <Text style={[sc.val, { color }]}>{value}</Text>
    <Text style={sc.lbl}>{label}</Text>
  </View>
);
const sc = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', gap: 2 },
  val:  { fontSize: 15, fontWeight: '800' },
  lbl:  { fontSize: 9, color: colors.muted, fontWeight: '700', letterSpacing: 0.5 },
});

const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: colors.bg },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title:           { fontSize: 22, fontWeight: '900', color: colors.text, letterSpacing: 1 },
  sub:             { fontSize: 11, color: colors.muted, marginTop: 2 },
  newBtn:          { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  newBtn2:         { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  newBtnText:      { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  card:            { backgroundColor: colors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 10 },
  cardHead:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  partInfo:        { flex: 1, marginRight: 8 },
  partCode:        { fontSize: 15, fontWeight: '800', color: colors.text },
  partName:        { fontSize: 11, color: colors.sub },
  statsRow:        { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12 },
  defectRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  defectChip:      { backgroundColor: colors.danger + '15', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.danger + '30' },
  defectChipText:  { color: colors.danger, fontSize: 10, fontWeight: '700' },
  dateText:        { fontSize: 10, color: colors.muted },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText:       { color: colors.muted, fontSize: 14 },
  formHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:         { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  formTitle:       { fontSize: 14, fontWeight: '900', color: colors.text, letterSpacing: 2 },
  formScroll:      { padding: 16, gap: 12 },
  formCard:        { backgroundColor: colors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 12 },
  cardLabel:       { fontSize: 9, fontWeight: '900', color: colors.muted, letterSpacing: 2 },
  fieldLabel:      { fontSize: 9, fontWeight: '900', color: colors.muted, letterSpacing: 1.5 },
  input:           { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 14, height: 46, fontSize: 14 },
  qtyRow:          { flexDirection: 'row', gap: 10 },
  qtyField:        { flex: 1, gap: 6 },
  qtyInput:        { height: 52, fontSize: 18, fontWeight: '700' },
  defectGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  defectToggle:    { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.03)' },
  defectToggleActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  defectToggleText:{ fontSize: 12, color: colors.muted, fontWeight: '600' },
  photoBtn:        { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  photoBtnText:    { fontSize: 13, color: colors.muted, flex: 1 },
  photoPreview:    { width: '100%', height: 160, borderRadius: 12, marginTop: 4 },
  submitBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accent, borderRadius: 16, height: 56 },
  submitText:      { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 2 },
});
