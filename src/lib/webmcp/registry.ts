import { z } from 'zod';
import type { ScramblerCard, ScramblerCluster } from '../scrambler/types';
import type { ToolDefinition, ToolResult } from './types';
import { readPrivacyPreferences, writePrivacyPreferences } from './state.svelte';
import { PROFILE } from './profile';

// =========================================================================
// Site content access (set by WebMCPProvider on mount)
// =========================================================================

interface SiteContent {
  cards: ScramblerCard[];
  clusters: ScramblerCluster[];
}

let siteContent: SiteContent = { cards: [], clusters: [] };

export function setSiteContent(content: SiteContent): void {
  siteContent = content;
}

// =========================================================================
// Shared schemas
// =========================================================================

const cardSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  summary: z.string(),
  tags: z.array(z.string()),
  cta: z
    .object({ label: z.string(), url: z.string(), external: z.boolean() })
    .optional(),
  order: z.number(),
});

const clusterSchema = z.object({
  id: z.string(),
  label: z.string(),
  orbit: z.enum(['inner', 'middle', 'outer']),
  cardIds: z.array(z.string()),
  order: z.number(),
});

const successAck = z.object({ ok: z.literal(true), message: z.string().optional() });

// =========================================================================
// Tool: getSiteMap
// =========================================================================

const getSiteMap: ToolDefinition<Record<string, never>, {
  clusters: { id: string; label: string; orbit: string; cardIds: string[]; order: number }[];
  cardCount: number;
}> = {
  name: 'getSiteMap',
  description:
    "Return the structure of the site as clusters of cards. Each cluster is a navigation group; each card is a piece of content. Use this to discover what's available before fetching specific cards or searching.",
  paramsSchema: z.object({}).strict(),
  resultSchema: z.object({
    clusters: z.array(clusterSchema.pick({ id: true, label: true, orbit: true, cardIds: true, order: true })),
    cardCount: z.number(),
  }),
  glowTarget: 'knob-dial',
  retry: false,
  async handler() {
    return {
      success: true,
      data: {
        clusters: siteContent.clusters.map((c) => ({
          id: c.id,
          label: c.label,
          orbit: c.orbit,
          cardIds: c.cards.map((card) => card.id),
          order: c.order,
        })),
        cardCount: siteContent.cards.length,
      },
    };
  },
};

// =========================================================================
// Tool: getCard
// =========================================================================

const getCard: ToolDefinition<{ id: string }, ScramblerCard> = {
  name: 'getCard',
  description: 'Fetch a single card by its id. Returns NOT_FOUND if no card has that id.',
  paramsSchema: z.object({ id: z.string().min(1).max(120) }).strict(),
  resultSchema: cardSchema.passthrough() as unknown as z.ZodType<ScramblerCard>,
  glowTarget: 'knob-dial',
  retry: false,
  async handler({ id }): Promise<ToolResult<ScramblerCard>> {
    const card = siteContent.cards.find((c) => c.id === id);
    if (!card) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: `No card with id "${id}"`, retryable: false },
      };
    }
    return { success: true, data: card };
  },
};

// =========================================================================
// Tool: searchCards
// =========================================================================

const searchCards: ToolDefinition<
  { query?: string; tags?: string[]; type?: string },
  { cards: { id: string; title: string; summary: string; tags: string[]; type: string }[] }
> = {
  name: 'searchCards',
  description:
    'Search cards by free-text query, tag list, or card type. All filters are AND-combined. Returns id + title + summary + tags + type per match (full card available via getCard).',
  paramsSchema: z
    .object({
      query: z.string().max(200).optional(),
      tags: z.array(z.string().max(60)).max(20).optional(),
      type: z.string().max(40).optional(),
    })
    .strict(),
  resultSchema: z.object({
    cards: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        summary: z.string(),
        tags: z.array(z.string()),
        type: z.string(),
      }),
    ),
  }),
  glowTarget: 'knob-dial',
  retry: false,
  async handler({ query, tags, type }) {
    const q = query?.toLowerCase().trim();
    const matched = siteContent.cards.filter((c) => {
      if (type && c.type !== type) return false;
      if (tags && tags.length > 0) {
        const cardTags = new Set(c.tags ?? []);
        if (!tags.every((t) => cardTags.has(t))) return false;
      }
      if (q) {
        const haystack = `${c.title} ${c.summary} ${(c.tags ?? []).join(' ')}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    return {
      success: true,
      data: {
        cards: matched.map((c) => ({
          id: c.id,
          title: c.title,
          summary: c.summary,
          tags: c.tags ?? [],
          type: c.type,
        })),
      },
    };
  },
};

// =========================================================================
// Tool: focusCard — dispatches a custom event for the Scrambler to pick up
// =========================================================================

const focusCard: ToolDefinition<{ id: string }, { ok: true; message?: string }> = {
  name: 'focusCard',
  description:
    'Bring a specific card to the foreground in the Scrambler view (focus + optional expand). Use after getSiteMap or searchCards to direct the user toward a specific piece of content.',
  paramsSchema: z.object({ id: z.string().min(1).max(120) }).strict(),
  resultSchema: successAck,
  glowTarget: 'knob-dial',
  async handler({ id }) {
    const card = siteContent.cards.find((c) => c.id === id);
    if (!card) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: `No card with id "${id}"`, retryable: false },
      };
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('webmcp:focus-card', { detail: { id } }));
    }
    return { success: true, data: { ok: true, message: `Focused ${card.title}` } };
  },
};

// =========================================================================
// Tool: setPrivacyPreferences
// =========================================================================

const setPrivacyPreferences: ToolDefinition<
  { analytics?: boolean; agentStorage?: boolean; agentDiscovery?: boolean },
  { analytics: boolean; agentStorage: boolean; agentDiscovery: boolean }
> = {
  name: 'setPrivacyPreferences',
  description:
    "Update the user's privacy preferences for this site. analytics: whether anonymous usage analytics are collected. agentStorage: whether agents can persist short-lived state (bookmarks etc.) on this device. agentDiscovery: whether the site shares its content map with agents.",
  paramsSchema: z
    .object({
      analytics: z.boolean().optional(),
      agentStorage: z.boolean().optional(),
      agentDiscovery: z.boolean().optional(),
    })
    .strict(),
  resultSchema: z.object({
    analytics: z.boolean(),
    agentStorage: z.boolean(),
    agentDiscovery: z.boolean(),
  }),
  glowTarget: 'avatar',
  retry: false,
  async handler(prefs) {
    const merged = writePrivacyPreferences(prefs);
    return { success: true, data: merged };
  },
};

// =========================================================================
// Tool: getResume
// =========================================================================

const getResume: ToolDefinition<Record<string, never>, { url: string; format: 'pdf' }> = {
  name: 'getResume',
  description:
    "Return the URL of Kathryn's resume (PDF). The agent can either offer the link to the user, navigate to it, or trigger a download with the URL.",
  paramsSchema: z.object({}).strict(),
  resultSchema: z.object({ url: z.string(), format: z.literal('pdf') }),
  glowTarget: 'knob-contact',
  retry: false,
  async handler() {
    return { success: true, data: { url: PROFILE.resumeUrl, format: 'pdf' } };
  },
};

// =========================================================================
// Tool: sendEmail (opens mailto: with prefilled subject/body)
// =========================================================================

const sendEmail: ToolDefinition<
  { subject?: string; body?: string; type?: string },
  { ok: true; openedMailto: string }
> = {
  name: 'sendEmail',
  description:
    "Open the user's mail client to compose a message to Kathryn, optionally prefilled with subject and body. type is a categorical tag (e.g. 'hiring', 'collaboration', 'press', 'general') for context; it doesn't change the recipient.",
  paramsSchema: z
    .object({
      subject: z.string().max(200).optional(),
      body: z.string().max(4000).optional(),
      type: z.string().max(40).optional(),
    })
    .strict(),
  resultSchema: z.object({ ok: z.literal(true), openedMailto: z.string() }),
  glowTarget: 'knob-contact',
  retry: false,
  async handler({ subject, body }) {
    if (typeof window === 'undefined') {
      return {
        success: false,
        error: { code: 'UNAVAILABLE', message: 'Mail client requires a browser', retryable: false },
      };
    }
    const params = new URLSearchParams();
    if (subject) params.set('subject', subject);
    if (body) params.set('body', body);
    const qs = params.toString();
    const mailto = `mailto:${PROFILE.contactEmail}${qs ? `?${qs}` : ''}`;
    window.location.href = mailto;
    return { success: true, data: { ok: true, openedMailto: mailto } };
  },
};

// =========================================================================
// Tool: openLinkedInProfile
// =========================================================================

const openLinkedInProfile: ToolDefinition<Record<string, never>, { ok: true; url: string }> = {
  name: 'openLinkedInProfile',
  description: "Open Kathryn's LinkedIn profile in a new tab.",
  paramsSchema: z.object({}).strict(),
  resultSchema: z.object({ ok: z.literal(true), url: z.string() }),
  glowTarget: 'knob-contact',
  retry: false,
  async handler() {
    if (typeof window === 'undefined') {
      return {
        success: false,
        error: { code: 'UNAVAILABLE', message: 'Requires a browser', retryable: false },
      };
    }
    window.open(PROFILE.linkedInUrl, '_blank', 'noopener,noreferrer');
    return { success: true, data: { ok: true, url: PROFILE.linkedInUrl } };
  },
};

// =========================================================================
// Tool: openGitHubProfile
// =========================================================================

const openGitHubProfile: ToolDefinition<Record<string, never>, { ok: true; url: string }> = {
  name: 'openGitHubProfile',
  description: "Open Kathryn's GitHub profile in a new tab.",
  paramsSchema: z.object({}).strict(),
  resultSchema: z.object({ ok: z.literal(true), url: z.string() }),
  glowTarget: 'knob-contact',
  retry: false,
  async handler() {
    if (typeof window === 'undefined') {
      return {
        success: false,
        error: { code: 'UNAVAILABLE', message: 'Requires a browser', retryable: false },
      };
    }
    window.open(PROFILE.gitHubUrl, '_blank', 'noopener,noreferrer');
    return { success: true, data: { ok: true, url: PROFILE.gitHubUrl } };
  },
};

// =========================================================================
// Tool: shareProfile
// =========================================================================

const sharePayloadSchema = z.object({
  title: z.string(),
  text: z.string(),
  url: z.string(),
  links: z.object({
    site: z.string(),
    resume: z.string(),
    linkedIn: z.string(),
    gitHub: z.string(),
  }),
  type: z.string().optional(),
  message: z.string().optional(),
  shared: z.boolean(),
});

const shareProfile: ToolDefinition<
  { type?: string; message?: string },
  z.infer<typeof sharePayloadSchema>
> = {
  name: 'shareProfile',
  description:
    "Share Kathryn's profile bundle (site + resume + LinkedIn + GitHub) with an optional personal message. type is a categorical context tag (e.g. 'intro', 'hiring', 'speaking'). If the browser supports navigator.share, the share sheet opens directly; otherwise the bundle is returned for the agent to send via its own channel.",
  paramsSchema: z
    .object({
      type: z.string().max(40).optional(),
      message: z.string().max(2000).optional(),
    })
    .strict(),
  resultSchema: sharePayloadSchema,
  glowTarget: 'knob-contact',
  retry: false,
  async handler({ type, message }) {
    const text =
      message?.trim() ||
      `${PROFILE.name} — ${PROFILE.oneLiner}`;
    const payload = {
      title: PROFILE.name,
      text,
      url: PROFILE.siteUrl,
      links: {
        site: PROFILE.siteUrl,
        resume: PROFILE.resumeUrl,
        linkedIn: PROFILE.linkedInUrl,
        gitHub: PROFILE.gitHubUrl,
      },
      type,
      message,
    };
    const canShare =
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      navigator.canShare?.({ title: payload.title, text: payload.text, url: payload.url }) !== false;
    if (canShare) {
      try {
        await navigator.share({ title: payload.title, text: payload.text, url: payload.url });
        return { success: true, data: { ...payload, shared: true } };
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return {
            success: false,
            error: { code: 'BLOCKED', message: 'User cancelled the share sheet', retryable: false },
          };
        }
        // Fall through to returning the bundle below.
      }
    }
    return { success: true, data: { ...payload, shared: false } };
  },
};

// =========================================================================
// Registry
// =========================================================================

export const tools: readonly ToolDefinition<any, any>[] = [
  getSiteMap,
  getCard,
  searchCards,
  focusCard,
  setPrivacyPreferences,
  getResume,
  sendEmail,
  openLinkedInProfile,
  openGitHubProfile,
  shareProfile,
];

export { readPrivacyPreferences, writePrivacyPreferences };
