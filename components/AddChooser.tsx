import { Modal, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';

interface Choice { icon: string; label: string; sub: string; tint: string; go: () => void; }

const CHOICES: Choice[] = [
  { icon: '📅', label: 'Event',       sub: 'A one-time countdown',              tint: 'rgba(124,106,245,0.14)',
    go: () => router.push('/modals/add-event') },
  { icon: '🎂', label: 'Birthday',    sub: 'Repeats yearly · tracks age',       tint: 'rgba(232,80,122,0.14)',
    go: () => router.push({ pathname: '/modals/add-memory', params: { type: 'birthday' } }) },
  { icon: '💍', label: 'Anniversary', sub: 'Repeats yearly · counts the years', tint: 'rgba(124,106,245,0.14)',
    go: () => router.push({ pathname: '/modals/add-memory', params: { type: 'anniversary' } }) },
  { icon: '🎯', label: 'Goal',        sub: 'Track progress to a target',        tint: 'rgba(62,207,178,0.14)',
    go: () => router.push('/modals/add-goal') },
  { icon: '🏔️', label: 'Life Log',    sub: 'Log every time it happens',         tint: 'rgba(62,207,178,0.14)',
    go: () => router.push({ pathname: '/modals/add-memory', params: { type: 'lifelog' } }) },
];

export function AddChooser({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const pick = (go: () => void) => { onClose(); go(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        {/* Sheet — stop backdrop press so taps inside don't dismiss */}
        <Pressable onPress={(e) => e.stopPropagation()}
          style={{ backgroundColor: colors.surf2, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 36 }}>
          <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text1, marginBottom: 14, marginLeft: 6 }}>
            What would you like to add?
          </Text>
          {CHOICES.map(c => (
            <Pressable key={c.label} onPress={() => pick(c.go)}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 14, marginBottom: 6,
                backgroundColor: pressed ? 'rgba(255,255,255,0.05)' : 'transparent',
              })}>
              <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>{c.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text1 }}>{c.label}</Text>
                <Text style={{ fontSize: 12, color: colors.text3, marginTop: 2 }}>{c.sub}</Text>
              </View>
              <Text style={{ fontSize: 20, color: colors.text3 }}>›</Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
