import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/theme';

type IonIconName = React.ComponentProps<typeof Ionicons>['name'];

const tabs: { name: string; title: string; icon: IonIconName; activeIcon: IonIconName }[] = [
  { name: 'dashboard',    title: 'Dashboard',   icon: 'stats-chart-outline',      activeIcon: 'stats-chart'      },
  { name: 'index',        title: 'Viajeros',    icon: 'document-text-outline',    activeIcon: 'document-text'    },
  { name: 'asistencia',   title: 'Asistencia',  icon: 'finger-print-outline',     activeIcon: 'finger-print'     },
  { name: 'calidad',      title: 'Calidad',     icon: 'shield-checkmark-outline', activeIcon: 'shield-checkmark' },
  { name: 'aprobaciones', title: 'Aprobaciones', icon: 'checkmark-circle-outline', activeIcon: 'checkmark-circle' },
  { name: 'perfil',       title: 'Perfil',      icon: 'person-outline',           activeIcon: 'person'           },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarActiveTintColor:   colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
      }}
    >
      {tabs.map(t => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? t.activeIcon : t.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
