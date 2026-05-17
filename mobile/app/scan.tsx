import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Vibration } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');

  const handleBarcode = async ({ data }: { data: string }) => {
    if (scanned || resolving) return;
    setScanned(true);
    setResolving(true);
    setError('');
    Vibration.vibrate(80);

    // Intentar como UUID (viajero ID directo)
    const uuidRx = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRx.test(data)) {
      const { data: row } = await supabase.from('viajeros').select('id').eq('id', data).maybeSingle();
      if (row) { router.replace(`/viajero/${data}`); return; }
    }

    // Buscar por numero_parte o numero_viajero
    const { data: rows } = await supabase
      .from('viajeros')
      .select('id')
      .or(`numero_parte.eq.${data},numero_viajero.eq.${data}`)
      .limit(1);

    if (rows && rows.length > 0) {
      router.replace(`/viajero/${rows[0].id}`);
      return;
    }

    setError(`Código no reconocido: "${data}"`);
    setResolving(false);
    setTimeout(() => { setScanned(false); setError(''); }, 3000);
  };

  if (!permission) return <View style={s.root}><ActivityIndicator color={colors.accent} /></View>;

  if (!permission.granted) {
    return (
      <View style={s.root}>
        <Ionicons name="camera-outline" size={64} color={colors.muted} />
        <Text style={s.permText}>Se necesita acceso a la cámara para escanear viajeros</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permBtnText}>PERMITIR CÁMARA</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={s.cancelLink}>
          <Text style={s.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'datamatrix'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcode}
      />

      {/* Overlay */}
      <View style={s.overlay}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.topTitle}>ESCANEAR VIAJERO</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={s.reticleWrap}>
          <View style={s.reticle}>
            <View style={[s.corner, s.tl]} />
            <View style={[s.corner, s.tr]} />
            <View style={[s.corner, s.bl]} />
            <View style={[s.corner, s.br]} />
          </View>
          <Text style={s.hint}>Apunta al código QR o de barras del viajero</Text>
        </View>

        {resolving && (
          <View style={s.resolving}>
            <ActivityIndicator color={colors.accent} />
            <Text style={s.resolvingText}>Buscando viajero...</Text>
          </View>
        )}

        {error ? (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const CORNER = 28;
const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  overlay:      { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  topBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, backgroundColor: 'rgba(0,0,0,0.6)' },
  closeBtn:     { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 22 },
  topTitle:     { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 2 },
  reticleWrap:  { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 24 },
  reticle:      { width: 240, height: 240, position: 'relative' },
  corner:       { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.accent, borderWidth: 3 },
  tl:           { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  tr:           { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  bl:           { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  br:           { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  hint:         { color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
  resolving:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 14, padding: 16, marginHorizontal: 40, marginBottom: 40 },
  resolvingText:{ color: '#fff', fontSize: 13 },
  errorBox:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.danger + 'CC', borderRadius: 14, padding: 16, marginHorizontal: 40, marginBottom: 40 },
  errorText:    { color: '#fff', fontSize: 13, flex: 1 },
  permText:     { color: colors.text, fontSize: 15, textAlign: 'center', marginHorizontal: 32, marginVertical: 16 },
  permBtn:      { backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  permBtnText:  { color: '#fff', fontWeight: '900', letterSpacing: 1 },
  cancelLink:   { marginTop: 16 },
  cancelText:   { color: colors.muted, fontSize: 14 },
});
