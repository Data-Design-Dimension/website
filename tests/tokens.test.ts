import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Design tokens', () => {
  const tokensCSS = readFileSync(
    resolve(__dirname, '../src/styles/tokens.css'),
    'utf-8',
  );

  it('defines the #DADEDA brand canvas color', () => {
    expect(tokensCSS).toContain('--color-canvas:');
    expect(tokensCSS).toContain('oklch(0.89');
  });

  it('defines data viz palette with at least 8 colors', () => {
    const vizMatches = tokensCSS.match(/--viz-\d+:/g);
    expect(vizMatches).not.toBeNull();
    expect(vizMatches!.length).toBeGreaterThanOrEqual(8);
  });

  it('respects prefers-reduced-motion', () => {
    expect(tokensCSS).toContain('prefers-reduced-motion');
    expect(tokensCSS).toContain('0ms');
  });
});
