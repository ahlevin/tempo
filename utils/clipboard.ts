import * as Clipboard from 'expo-clipboard';

// Copy text to the clipboard on web + native. Returns false on failure so callers
// can surface a fallback (e.g. "select the text below").
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    try {
      // Web fallback when the Expo module's web shim isn't available.
      const nav: any = (globalThis as any).navigator;
      if (nav?.clipboard?.writeText) { await nav.clipboard.writeText(text); return true; }
    } catch { /* ignore */ }
    return false;
  }
}
