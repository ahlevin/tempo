import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useStore } from '../store/useStore';

const WX_ICONS: Record<number, string> = {
  0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',51:'🌦️',
  61:'🌧️',63:'🌧️',71:'🌨️',75:'❄️',80:'🌦️',95:'⛈️'
};
const WX_DESC: Record<number, string> = {
  0:'Clear',1:'Mostly clear',2:'Partly cloudy',3:'Overcast',
  45:'Foggy',51:'Drizzle',61:'Light rain',63:'Moderate rain',
  71:'Light snow',75:'Heavy snow',80:'Showers',95:'Thunderstorm'
};

export function DateWeatherBar() {
  const { colors } = useTheme();
  const prefs = useStore(s => s.prefs);
  const [wx, setWx]       = useState<any>(null);
  const [now, setNow]     = useState(new Date());

  // The bar shows a DATE (no live seconds/minutes), so it only needs to change at
  // midnight. Instead of a per-minute interval (1,440 wasted re-renders/day), we
  // schedule a single timeout to just after the next local midnight, update once,
  // then reschedule for the following day. Net: ~1 update/day.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const scheduleMidnight = () => {
      const d = new Date();
      const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 5); // 00:00:05 tomorrow
      timer = setTimeout(() => { setNow(new Date()); scheduleMidnight(); }, next.getTime() - d.getTime());
    };
    scheduleMidnight();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => { loadWeather(); }, [prefs.location]);

  async function loadWeather() {
    try {
      let lat: number, lon: number, city: string;
      if (prefs.location) {
        const r = await fetch(
          'https://geocoding-api.open-meteo.com/v1/search?name=' +
          encodeURIComponent(prefs.location) + '&count=1&language=en&format=json'
        );
        const d = await r.json();
        if (!d.results?.length) return;
        lat = d.results[0].latitude;
        lon = d.results[0].longitude;
        city = d.results[0].admin1
          ? d.results[0].name + ', ' + d.results[0].admin1
          : d.results[0].name;
      } else {
        lat = 37.3382;
        lon = -121.8863;
        city = 'San Jose, CA';
      }
      const r2 = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=' + lat +
        '&longitude=' + lon +
        '&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto'
      );
      const d2 = await r2.json();
      const code = d2.current.weather_code;
      setWx({
        temp: Math.round(d2.current.temperature_2m),
        icon: WX_ICONS[code] || '🌡️',
        desc: WX_DESC[code] || 'Unknown',
        city,
      });
    } catch {}
  }

  const tz = prefs.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: tz,
  });
  const tzShort = now.toLocaleTimeString('en-US', {
    timeZone: tz, timeZoneName: 'short',
  }).split(' ').pop() || '';

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.surf, borderRadius: 18, borderWidth: 1,
      borderColor: colors.border, padding: 12, paddingHorizontal: 16, marginBottom: 16, gap: 12,
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text1, letterSpacing: -0.3 }}>
          {dateStr}
        </Text>
        <Text style={{ fontSize: 11, color: colors.text3, marginTop: 3 }}>
          {tzShort} · {tz.replace(/_/g, ' ').replace(/\//g, ' · ')}
        </Text>
      </View>
      {wx && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 11, color: colors.text3 }}>{wx.city}</Text>
            <Text style={{ fontSize: 10, color: colors.text3 }}>{wx.desc}</Text>
          </View>
          <Text style={{ fontSize: 26 }}>{wx.icon}</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text1 }}>{wx.temp}°F</Text>
        </View>
      )}
    </View>
  );
}
