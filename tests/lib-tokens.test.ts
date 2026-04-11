import { describe, it, expect } from 'vitest';
import { brand, neutral, viz, vizLabels } from '../src/lib/tokens';

describe('TypeScript design tokens', () => {
  it('brand canvas matches #DADEDA', () => {
    expect(brand.canvasHex).toBe('#DADEDA');
    expect(brand.canvas).toContain('oklch');
  });

  it('viz palette has at least 8 colors', () => {
    expect(viz.length).toBeGreaterThanOrEqual(8);
  });

  it('viz labels match viz palette length', () => {
    expect(vizLabels.length).toBe(viz.length);
  });

  it('all viz colors use oklch', () => {
    for (const color of viz) {
      expect(color).toMatch(/^oklch\(/);
    }
  });

  it('neutral tokens include text hierarchy', () => {
    expect(neutral.textPrimary).toBeDefined();
    expect(neutral.textSecondary).toBeDefined();
    expect(neutral.textMuted).toBeDefined();
  });
});
