import { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Alert as AlertType } from '../store/types';
import { Toggle } from './FormControls';
import { requestNotificationPermission } from '../lib/notifications';

const UNITS: AlertType['unit'][] = ['minutes','hours','days','weeks','months'];

type Row = { value: string; unit: AlertType['unit'] };

/**
 * Alerts/reminders editor shared by add-event and edit-event. Seeds its state
 * once from `value` (the event's existing alerts) and emits the parsed Alert[]
 * — or [] when off — back to the parent via onChange.
 */
export function AlertsEditor({
  value, onChange,
}: { value: AlertType[]; onChange: (a: AlertType[]) => void }) {
  const { colors } = useTheme();
  const [alertOn, setAlertOn] = useState(value.length > 0);
  const [alerts,  setAlerts]  = useState<Row[]>(
    value.length ? value.map(a => ({ value: String(a.value), unit: a.unit })) : [{ value: '1', unit: 'days' }]
  );

  useEffect(() => {
    onChange(alertOn ? alerts.map(a => ({ value: parseInt(a.value) || 1, unit: a.unit })) : []);
    // onChange is a stable setState; re-run only when the inputs change.
  }, [alertOn, alerts]);

  // Ask for notification permission the first time a user turns reminders on
  // (contextual prompt). No-op on web.
  function toggleReminders(on: boolean) {
    setAlertOn(on);
    if (on) void requestNotificationPermission();
  }

  return (
    <>
      <Toggle label="🔔 Alerts & Reminders" value={alertOn} onChange={toggleReminders} />
      {alertOn && (
        <View style={{ marginBottom:14 }}>
          {alerts.map((a,i) => (
            <View key={i} style={{ flexDirection:'row', alignItems:'center', gap:7,
              backgroundColor:colors.tile, borderWidth:1,
              borderColor:colors.track, borderRadius:10,
              padding:9, marginBottom:7 }}>
              <Text>🔔</Text>
              <TextInput value={a.value}
                onChangeText={v => setAlerts(prev => prev.map((x,j) => j===i?{...x,value:v}:x))}
                keyboardType="number-pad"
                style={{ width:48, backgroundColor:colors.track,
                  borderRadius:7, padding:5, color:colors.text1, fontSize:13,
                  fontWeight:'700', textAlign:'center', borderWidth:1,
                  borderColor:colors.border }} />
              <View style={{ flex:1 }}>
                {UNITS.map(u => (
                  <TouchableOpacity key={u}
                    onPress={() => setAlerts(prev => prev.map((x,j) => j===i?{...x,unit:u}:x))}
                    style={{ padding:5, borderRadius:6,
                      backgroundColor: a.unit===u ? (colors.isDark ? 'rgba(124,106,245,0.2)' : colors.tint) : 'transparent' }}>
                    <Text style={{ fontSize:12,
                      color: a.unit===u ? colors.accent : colors.text2 }}>{u} before</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                onPress={() => setAlerts(prev => prev.filter((_,j) => j!==i))}
                style={{ width:24, height:24, borderRadius:12,
                  backgroundColor: colors.isDark ? 'rgba(232,80,122,0.12)' : 'rgba(197,0,26,0.10)',
                  alignItems:'center', justifyContent:'center' }}>
                <Text style={{ color:colors.rose, fontSize:13 }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            onPress={() => setAlerts(prev => [...prev, { value:'1', unit:'hours' }])}
            style={{ padding:8, borderRadius:9, borderWidth:1.5,
              borderColor: colors.isDark ? 'rgba(124,106,245,0.3)' : colors.accent, borderStyle:'dashed', alignItems:'center' }}>
            <Text style={{ fontSize:12, fontWeight:'600', color:colors.accent }}>+ Add Alert</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}
