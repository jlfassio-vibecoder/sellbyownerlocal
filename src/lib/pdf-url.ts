const pdfUrlPattern = /\.pdf($|\?)/i;
const imageUrlPattern = /\.(png|jpe?g|webp)($|\?)/i;

export function isImageUrl(url: string): boolean {
  if (url.startsWith('data:image/')) return true;
  if (imageUrlPattern.test(url)) return true;

  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() === 'firebasestorage.googleapis.com') {
      const encodedObject = parsed.pathname.match(/\/o\/(.+)$/)?.[1];
      if (encodedObject) {
        return imageUrlPattern.test(decodeURIComponent(encodedObject));
      }
    }
  } catch {
    // ignore
  }

  return false;
}

const NON_EMBEDDABLE_PDF_HOSTS = new Set(['www.w3.org', 'w3.org']);

export function isPdfUrl(url: string) {
  if (url.startsWith('data:application/pdf')) return true;
  if (pdfUrlPattern.test(url)) return true;

  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() === 'firebasestorage.googleapis.com') {
      const encodedObject = parsed.pathname.match(/\/o\/(.+)$/)?.[1];
      if (encodedObject) {
        return decodeURIComponent(encodedObject).toLowerCase().endsWith('.pdf');
      }
    }
  } catch {
    // ignore
  }

  return false;
}

/** Whether a PDF URL can be shown in an iframe without CSP frame-ancestors errors. */
export function canEmbedPdf(url: string): boolean {
  if (url.startsWith('data:application/pdf')) return true;
  if (url.startsWith('/')) return true;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (NON_EMBEDDABLE_PDF_HOSTS.has(host)) return false;

    return (
      host.endsWith('firebasestorage.app') ||
      host === 'firebasestorage.googleapis.com' ||
      host.endsWith('googleusercontent.com') ||
      host === 'storage.googleapis.com'
    );
  } catch {
    return false;
  }
}
