import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format, addDays, subYears } from 'date-fns';
import { Colors } from '../../constants/colors';
import { TIMEZONES } from '../../constants/data';
import { useStore } from '../../store/useStore';
import { UserPrefs } from '../../store/types';
import { DateTimeField } from '../../components/DateTimeField';

const STEPS = ['Your name', 'Time zone', 'First countdown', 'Daily quote'];

type ItemType = 'event' | 'birthday' | 'anniversary';
const ITEM_TYPES: { id: ItemType; label: string; emoji: string }[] = [
  { id: 'event',       label: 'Event',       emoji: '🎉' },
  { id: 'birthday',    label: 'Birthday',    emoji: '🎂' },
  { id: 'anniversary', label: 'Anniversary', emoji: '💍' },
];

const QUOTE_OPTS: { id: UserPrefs['quotePref']; icon: string; label: string; desc: string }[] = [
  { id: 'bible',        icon: '✝️', label: 'Bible Verse',    desc: 'Daily scripture for reflection' },
  { id: 'motivational', icon: '⚡', label: 'Motivational',    desc: 'Fuel your day with inspiration' },
  { id: 'jokes',        icon: '😄', label: 'Joke of the Day', desc: 'Start your day with a smile' },
  { id: 'off',          icon: '🔕', label: 'No Quote',        desc: 'Keep the home screen minimal' },
];

export default function OnboardingWizard() {
  const prefs       = useStore(s => s.prefs);
  const updatePrefs = useStore(s => s.updatePrefs);
  const addEvent    = useStore(s => s.addEvent);
  const addMemory   = useStore(s => s.addMemory);

  const [step,     setStep]     = useState(0);
  const [name,     setName]     = useState(prefs.displayName || '');
  const [tz,       setTz]       = useState(prefs.timezone);
  const [itemType, setItemType] = useState<ItemType>('event');
  const [evName,   setEvName]   = useState('');
  const [evDate,   setEvDate]   = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTouched, setDateTouched] = useState(false);
  const [quote,    setQuote]    = useState<UserPrefs['quotePref']>(prefs.quotePref);

  // Events count forward (default ~a month out); birthdays/anniversaries count to
  // the next annual occurrence, so a neutral past date is a better starting point
  // than today+30. Only auto-swap the default while the user hasn't picked a date.
  function pickType(t: ItemType) {
    setItemType(t);
    if (!dateTouched) {
      setEvDate(t === 'event'
        ? format(addDays(new Date(), 30), 'yyyy-MM-dd')
        : format(subYears(new Date(), 30), 'yyyy-MM-dd'));
    }
  }

  function finish() {
    updatePrefs({ displayName: name.trim(), timezone: tz, quotePref: quote, onboarded: true });
    if (evName.trim()) {
      if (itemType === 'event') {
        // A plain one-time event, counting down to the chosen date.
        addEvent({
          name: evName.trim(), emoji: '🎉', cat: 'celebration',
          allDay: true, start: `${evDate}T00:00:00`, end: null, date: evDate,
          fav: true, recur: null, alerts: [],
        });
      } else {
        // Birthday/anniversary: a recurring Memory. The origin year (e.g. 1974)
        // is preserved for age/years; the countdown targets the next annual date.
        addMemory({
          type: itemType, name: evName.trim(),
          emoji: itemType === 'birthday' ? '🎂' : '💍',
          originDate: evDate, entries: [], note: '',
        });
      }
    }
    router.replace('/tabs');
  }

  const dateLabel = itemType === 'event' ? 'Date'
    : itemType === 'birthday' ? 'Date of birth' : 'Anniversary date';
  const namePlaceholder = itemType === 'event' ? 'e.g. Summer vacation…'
    : itemType === 'birthday' ? "e.g. Mom's birthday" : 'e.g. Our wedding';

  const isLast = step === STEPS.length - 1;
  const next = () => (isLast ? finish() : setStep(step + 1));
  const back = () => setStep(Math.max(0, step - 1));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={{ alignItems: 'center', paddingTop: 24, paddingBottom: 8 }}>
          <Text style={{ fontSize: 30, fontWeight: '800', color: Colors.text1, letterSpacing: -1 }}>
            sayZay<Text style={{ color: Colors.accent }}>.</Text>
          </Text>
        </View>

        {/* Progress */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 14 }}>
          {STEPS.map((_, i) => (
            <View key={i} style={{ height: 6, borderRadius: 3,
              width: i === step ? 26 : 6,
              backgroundColor: i <= step ? Colors.accent : 'rgba(255,255,255,0.15)' }} />
          ))}
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 20, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <Text style={{ fontSize: 24, fontWeight: '800', color: Colors.text1, marginBottom: 6 }}>
            {stepTitle(step)}
          </Text>
          <Text style={{ fontSize: 14, color: Colors.text3, marginBottom: 24 }}>
            {stepSubtitle(step)}
          </Text>

          {step === 0 && (
            <TextInput value={name} onChangeText={setName}
              placeholder="What should we call you?" placeholderTextColor={Colors.text3}
              autoCapitalize="words" style={inputStyle} />
          )}

          {step === 1 && (
            <View style={{ gap: 8 }}>
              {TIMEZONES.map(t => {
                const sel = tz === t.value;
                return (
                  <TouchableOpacity key={t.value} onPress={() => setTz(t.value)}
                    style={{ padding: 13, borderRadius: 12, borderWidth: 1.5,
                      borderColor: sel ? Colors.accent : Colors.border,
                      backgroundColor: sel ? 'rgba(124,106,245,0.12)' : Colors.glass }}>
                    <Text style={{ fontSize: 14, fontWeight: '600',
                      color: sel ? Colors.accent : Colors.text2 }}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {step === 2 && (
            <View>
              <FieldLabel label="Type" />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {ITEM_TYPES.map(t => {
                  const sel = itemType === t.id;
                  return (
                    <TouchableOpacity key={t.id} onPress={() => pickType(t.id)}
                      style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
                        alignItems: 'center', gap: 3,
                        borderColor: sel ? Colors.accent : Colors.border,
                        backgroundColor: sel ? 'rgba(124,106,245,0.12)' : Colors.glass }}>
                      <Text style={{ fontSize: 20 }}>{t.emoji}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '600',
                        color: sel ? Colors.accent : Colors.text2 }}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <FieldLabel label="Name" />
              <TextInput value={evName} onChangeText={setEvName}
                placeholder={namePlaceholder} placeholderTextColor={Colors.text3} style={inputStyle} />
              <DateTimeField mode="date" label={dateLabel} value={evDate}
                onChange={(d) => { setEvDate(d); setDateTouched(true); }} />
              {itemType !== 'event' && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: -6, marginBottom: 8,
                  padding: 12, borderRadius: 12, backgroundColor: 'rgba(124,106,245,0.08)',
                  borderWidth: 1, borderColor: 'rgba(124,106,245,0.2)' }}>
                  <Text style={{ fontSize: 15 }}>🔁</Text>
                  <Text style={{ flex: 1, fontSize: 12, color: Colors.text2, lineHeight: 17 }}>
                    Enter the original {itemType === 'birthday' ? 'birth date (e.g. the birth year)' : 'wedding date'}.
                    sayZay counts down to the next one every year and shows the {itemType === 'birthday' ? 'age' : 'years'} automatically — no need to set recurrence.
                  </Text>
                </View>
              )}
              <TouchableOpacity onPress={() => setStep(step + 1)} style={{ alignSelf: 'center', paddingVertical: 10, marginTop: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.text3 }}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 3 && (
            <View style={{ gap: 8 }}>
              {QUOTE_OPTS.map(opt => {
                const sel = quote === opt.id;
                return (
                  <TouchableOpacity key={opt.id} onPress={() => setQuote(opt.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14,
                      borderRadius: 14, borderWidth: 1.5,
                      borderColor: sel ? Colors.accent : Colors.border,
                      backgroundColor: sel ? 'rgba(124,106,245,0.1)' : Colors.glass }}>
                    <View style={{ width: 44, height: 44, borderRadius: 13,
                      backgroundColor: 'rgba(124,106,245,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 22 }}>{opt.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: sel ? Colors.accent : Colors.text1 }}>{opt.label}</Text>
                      <Text style={{ fontSize: 12, color: Colors.text3, marginTop: 2 }}>{opt.desc}</Text>
                    </View>
                    {sel && <Text style={{ fontSize: 18, color: Colors.accent }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Footer nav */}
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingVertical: 16 }}>
          {step > 0 && (
            <TouchableOpacity onPress={back}
              style={{ paddingVertical: 16, paddingHorizontal: 22, borderRadius: 14,
                borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.glass }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.text2 }}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={next}
            style={{ flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: Colors.accent, alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{isLast ? 'Finish' : 'Next'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function stepTitle(step: number): string {
  return ['What’s your name?', 'Pick your time zone', 'Add something to count down to', 'Choose a daily quote'][step];
}
function stepSubtitle(step: number): string {
  return [
    'We’ll use this to personalize sayZay.',
    'So your countdowns land at the right time.',
    'An event, or a birthday/anniversary that repeats every year — or skip for now.',
    'A little something for your home screen each day.',
  ][step];
}

const inputStyle = {
  backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  borderRadius: 12, padding: 14, color: Colors.text1, fontSize: 16, marginBottom: 16,
} as const;

function FieldLabel({ label }: { label: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.text3,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label}</Text>
  );
}
