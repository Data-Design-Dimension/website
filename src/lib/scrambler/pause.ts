/**
 * Aggregates the orbit-pause reasons for a Scrambler cluster.
 *
 * Each cluster collects several signals that should stop its orbital
 * RAF loop. They live as separate booleans so each can be cleared
 * independently (see ScramblerCluster.svelte for the history behind
 * that split). `isOrbitPaused` does the trivial OR across them, but
 * naming the contract lets the parent and the tests refer to it
 * without re-deriving the rule each time.
 *
 * - hover               — mouse / pen is over the cluster
 * - focus               — keyboard focus is inside the cluster
 * - tap                 — sticky pause from a background click; SHARED
 *                          across all clusters via the parent so one
 *                          click pauses every cluster together (#43)
 * - anyCardOpen         — some card anywhere on the Scrambler is open
 * - dragging            — a card in this cluster is mid-drag
 * - recentlyCollapsed   — the 800ms post-collapse spring-settle grace
 */
export interface OrbitPauseReasons {
  hover: boolean;
  focus: boolean;
  tap: boolean;
  anyCardOpen: boolean;
  dragging: boolean;
  recentlyCollapsed: boolean;
}

export function isOrbitPaused(reasons: OrbitPauseReasons): boolean {
  return (
    reasons.hover ||
    reasons.focus ||
    reasons.tap ||
    reasons.anyCardOpen ||
    reasons.dragging ||
    reasons.recentlyCollapsed
  );
}
