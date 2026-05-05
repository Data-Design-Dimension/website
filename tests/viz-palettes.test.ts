import { describe, it, expect } from 'vitest';
import {
  viz,
  vizPriorityOrder,
  vizCardSafe,
  vizSeq,
  vizSeqMulti,
  vizDiv,
  vizCyc,
} from '../src/lib/tokens';

/**
 * Parse an OKLCH string ("oklch(L C H)" or "oklch(L C H / A)") into numbers.
 * Throws on malformed input so a typo in tokens.ts fails the suite loudly.
 */
function parseOklch(value: string): { L: number; C: number; H: number } {
  const match = value.match(
    /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+)?\s*\)$/,
  );
  if (!match) throw new Error(`Not an OKLCH string: ${value}`);
  return {
    L: parseFloat(match[1]),
    C: parseFloat(match[2]),
    H: parseFloat(match[3]),
  };
}

const MIN_L_GAP = 0.07; // 7 OKLCH L units = perceptually distinguishable in grayscale
const MIN_CATEGORICAL_GAP = 0.07;

describe('Categorical (Okabe-Ito-derived, L-anchored)', () => {
  it('has 8 stops with strictly monotonic ascending L', () => {
    const ls = viz.map((c) => parseOklch(c).L);
    expect(ls).toHaveLength(8);
    for (let i = 1; i < ls.length; i++) {
      expect(ls[i]).toBeGreaterThan(ls[i - 1]);
    }
  });

  it('keeps adjacent L gaps wide enough to distinguish in grayscale', () => {
    const ls = viz.map((c) => parseOklch(c).L);
    for (let i = 1; i < ls.length; i++) {
      const gap = ls[i] - ls[i - 1];
      expect(gap).toBeGreaterThanOrEqual(MIN_CATEGORICAL_GAP);
    }
  });

  it('priority order references valid indices and covers the full palette', () => {
    expect(vizPriorityOrder).toHaveLength(viz.length);
    const sorted = [...vizPriorityOrder].sort((a, b) => a - b);
    expect(sorted).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
});

describe('Card-safe categorical palette', () => {
  it('has 7 stops with strictly monotonic ascending L', () => {
    const ls = vizCardSafe.map((c) => parseOklch(c).L);
    expect(ls).toHaveLength(7);
    for (let i = 1; i < ls.length; i++) {
      expect(ls[i]).toBeGreaterThan(ls[i - 1]);
    }
  });

  it('keeps adjacent L gaps wide enough for grayscale distinction', () => {
    const ls = vizCardSafe.map((c) => parseOklch(c).L);
    for (let i = 1; i < ls.length; i++) {
      expect(ls[i] - ls[i - 1]).toBeGreaterThanOrEqual(MIN_CATEGORICAL_GAP);
    }
  });

  it('avoids brand-category hue bands (no H in 50–100 amber, no H in 110–180 green)', () => {
    for (const stop of vizCardSafe) {
      const { C, H } = parseOklch(stop);
      // Near-zero chroma stops are hue-agnostic and always permitted.
      if (C < 0.02) continue;
      const inAmberZone = H >= 50 && H <= 100;
      const inGreenZone = H >= 110 && H <= 180;
      expect(inAmberZone).toBe(false);
      expect(inGreenZone).toBe(false);
    }
  });
});

describe('Sequential single-hue ramps', () => {
  const families = Object.entries(vizSeq) as [keyof typeof vizSeq, readonly string[]][];

  it.each(families)('%s: 7 stops with strictly monotonic descending L', (_, ramp) => {
    const ls = ramp.map((c) => parseOklch(c).L);
    expect(ls).toHaveLength(7);
    for (let i = 1; i < ls.length; i++) {
      expect(ls[i]).toBeLessThan(ls[i - 1]);
    }
  });

  it.each(families)('%s: adjacent L gaps ≥ MIN_L_GAP (CVD safety via lightness)', (_, ramp) => {
    const ls = ramp.map((c) => parseOklch(c).L);
    for (let i = 1; i < ls.length; i++) {
      const gap = ls[i - 1] - ls[i];
      expect(gap).toBeGreaterThanOrEqual(MIN_L_GAP);
    }
  });

  it('gray ramp has near-zero chroma (true neutral)', () => {
    for (const stop of vizSeq.gray) {
      expect(parseOklch(stop).C).toBeLessThanOrEqual(0.01);
    }
  });
});

describe('Sequential multi-hue ramps', () => {
  const families = Object.entries(vizSeqMulti) as [keyof typeof vizSeqMulti, readonly string[]][];

  it.each(families)(
    '%s: 7 stops with strictly monotonic L (CVD safety condition: hue carries no load-bearing signal)',
    (_, ramp) => {
      const ls = ramp.map((c) => parseOklch(c).L);
      expect(ls).toHaveLength(7);
      const ascending = ls.every((l, i) => i === 0 || l > ls[i - 1]);
      const descending = ls.every((l, i) => i === 0 || l < ls[i - 1]);
      expect(ascending || descending).toBe(true);
    },
  );

  it.each(families)('%s: adjacent L gaps ≥ MIN_L_GAP', (_, ramp) => {
    const ls = ramp.map((c) => parseOklch(c).L);
    for (let i = 1; i < ls.length; i++) {
      expect(Math.abs(ls[i] - ls[i - 1])).toBeGreaterThanOrEqual(MIN_L_GAP);
    }
  });
});

describe('Diverging ramps', () => {
  const families = Object.entries(vizDiv) as [keyof typeof vizDiv, readonly string[]][];

  it.each(families)('%s: 7 stops with neutral light midpoint at index 3', (_, ramp) => {
    expect(ramp).toHaveLength(7);
    const midL = parseOklch(ramp[3]).L;
    expect(midL).toBeGreaterThanOrEqual(0.90);
  });

  it.each(families)('%s: ends are darker than midpoint (diverging by L is honest)', (_, ramp) => {
    const ls = ramp.map((c) => parseOklch(c).L);
    expect(ls[0]).toBeLessThan(ls[3]);
    expect(ls[6]).toBeLessThan(ls[3]);
  });

  it.each(families)('%s: end L values are within 0.05 of each other (symmetric magnitude)', (_, ramp) => {
    const ls = ramp.map((c) => parseOklch(c).L);
    expect(Math.abs(ls[0] - ls[6])).toBeLessThanOrEqual(0.05);
  });
});

describe('Cyclical ramp', () => {
  it('has 12 stops', () => {
    expect(vizCyc).toHaveLength(12);
  });

  it('uses constant L (no implied ordering — only hue position carries signal)', () => {
    const ls = vizCyc.map((c) => parseOklch(c).L);
    const min = Math.min(...ls);
    const max = Math.max(...ls);
    expect(max - min).toBeLessThanOrEqual(0.01);
  });

  it('uses constant C (perceptually uniform around the wheel)', () => {
    const cs = vizCyc.map((c) => parseOklch(c).C);
    const min = Math.min(...cs);
    const max = Math.max(...cs);
    expect(max - min).toBeLessThanOrEqual(0.01);
  });

  it('rotates hue 30° per stop', () => {
    const hs = vizCyc.map((c) => parseOklch(c).H);
    for (let i = 0; i < hs.length; i++) {
      expect(hs[i]).toBe(i * 30);
    }
  });
});
