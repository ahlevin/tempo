import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

function TabIcon({ label, icon, focused }: { label: string; icon: string; focused: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 3, width: 76 }}>
      <Text style={{ fontSize: 20, lineHeight: 24 }}>{icon}</Text>
      <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: '600', color: focused ? colors.accent : colors.text3 }}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surf,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="⏳" label="Countdowns" focused={focused} /> }}
      />
      <Tabs.Screen
        name="lifelog"
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="📓" label="Life Log" focused={focused} /> }}
      />
      <Tabs.Screen
        name="goals"
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🎯" label="Goals" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="👤" label="Profile" focused={focused} /> }}
      />
    </Tabs>
  );
}
