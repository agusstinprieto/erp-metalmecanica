import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { STATUS_COLORS, STATUS_LABELS } from '../lib/theme';

interface Props {
  status: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<Props> = ({ status, size = 'sm' }) => {
  const color = STATUS_COLORS[status] ?? '#475569';
  const label = STATUS_LABELS[status] ?? status;
  return (
    <View style={[s.badge, { borderColor: color + '55', backgroundColor: color + '18' }]}>
      <View style={[s.dot, { backgroundColor: color }]} />
      <Text style={[s.text, { color, fontSize: size === 'md' ? 12 : 10 }]}>{label}</Text>
    </View>
  );
};

const s = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1,
  },
  dot:  { width: 5, height: 5, borderRadius: 3 },
  text: { fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
});
