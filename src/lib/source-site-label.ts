/** Known listing hosts → public brand labels (exact hostname after stripping www). */
const KNOWN_SOURCE_HOSTS: Record<string, string> = {
  'cars.com': 'Cars.com',
  'carvana.com': 'Carvana',
  'carmax.com': 'CarMax',
  'autotrader.com': 'Autotrader',
};

/**
 * Display-only site name for comparable / external dealer source URLs.
 * Never returns the full URL — visitors should not be able to copy-paste a redirect.
 */
export function formatSourceSiteLabel(url: string): string | undefined {
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  try {
    const host = new URL(trimmed).hostname.replace(/^www\./i, '').toLowerCase();
    if (!host) return undefined;

    const known = KNOWN_SOURCE_HOSTS[host];
    if (known) return known;

    return host.charAt(0).toUpperCase() + host.slice(1);
  } catch {
    return undefined;
  }
}
