/**
 * Detect a video URL and return embed info if recognized. Returns null
 * for non-video URLs so callers can branch on a single null check.
 *
 * Supported providers: Vimeo, YouTube. Privacy-friendly embed URLs:
 *   - Vimeo:   https://player.vimeo.com/video/{id}?dnt=1
 *   - YouTube: https://www.youtube-nocookie.com/embed/{id}
 *
 * Timestamp handling:
 *   - Vimeo: parse `#t=11m23s`, `#t=683s`, or `t=683` (seconds) from URL
 *     fragments / query. Pass through to embed as `#t=...`.
 *   - YouTube: parse `?t=47` or `?t=47s`. Embed as `?start=47`.
 *
 * Trusted-author content (site owner only) so we don't sanitize embed
 * URLs beyond extracting the id and known params.
 */

export type VideoProvider = 'vimeo' | 'youtube';

export interface VideoEmbed {
  provider: VideoProvider;
  id: string;
  /** URL suitable for an <iframe src>. */
  embedUrl: string;
  /** Original watch URL, suitable for "Watch on [Provider]" external link. */
  watchUrl: string;
  /** Optional start position in seconds. */
  startSeconds?: number;
  /** Display name for "Watch on" copy. */
  providerLabel: string;
  /**
   * Poster image URL to render behind the iframe so the video slot
   * doesn't flash a dark empty box during page load. YouTube exposes
   * a deterministic URL pattern; Vimeo requires an API call (deferred).
   */
  thumbnailUrl?: string;
}

const VIMEO_ID = /vimeo\.com\/(?:video\/)?(\d+)/;
const YT_ID = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/;

function parseTimestampSeconds(url: string): number | undefined {
  // Match `#t=11m23s`, `#t=683s`, `?t=47`, `?t=47s`, `&t=47`, `#t=683`.
  const m = url.match(/[#&?]t=(?:(\d+)m)?(\d+)s?/);
  if (!m) return undefined;
  const minutes = m[1] ? parseInt(m[1], 10) : 0;
  const seconds = m[2] ? parseInt(m[2], 10) : 0;
  const total = minutes * 60 + seconds;
  return total > 0 ? total : undefined;
}

function formatVimeoFragment(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `#t=${s}s`;
  return s === 0 ? `#t=${m}m` : `#t=${m}m${s}s`;
}

export function parseVideo(url: string | undefined | null): VideoEmbed | null {
  if (!url) return null;
  const startSeconds = parseTimestampSeconds(url);

  const vimeoMatch = url.match(VIMEO_ID);
  if (vimeoMatch) {
    const id = vimeoMatch[1];
    const frag = startSeconds ? formatVimeoFragment(startSeconds) : '';
    return {
      provider: 'vimeo',
      id,
      embedUrl: `https://player.vimeo.com/video/${id}?dnt=1${frag}`,
      watchUrl: url,
      startSeconds,
      providerLabel: 'Vimeo',
    };
  }

  const ytMatch = url.match(YT_ID);
  if (ytMatch) {
    const id = ytMatch[1];
    const start = startSeconds ? `?start=${startSeconds}` : '';
    return {
      provider: 'youtube',
      id,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}${start}`,
      watchUrl: url,
      startSeconds,
      providerLabel: 'YouTube',
      /* hqdefault is universally available across YouTube videos
       * (480x360, 4:3 — browser scales/crops to our 16:9 slot).
       * maxresdefault would be sharper but 404s on videos without
       * a max-res thumbnail, which would re-introduce the flash. */
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }

  return null;
}

export function formatTimestamp(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
