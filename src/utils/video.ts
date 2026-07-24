export type VideoEmbedKind = 'youtube' | 'vimeo' | 'file';

export type VideoEmbed = {
  kind: VideoEmbedKind;
  embedUrl: string;
  /** Platform video id when kind is youtube or vimeo. */
  id?: string;
};

const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const DIRECT_MEDIA_EXT_PATTERN = /\.(mp4|webm|ogg|mov|m4v)(?:$|[?#])/i;

/**
 * If the input looks like an HTML iframe snippet, return the src attribute value.
 */
export function extractIframeSrc(input: string): string | null {
  const trimmed = input.trim();
  if (!/<iframe[\s>]/i.test(trimmed)) return null;

  const srcMatch =
    trimmed.match(/\bsrc\s*=\s*"([^"]+)"/i) ??
    trimmed.match(/\bsrc\s*=\s*'([^']+)'/i) ??
    trimmed.match(/\bsrc\s*=\s*([^\s>]+)/i);

  const src = srcMatch?.[1]?.trim();
  return src || null;
}

function extractYoutubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const path = parsed.pathname;
      if (path.startsWith('/embed/') || path.startsWith('/shorts/') || path.startsWith('/v/')) {
        const id = path.split('/').filter(Boolean)[1];
        return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
      }
      const fromQuery = parsed.searchParams.get('v');
      if (fromQuery && YOUTUBE_ID_PATTERN.test(fromQuery)) return fromQuery;
    }
  } catch {
    // fall through to regex
  }

  const match = url.match(
    /(?:youtube\.com\/(?:shorts\/|embed\/|v\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

function extractVimeoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      // player.vimeo.com/video/123 or vimeo.com/123
      const idPart = host === 'player.vimeo.com' && parts[0] === 'video' ? parts[1] : parts[0];
      if (idPart && /^\d+$/.test(idPart)) return idPart;
    }
  } catch {
    // fall through
  }

  const match = url.match(
    /(?:player\.)?vimeo\.com\/(?:video\/)?(?:.*#|.*\/videos\/)?(\d+)/
  );
  return match?.[1] ?? null;
}

function isDirectMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    return DIRECT_MEDIA_EXT_PATTERN.test(parsed.pathname);
  } catch {
    return false;
  }
}

/** Static YouTube thumbnail for click-to-load facades. */
export function youtubePosterUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/**
 * Convert a user-provided video string (URL, shorts link, or iframe snippet)
 * into a playable embed descriptor.
 */
export function toVideoEmbed(input: string): VideoEmbed | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const candidate = extractIframeSrc(trimmed) ?? trimmed;

  const youtubeId = extractYoutubeId(candidate);
  if (youtubeId) {
    return {
      kind: 'youtube',
      id: youtubeId,
      embedUrl: `https://www.youtube.com/embed/${youtubeId}?rel=0`,
    };
  }

  const vimeoId = extractVimeoId(candidate);
  if (vimeoId) {
    return {
      kind: 'vimeo',
      id: vimeoId,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
    };
  }

  if (isDirectMediaUrl(candidate)) {
    return { kind: 'file', embedUrl: candidate };
  }

  return null;
}

/**
 * Normalize seller input to a clean http(s) URL suitable for Firestore storage
 * (so httpHttpsUrl validation keeps working; iframe HTML is never persisted).
 */
export function normalizeVideoUrlForStorage(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const candidate = extractIframeSrc(trimmed) ?? trimmed;
  const embed = toVideoEmbed(candidate);
  if (!embed) return null;

  if (embed.kind === 'youtube' && embed.id) {
    return `https://www.youtube.com/watch?v=${embed.id}`;
  }

  if (embed.kind === 'vimeo' && embed.id) {
    return `https://vimeo.com/${embed.id}`;
  }

  return embed.embedUrl;
}
