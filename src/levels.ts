import { SETTINGS_RANGES } from './constants.js';

/**
 * Loudness measurement for the settings help drawer.
 *
 * Works on the same cached mono PCM as detectSilence(), and measures the
 * same thing it compares against the threshold: the absolute sample peak.
 * The file is split into short windows; the quiet end of the window peaks
 * is the background noise floor and the loud end is speech.
 */

export interface AudioLevels {
  noiseFloorDb: number;
  speechDb: number;
  /** A threshold just above the noise floor, or null when noise and speech overlap. */
  suggestedThresholdDb: number | null;
}

const WINDOW_SECONDS = 0.05;
const FLOOR_DB = -90; // digital silence would otherwise be -Infinity
const NOISE_PERCENTILE = 0.1;
const SPEECH_PERCENTILE = 0.9;
const NOISE_MARGIN_DB = 6; // headroom so noise flickers don't break up a silence
const MIN_SEPARATION_DB = 10; // the suggestion must stay this far below speech

function toDb(peak: number): number {
  return peak > 0 ? Math.max(FLOOR_DB, 20 * Math.log10(peak / 32768)) : FLOOR_DB;
}

export function measureLevels(samples: Int16Array, sampleRate: number): AudioLevels | null {
  const windowSize = Math.max(1, Math.round(WINDOW_SECONDS * sampleRate));
  const windowCount = Math.floor(samples.length / windowSize);
  if (windowCount === 0) return null;

  const peaks = new Float64Array(windowCount);
  for (let w = 0; w < windowCount; w++) {
    let peak = 0;
    const end = (w + 1) * windowSize;
    for (let i = w * windowSize; i < end; i++) {
      const v = samples[i] < 0 ? -samples[i] : samples[i];
      if (v > peak) peak = v;
    }
    peaks[w] = toDb(peak);
  }
  peaks.sort();

  const at = (p: number) => peaks[Math.min(windowCount - 1, Math.floor(p * windowCount))];
  const noiseFloorDb = Math.round(at(NOISE_PERCENTILE));
  const speechDb = Math.round(at(SPEECH_PERCENTILE));

  const { min, max } = SETTINGS_RANGES.silenceThreshold;
  const suggested = noiseFloorDb + NOISE_MARGIN_DB;
  const suggestedThresholdDb =
    suggested <= speechDb - MIN_SEPARATION_DB && suggested <= max ? Math.max(min, suggested) : null;

  return { noiseFloorDb, speechDb, suggestedThresholdDb };
}
