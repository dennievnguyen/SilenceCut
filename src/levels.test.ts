import { describe, expect, it } from 'vitest';
import { measureLevels } from './levels.js';

const RATE = 100; // 100 samples per second, so one 50 ms window = 5 samples
const SPEECH = 10000; // ~-10 dBFS
const NOISE = 330; // ~-40 dBFS

/** Build a signal from [level, seconds] pairs. */
function signal(...parts: [number, number][]): Int16Array {
  const out: number[] = [];
  for (const [level, seconds] of parts) {
    for (let i = 0; i < seconds * RATE; i++) out.push(i % 2 ? level : -level);
  }
  return new Int16Array(out);
}

describe('measureLevels', () => {
  it('reports the noise floor, speech level, and a threshold just above the noise', () => {
    const levels = measureLevels(signal([NOISE, 3], [SPEECH, 3], [NOISE, 1], [SPEECH, 3]), RATE);
    expect(levels).toEqual({ noiseFloorDb: -40, speechDb: -10, suggestedThresholdDb: -34 });
  });

  it('clamps the suggestion to the slider range', () => {
    const levels = measureLevels(signal([0, 3], [SPEECH, 7]), RATE);
    expect(levels?.noiseFloorDb).toBe(-90);
    expect(levels?.suggestedThresholdDb).toBe(-60);
  });

  it('gives no suggestion when noise is as loud as speech', () => {
    const levels = measureLevels(signal([SPEECH, 10]), RATE);
    expect(levels?.suggestedThresholdDb).toBeNull();
  });

  it('returns null for audio shorter than one window', () => {
    expect(measureLevels(signal([SPEECH, 0.02]), RATE)).toBeNull();
  });
});
