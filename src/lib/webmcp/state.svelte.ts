import type { ToolGlowTarget } from './types';

/**
 * Global state for the in-flight tool indicator. UI components watch
 * `toolInFlight` and apply the glow halo when their target matches.
 *
 * Usage from Svelte 5:
 *   import { toolInFlight } from './state.svelte';
 *   const active = $derived(toolInFlight.value?.target === 'knob-see-work');
 */
export const toolInFlight = $state<{
  value: { tool: string; target: ToolGlowTarget } | null;
}>({
  value: null,
});

export function setToolInFlight(tool: string, target: ToolGlowTarget): void {
  toolInFlight.value = { tool, target };
}

export function clearToolInFlight(): void {
  toolInFlight.value = null;
}

/**
 * Local privacy preferences. Persists to localStorage. Agents can read
 * + write via the `setPrivacyPreferences` tool, with the user's UI
 * preferences page also writing here.
 */
const PRIVACY_KEY = 'dadeda:privacy';

export interface PrivacyPreferences {
  analytics: boolean;
  /** Whether agents can persist short-lived state (bookmarks, etc.) on this device. */
  agentStorage: boolean;
  /** Whether the site shares its content map with agents that announce themselves. */
  agentDiscovery: boolean;
}

const DEFAULT_PRIVACY: PrivacyPreferences = {
  analytics: false,
  agentStorage: false,
  agentDiscovery: true,
};

export function readPrivacyPreferences(): PrivacyPreferences {
  if (typeof localStorage === 'undefined') return DEFAULT_PRIVACY;
  try {
    const raw = localStorage.getItem(PRIVACY_KEY);
    if (!raw) return DEFAULT_PRIVACY;
    return { ...DEFAULT_PRIVACY, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PRIVACY;
  }
}

export function writePrivacyPreferences(prefs: Partial<PrivacyPreferences>): PrivacyPreferences {
  const merged = { ...readPrivacyPreferences(), ...prefs };
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(PRIVACY_KEY, JSON.stringify(merged));
    } catch {
      // Storage unavailable / quota exceeded; preference applies for this session only.
    }
  }
  return merged;
}
