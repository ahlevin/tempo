import { Linking, Platform } from 'react-native';
import type { Link } from '../store/types';

// Open a URL cross-platform. Web opens a new tab; native hands off to the OS.
// Never throws — an unopenable/invalid URL is swallowed.
export async function openUrl(url: string): Promise<void> {
  const u = normalizeUrl(url);
  if (!u) return;
  try {
    if (Platform.OS === 'web') { (globalThis as any).open?.(u, '_blank', 'noopener,noreferrer'); return; }
    await Linking.openURL(u);
  } catch {
    // Invalid/unsupported URL — fail silently rather than crash the screen.
  }
}

// Prepend https:// when the user omits a scheme (e.g. "example.com"); trims.
// Leaves an explicit scheme (http/https/mailto/…) untouched.
export function normalizeUrl(raw: string): string {
  const u = (raw || '').trim();
  if (!u) return '';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(u) || /^mailto:/i.test(u)) return u;
  return 'https://' + u;
}

// Lenient plausibility check on a normalized URL: a host with a dotted TLD,
// localhost, an IP, or a mailto with an address. Display still guards openURL.
export function isPlausibleUrl(url: string): boolean {
  if (!url) return false;
  if (/^mailto:/i.test(url)) return /.+@.+\..+/.test(url);
  const m = url.match(/^https?:\/\/([^/?#]+)/i);
  if (!m) return false;
  const host = m[1];
  return host === 'localhost' || /\.[a-z]{2,}$/i.test(host) || /^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(host);
}

// Display label: the explicit label, else the bare domain (www stripped), else
// the raw URL. Never blank.
export function linkLabel(link: Link): string {
  if (link.label && link.label.trim()) return link.label.trim();
  const m = (link.url || '').match(/^https?:\/\/([^/?#]+)/i);
  if (m) return m[1].replace(/^www\./, '');
  return (link.url || '').replace(/^mailto:/i, '') || 'Link';
}

// Clean raw editor rows into stored Links: normalize the URL, trim the label,
// and drop rows whose URL is empty/implausible.
export function cleanLinks(rows: Link[]): Link[] {
  return rows
    .map(r => ({ label: (r.label || '').trim(), url: normalizeUrl(r.url) }))
    .filter(r => isPlausibleUrl(r.url));
}
