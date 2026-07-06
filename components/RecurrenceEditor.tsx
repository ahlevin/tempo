import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Recurrence } from '../store/types';
import { FL, Toggle } from './FormControls';

const DOW = ['Su','Mo','Tu','We','Th','Fr','Sa'];

/**
 * Repeating-event editor shared by add-event and edit-event. Seeds its state
 * once from `value` (the event's existing recurrence, or null) and emits the
 * built Recurrence — or null when off — back to the parent via onChange.
 */
export function RecurrenceEditor({
  value, onChange,
}: { value: Recurrence | null; onChange: (r: Recurrence | null) => void }) {
  const { colors } = useTheme();
  const [recurOn, setRecurOn] = useState(!!value);
  const [freq,    setFreq]    = useState<Recurrence['freq']>(value?.freq || 'weekly');
  const [dow,     setDow]     = useState<number[]>(value?.dow?.length ? value.dow : [1]);

  function toggleDow(i: number) {
    setDow(prev => prev.includes(i)
      ? prev.length > 1 ? prev.filter(d => d !== i) : prev
      : [...prev, i].sort());
  }

  useEffect(() => {
    onChange(recurOn ? { freq, dow: freq === 'weekly' ? dow : [], endType: 'never' } : null);
    // onChange is a stable setState; re-run only when the inputs change.
  }, [recurOn, freq, dow]);

  return (
    <>
      <Toggle label="🔁 Repeating Event" value={recurOn} onChange={setRecurOn} />
      {recurOn && (
        <View style={{ marginBottom:14 }}>
          <FL label="Repeat" />
          <View style={{ flexDirection:'row', gap:6, marginBottom:10 }}>
            {(['daily','weekly','monthly','yearly'] as Recurrence['freq'][]).map(f => (
              <TouchableOpacity key={f} onPress={() => setFreq(f)}
                style={{ flex:1, padding:8, borderRadius:9, borderWidth:1.5, alignItems:'center',
                  borderColor: freq===f ? colors.accent : colors.border,
                  backgroundColor: freq===f ? (colors.isDark ? 'rgba(124,106,245,0.15)' : colors.tint) : colors.glass }}>
                <Text style={{ fontSize:11, fontWeight:'600',
                  color: freq===f ? colors.accent : colors.text2 }}>
                  {f.charAt(0).toUpperCase()+f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {freq === 'weekly' && (
            <View>
              <FL label="On days" />
              <View style={{ flexDirection:'row', gap:4, marginBottom:10 }}>
                {DOW.map((d,i) => (
                  <TouchableOpacity key={i} onPress={() => toggleDow(i)}
                    style={{ flex:1, aspectRatio:1, borderRadius:7, borderWidth:1.5,
                      alignItems:'center', justifyContent:'center',
                      borderColor: dow.includes(i) ? colors.accent : colors.border,
                      backgroundColor: dow.includes(i) ? (colors.isDark ? 'rgba(124,106,245,0.15)' : colors.tint) : colors.glass }}>
                    <Text style={{ fontSize:10, fontWeight:'700',
                      color: dow.includes(i) ? colors.accent : colors.text3 }}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </>
  );
}
