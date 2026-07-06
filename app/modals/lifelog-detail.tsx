import { ScrollView, View, Text, TouchableOpacity, DimensionValue } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { CloseButton } from '../../components/CloseButton';
import { useStore } from '../../store/useStore';
import type { LogEntry } from '../../store/types';
import { useConfirm } from '../../components/ConfirmDialog';
import { fmtLogDate, daysSince, daysBetween } from '../../utils/dates';
import { isCollectionLog, logUniverse, logCount, upcomingCount, isUpcomingEntry, sortedEntries, logNoun } from '../../utils/lifelog';

export default function LifelogDetailModal() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const memories       = useStore(s => s.memories);
  const deleteLogEntry = useStore(s => s.deleteLogEntry);
  const detachEntryToEvent = useStore(s => s.detachEntryToEvent);
  const confirm        = useConfirm();
  const m = memories.find(x => x.id === id);

  if (!m || m.type !== 'lifelog') { router.back(); return null; }

  const teal = colors.teal;
  const collection = isCollectionLog(m);
  const universe = logUniverse(m);
  const target = m.logTarget;
  const count = logCount(m);        // COMPLETED only (excludes future-dated)
  const upN = upcomingCount(m);     // future-dated entries not yet counted
  const pct = collection && target ? Math.min(100, Math.round((count / target) * 100)) : null;

  const rows = sortedEntries(m);
  // Stats from COMPLETED dated entries only (upcoming trips shouldn't skew them).
  const dated = m.entries.filter(e => e.date && !isUpcomingEntry(e)).sort((a, b) => a.date.localeCompare(b.date));
  const lastDated = dated[dated.length - 1];
  const avgBetween = dated.length > 1 ? Math.round(daysBetween(dated[0].date, lastDated.date) / (dated.length - 1)) : null;

  const noun = logNoun(m);
  const addEntry = () => router.push({ pathname: '/modals/log-entry', params: { id: m.id } });
  const editEntry = (index: number) => router.push({ pathname: '/modals/log-entry', params: { id: m.id, edit: String(index) } });
  const editLog = () => router.push({ pathname: '/modals/edit-memory', params: { id: m.id } });

  // The ✕ on an entry does one of two very different things depending on the
  // entry's state:
  //  • UPCOMING (future-dated) — it's an attached countdown. Send it BACK to
  //    Countdowns as a standalone event (detach), never destroy it.
  //  • COMPLETED (past/dateless) — a normal logged occurrence; delete it.
  async function removeEntry(index: number, entry: LogEntry) {
    if (isUpcomingEntry(entry)) {
      const ok = await confirm({ title: `Send "${entry.item || m!.name}" back to Countdowns?`,
        message: 'It becomes a standalone countdown event again. Its date and note are kept; nothing is deleted.',
        confirmLabel: 'Move' });
      if (ok) detachEntryToEvent(m!.id, index);
      return;
    }
    const label = entry.item || fmtLogDate(entry.date, entry.datePrecision);
    const ok = await confirm({ title: 'Remove entry?', message: label ? `Remove "${label}"?` : 'Remove this entry?', confirmLabel: 'Remove', destructive: true });
    if (ok) deleteLogEntry(m!.id, index);
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:colors.surf2 }} edges={['top']}>
      <View style={{ width:40, height:4, backgroundColor:colors.border,
        borderRadius:2, alignSelf:'center', marginTop:10, marginBottom:4 }} />
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center',
        paddingHorizontal:20, paddingVertical:12 }}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:10, flex:1 }}>
          <Text style={{ fontSize:24 }}>{m.emoji}</Text>
          <Text style={{ fontSize:18, fontWeight:'700', color:colors.text1 }} numberOfLines={1}>{m.name}</Text>
        </View>
        <TouchableOpacity onPress={editLog} style={{ marginRight:14 }}>
          <Text style={{ fontSize:14, fontWeight:'600', color:teal }}>Edit</Text>
        </TouchableOpacity>
        <CloseButton />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal:16, paddingBottom:60 }}
        showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={{ backgroundColor:colors.surf, borderRadius:18, borderWidth:1, borderColor:colors.border, padding:16, marginBottom:16 }}>
          {collection && target ? (
            <>
              <View style={{ flexDirection:'row', alignItems:'baseline', gap:6 }}>
                <Text style={{ fontSize:34, fontWeight:'800', color:teal, fontVariant:['tabular-nums'] }}>{count}</Text>
                <Text style={{ fontSize:16, fontWeight:'600', color:colors.text2 }}>of {target}</Text>
                {pct !== null && <Text style={{ fontSize:14, color:colors.text2, marginLeft:2 }}>· {pct}%</Text>}
              </View>
              <View style={{ height:8, borderRadius:4, backgroundColor:colors.track, marginTop:10, overflow:'hidden' }}>
                <View style={{ height:'100%', width:`${pct ?? 0}%` as DimensionValue, backgroundColor:teal, borderRadius:4 }} />
              </View>
              {upN > 0 && (
                <Text style={{ fontSize:13, color:colors.text2, marginTop:8 }}>{count} visited · {upN} upcoming</Text>
              )}
            </>
          ) : (
            <>
              <View style={{ flexDirection:'row', alignItems:'baseline', gap:6, flexWrap:'wrap' }}>
                <Text style={{ fontSize:34, fontWeight:'800', color:teal, fontVariant:['tabular-nums'] }}>{count}</Text>
                <Text style={{ fontSize:16, fontWeight:'600', color:colors.text2 }}>{count === 1 ? 'time' : 'times'}</Text>
                {lastDated && <Text style={{ fontSize:13, color:colors.text2, marginLeft:4 }}>· last {fmtLogDate(lastDated.date, lastDated.datePrecision)}</Text>}
              </View>
              {upN > 0 && (
                <Text style={{ fontSize:13, color:colors.text2, marginTop:6 }}>{count} completed · {upN} upcoming</Text>
              )}
              {dated.length > 0 && (
                <View style={{ flexDirection:'row', gap:16, marginTop:10 }}>
                  <Stat value={daysSince(lastDated.date)} label="since last" color={teal} />
                  {avgBetween !== null && <Stat value={avgBetween} label="avg between" color={colors.text1} />}
                </View>
              )}
            </>
          )}
        </View>

        {/* Add */}
        <TouchableOpacity onPress={addEntry}
          style={{ backgroundColor: colors.isDark ? 'rgba(62,207,178,0.16)' : colors.tint, borderRadius:14,
            padding:15, alignItems:'center', marginBottom:16 }}>
          <Text style={{ fontSize:15, fontWeight:'700', color:teal }}>
            {rows.length === 0
              ? `+ Add your first ${noun}`
              : collection && universe ? '+ Add' : '+ Add entry'}
          </Text>
        </TouchableOpacity>

        {/* Entries */}
        {rows.length > 0 && (
          <>
            <Text style={{ fontSize:11, fontWeight:'700', color:colors.text3, textTransform:'uppercase', letterSpacing:0.6, marginBottom:10, marginLeft:4 }}>
              {collection ? 'Logged' : 'History'} · {m.entries.length}
            </Text>
            {rows.map(({ entry, index }) => {
              const up = isUpcomingEntry(entry);
              const primary = entry.item || fmtLogDate(entry.date, entry.datePrecision);
              const secondary = entry.item ? fmtLogDate(entry.date, entry.datePrecision) : '';
              return (
                <View key={index} style={{ flexDirection:'row', alignItems:'center', gap:10,
                  backgroundColor:colors.surf, borderRadius:14, borderWidth:1, borderColor:colors.border,
                  padding:12, marginBottom:8 }}>
                  <View style={{ width:26, height:26, borderRadius:13, backgroundColor: colors.isDark ? 'rgba(62,207,178,0.16)' : colors.tint, alignItems:'center', justifyContent:'center' }}>
                    <Text style={{ fontSize:12, color:teal }}>{up ? '⏳' : collection ? '✓' : '•'}</Text>
                  </View>
                  <View style={{ flex:1 }}>
                    <View style={{ flexDirection:'row', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                      <Text style={{ fontSize:14, fontWeight:'600', color:colors.text1, maxWidth:'78%' }} numberOfLines={1}>{primary}</Text>
                      {up && (
                        <View style={{ backgroundColor: colors.isDark ? 'rgba(62,207,178,0.16)' : colors.tint, borderRadius:8, paddingVertical:2, paddingHorizontal:7 }}>
                          <Text style={{ fontSize:9, fontWeight:'800', color:teal, textTransform:'uppercase', letterSpacing:0.3 }}>Upcoming</Text>
                        </View>
                      )}
                    </View>
                    {!!secondary && <Text style={{ fontSize:13, color:colors.text2, marginTop:1 }}>{secondary}</Text>}
                    {!!entry.note && <Text style={{ fontSize:13, color:colors.text2, marginTop:2 }} numberOfLines={2}>{entry.note}</Text>}
                  </View>
                  <TouchableOpacity onPress={() => editEntry(index)} hitSlop={{ top:8, bottom:8, left:8, right:8 }}
                    style={{ width:40, height:40, alignItems:'center', justifyContent:'center' }}>
                    <Text style={{ fontSize:17 }}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeEntry(index, entry)} hitSlop={{ top:8, bottom:8, left:8, right:8 }}
                    style={{ width:40, height:40, alignItems:'center', justifyContent:'center' }}>
                    <Text style={{ fontSize:18, color: up ? teal : colors.rose }}>{up ? '↩︎' : '✕'}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label, color }: { value: number | string; label: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View>
      <Text style={{ fontSize:16, fontWeight:'800', color, fontVariant:['tabular-nums'] }}>{value}</Text>
      <Text style={{ fontSize:9, color:colors.text3, textTransform:'uppercase', letterSpacing:0.4, marginTop:1 }}>{label}</Text>
    </View>
  );
}
