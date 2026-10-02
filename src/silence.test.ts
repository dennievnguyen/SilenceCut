import { describe, expect, it } from 'vitest';
import { applyPadding, detectSilence } from './silence.js';

const RATE = 100; // 100 samples per second keeps the fixtures readable
const LOUD = 10000; // ~-10 dBFS
const QUIET = 50; // ~-56 dBFS

/** Build a signal from [level, seconds] pairs. */
function signal(...parts: [number, number][]): Int16Array {
  const out: number[] = [];
  for (const [level, seconds] of parts) {
    for (let i = 0; i < seconds * RATE; i++) out.push(i % 2 ? level : -level);
  }
  return new Int16Array(out);
}

describe('detectSilence', () => {
  it('finds a quiet run longer than the minimum duration', () => {
    const s = signal([LOUD, 1], [QUIET, 0.5], [LOUD, 1]);
    expect(detectSilence(s, RATE, -40, 0.4)).toEqual([{ start: 1, end: 1.5, duration: 0.5 }]);
  });

  it('ignores quiet runs shorter than the minimum duration', () => {
    const s = signal([LOUD, 1], [QUIET, 0.3], [LOUD, 1]);
    expect(detectSilence(s, RATE, -40, 0.4)).toEqual([]);
  });

  it('respects the threshold: -60 dB treats ~-56 dBFS as sound', () => {
    const s = signal([LOUD, 1], [QUIET, 0.5], [LOUD, 1]);
    expect(detectSilence(s, RATE, -60, 0.4)).toEqual([]);
  });

  it('reports silence at the very start and running to the end of the file', () => {
    const s = signal([0, 0.5], [LOUD, 1], [0, 0.6]);
    expect(detectSilence(s, RATE, -40, 0.4)).toEqual([
      { start: 0, end: 0.5, duration: 0.5 },
      { start: 1.5, end: 2.1, duration: expect.closeTo(0.6) },
    ]);
  });
});

describe('applyPadding', () => {
  it('shrinks interior intervals on both sides', () => {
    const [r] = applyPadding([{ start: 1, end: 2, duration: 1 }], 120, 10);
    expect(r.start).toBeCloseTo(1.12);
    expect(r.end).toBeCloseTo(1.88);
    expect(r.duration).toBeCloseTo(0.76);
  });

  it('does not pad edges that touch the start or end of the file', () => {
    expect(
      applyPadding(
        [
          { start: 0, end: 1, duration: 1 },
          { start: 9, end: 10, duration: 1 },
        ],
        120,
        10
      ).map((i) => [i.start, +i.end.toFixed(2)])
    ).toEqual([
      [0, 0.88],
      [9.12, 10],
    ]);
  });

  it('drops intervals that padding consumes entirely', () => {
    expect(applyPadding([{ start: 1, end: 1.2, duration: 0.2 }], 120, 10)).toEqual([]);
  });
});
