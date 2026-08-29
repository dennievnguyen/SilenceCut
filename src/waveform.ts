/**
 * Waveform peak generation for visualization.
 *
 * Uses the browser's native Web Audio API to decode the file directly
 * (separate from the ffmpeg silencedetect pass) since it's faster and
 * doesn't touch the ffmpeg virtual filesystem. Not all containers can be
 * decoded this way (e.g. MKV often isn't supported by decodeAudioData in
 * Chrome) — callers should treat failures as "no waveform preview" rather
 * than a fatal error, since silence detection itself runs through ffmpeg
 * and doesn't depend on this.
 */

export interface WaveformPeaks {
  peaks: Float32Array; // [min0, max0, min1, max1, ...]
  duration: number;
}

export async function generateWaveformPeaks(
  file: File,
  samples = 800
): Promise<WaveformPeaks> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioContextCtor =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioContextCtor();

  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.max(1, Math.floor(channelData.length / samples));
    const peaks = new Float32Array(samples * 2);

    for (let i = 0; i < samples; i++) {
      let min = 0;
      let max = 0;
      const start = i * blockSize;
      const end = Math.min(start + blockSize, channelData.length);
      for (let j = start; j < end; j++) {
        const v = channelData[j];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      peaks[i * 2] = min;
      peaks[i * 2 + 1] = max;
    }

    return { peaks, duration: audioBuffer.duration };
  } finally {
    await audioCtx.close();
  }
}
