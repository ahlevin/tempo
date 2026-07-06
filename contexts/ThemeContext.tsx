import { createContext, useContext } from 'react';
import { useStore } from '../store/useStore';
import { palettes, darkColors, Palette, ThemeName } from '../constants/colors';

interface ThemeValue {
  colors: Palette;
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
}

const ThemeContext = createContext<ThemeValue>({
  colors: darkColors,
  theme: 'dark',
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

// Latest active palette, for the rare non-hook reader (e.g. imperative code).
let active: Palette = darkColors;
export function getActiveColors(): Palette {
  return active;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // The active theme lives in the user's prefs (synced to Supabase). Reading it
  // from the store makes this provider re-render (and re-theme the app) the moment
  // it changes — on login load or when the user toggles it.
  const theme = useStore(s => s.prefs.theme);
  const updatePrefs = useStore(s => s.updatePrefs);

  const name: ThemeName = theme === 'light' ? 'light' : 'dark';
  const colors = palettes[name] ?? darkColors;
  active = colors;

  return (
    <ThemeContext.Provider value={{ colors, theme: name, setTheme: (t) => updatePrefs({ theme: t }) }}>
      {children}
    </ThemeContext.Provider>
  );
}
