/**
 * Waveform peak generation for visualization.
 *
 * Works from the downsampled mono PCM that analyzeAudio() already produces
 * during the silencedetect pass, so the waveform costs no extra decode and
 * covers every container ffmpeg can read (the previous Web Audio
 * decodeAudioData approach failed on MKV and decoded the whole file to
 * full-rate floats, which exhausted memory on long recordings).
 */

export interface WaveformPeaks {
  peaks: Float32Array; // [min0, max0, min1, max1, ...]
  duration: number;
}

export function computeWaveformPeaks(
  samples: Int16Array,
  sampleRate: number,
  count = 800
): WaveformPeaks {
  const blockSize = Math.max(1, Math.floor(samples.length / count));
  const peaks = new Float32Array(count * 2);

  for (let i = 0; i < count; i++) {
    let min = 0;
    let max = 0;
    const start = i * blockSize;
    const end = Math.min(start + blockSize, samples.length);
    for (let j = start; j < end; j++) {
      const v = samples[j];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    peaks[i * 2] = min / 32768;
    peaks[i * 2 + 1] = max / 32768;
  }

  return { peaks, duration: samples.length / sampleRate };
}
