import type { SilenceInterval } from './types.js';

/**
 * Silence detection over the cached mono PCM from decodeAnalysisAudio().
 *
 * Mirrors ffmpeg's silencedetect: a run of consecutive samples whose
 * absolute level stays below the threshold counts as silence once it lasts
 * at least `minDurationSeconds`. Running it here instead of in ffmpeg lets
 * the settings sliders re-detect instantly without decoding the file again
 * (SPECS.md §5.3).
 */
export function detectSilence(
  samples: Int16Array,
  sampleRate: number,
  thresholdDb: number,
  minDurationSeconds: number
): SilenceInterval[] {
  const threshold = Math.pow(10, thresholdDb / 20) * 32768;
  const minSamples = Math.max(1, Math.round(minDurationSeconds * sampleRate));
  const intervals: SilenceInterval[] = [];
  let runStart = -1;

  const closeRun = (endIndex: number) => {
    if (runStart >= 0 && endIndex - runStart >= minSamples) {
      const start = runStart / sampleRate;
      const end = endIndex / sampleRate;
      intervals.push({ start, end, duration: end - start });
    }
    runStart = -1;
  };

  for (let i = 0; i < samples.length; i++) {
    const level = samples[i] < 0 ? -samples[i] : samples[i];
    if (level < threshold) {
      if (runStart < 0) runStart = i;
    } else if (runStart >= 0) {
      closeRun(i);
    }
  }
  // Silence that runs to the end of the file
  closeRun(samples.length);

  return intervals;
}

/**
 * Shrink each silence interval inward by `paddingMs` on each side so cuts
 * don't clip adjacent speech (SPECS.md §5.2 step 4). Edges touching the
 * start or end of the file aren't padded since there's no speech there to
 * protect. Intervals that shrink to nothing are dropped.
 */
export function applyPadding(
  intervals: SilenceInterval[],
  paddingMs: number,
  totalDuration: number
): SilenceInterval[] {
  const pad = paddingMs / 1000;
  const padded: SilenceInterval[] = [];

  for (const interval of intervals) {
    const start = interval.start <= 0 ? interval.start : interval.start + pad;
    const end = interval.end >= totalDuration ? interval.end : interval.end - pad;
    if (end > start) {
      padded.push({ start, end, duration: end - start });
    }
  }

  return padded;
}
