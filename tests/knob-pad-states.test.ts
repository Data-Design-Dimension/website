import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * #46 — the inactive See-Work / GTK pad fills should carry an alpha
 * component so the sage canvas reads through (tester said the
 * previous solid fills still presented as "kind of on"). Active pads
 * stay solid so the on/off contrast jumps. This is enforced
 * structurally in the Knob.svelte stylesheet; the test guards
 * against an accidental regression that drops the alpha or sneaks
 * one onto the active state.
 */
const KNOB_SVELTE = readFileSync(
  resolve(__dirname, '../src/components/Knob.svelte'),
  'utf-8',
);

function extractFill(selector: string): string {
  // Match the CSS block for `selector` and pull its `fill:` value.
  // Selector appears at column 0 to avoid matching `.pad-green.active`
  // when looking for `.pad-green`.
  const re = new RegExp(`\\n  ${escapeForRegex(selector)} \\{[\\s\\S]*?fill:\\s*([^;]+);`, 'm');
  const m = KNOB_SVELTE.match(re);
  if (!m) throw new Error(`Could not find fill for selector: ${selector}`);
  return m[1].trim();
}

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('Knob pad fills (#46)', () => {
  it('inactive See-Work pad uses an alpha-bearing oklch fill', () => {
    const fill = extractFill('.pad-green');
    expect(fill).toMatch(/oklch\([^)]*\/\s*0?\.\d+\s*\)/);
  });

  it('inactive GTK pad uses an alpha-bearing oklch fill', () => {
    const fill = extractFill('.pad-amber');
    expect(fill).toMatch(/oklch\([^)]*\/\s*0?\.\d+\s*\)/);
  });

  it('active See-Work pad uses a solid (alpha-free) fill', () => {
    const fill = extractFill('.pad-green.active');
    // Active is var(--color-accent-green) — solid by definition, no
    // inline alpha component in the rule. Asserting we never sneak
    // a slash-alpha onto the active rule.
    expect(fill).not.toMatch(/\/\s*0?\.\d+\s*\)/);
  });

  it('active GTK pad uses a solid (alpha-free) fill', () => {
    const fill = extractFill('.pad-amber.active');
    expect(fill).not.toMatch(/\/\s*0?\.\d+\s*\)/);
  });
});
