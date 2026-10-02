import type { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import type { FileMetadata } from './types';
import { formatDuration, getFileExtension } from './utils.js';
import { getFormatByExtension, isCodecSupported } from './constants.js';

let inputCounter = 0;

/**
 * Write a file into FFmpeg's virtual filesystem once, so callers can run
 * multiple passes (metadata probe, silencedetect, ...) against it without
 * re-reading and re-copying the whole file for each pass.
 */
export async function writeInputFile(ffmpeg: FFmpeg, file: File): Promise<string> {
  const ext = getFileExtension(file.name);
  // Unique per call, so a cancelled job's cleanup can never delete the
  // input of the job that replaced it.
  const inputName = `input-${++inputCounter}${ext}`;
  await ffmpeg.writeFile(inputName, await fetchFile(file));
  return inputName;
}

export async function deleteInputFile(ffmpeg: FFmpeg, inputName: string): Promise<void> {
  try {
    await ffmpeg.deleteFile(inputName);
  } catch (e) {
    // Ignore cleanup errors
  }
}

/**
 * Better metadata extraction using a more direct approach
 * This version will be implemented after we verify basic functionality
 */
export async function extractMetadataDetailed(
  ffmpeg: FFmpeg,
  file: File,
  inputName: string
): Promise<FileMetadata> {
  const format = getFormatByExtension(file.name);

  let ffmpegOutput = '';

  // Capture logs
  const logHandler = ({ message }: { message: string }) => {
    ffmpegOutput += message + '\n';
  };

  ffmpeg.on('log', logHandler);

  try {
    // Run FFmpeg with just -i to get file info
    await ffmpeg.exec(['-i', inputName]);
  } catch (error) {
    // FFmpeg returns error code when no output is specified, but we got the info
  }

  ffmpeg.off('log', logHandler);

  // Parse the output
  return parseDetailedMetadata(ffmpegOutput, file, format);
}

const CHANNEL_LAYOUTS: Record<string, number> = {
  mono: 1,
  stereo: 2,
  '2.1': 3,
  quad: 4,
  '4.0': 4,
  '5.0': 5,
  '5.1': 6,
  '6.1': 7,
  '7.1': 8,
};

/**
 * Parse detailed metadata from FFmpeg logs.
 *
 * Works line by line on the `Stream #...: Video:` / `Audio:` lines and
 * treats every field except the codec as optional — ffmpeg omits bitrate
 * for FLAC/Opus and fps for variable-frame-rate video, and none of those
 * should change whether a stream is detected.
 */
export function parseDetailedMetadata(
  logs: string,
  file: File,
  format: ReturnType<typeof getFormatByExtension>
): FileMetadata {
  // Extract duration (reported as "N/A" for some streamed recordings)
  const durationMatch = logs.match(/Duration: (\d+):(\d{2}):(\d{2}(?:\.\d+)?)/);
  let duration = 0;
  if (durationMatch) {
    const hours = parseInt(durationMatch[1]);
    const minutes = parseInt(durationMatch[2]);
    const seconds = parseFloat(durationMatch[3]);
    duration = hours * 3600 + minutes * 60 + seconds;
  }

  let hasVideo = false;
  let videoCodec: string | undefined;
  let width: number | undefined;
  let height: number | undefined;
  let frameRate: number | undefined;

  let hasAudio = false;
  let audioCodec: string | undefined;
  let sampleRate: number | undefined;
  let channels: number | undefined;
  let audioBitrate: number | undefined;

  for (const line of logs.split('\n')) {
    const stream = line.match(/Stream #\d+:\d+.*?: (Video|Audio): (\w+)(.*)$/);
    if (!stream) continue;
    const [, kind, codec, rest] = stream;

    // Album art in MP3/M4A shows up as an mjpeg/png "video" stream; it isn't
    // real video and shouldn't make an audio file look like a video file.
    if (kind === 'Video' && !hasVideo && !rest.includes('(attached pic)')) {
      hasVideo = true;
      videoCodec = codec;
      const res = rest.match(/\b(\d{2,5})x(\d{2,5})\b/);
      if (res) {
        width = parseInt(res[1]);
        height = parseInt(res[2]);
      }
      const fps = rest.match(/(\d+(?:\.\d+)?) fps/);
      if (fps) frameRate = parseFloat(fps[1]);
    } else if (kind === 'Audio' && !hasAudio) {
      hasAudio = true;
      audioCodec = codec;
      const hz = rest.match(/(\d+) Hz/);
      if (hz) sampleRate = parseInt(hz[1]);
      const layout = rest.match(/Hz, ([^,(]+)/)?.[1].trim();
      if (layout) {
        // Named layouts ("stereo", "5.1"), or ffmpeg's "N channels" fallback
        channels = CHANNEL_LAYOUTS[layout] ?? (parseInt(layout) || undefined);
      }
      const kbps = rest.match(/(\d+) kb\/s/);
      if (kbps) audioBitrate = parseInt(kbps[1]) * 1000;
    }
  }

  // Check if format/codec is supported
  let isSupported = !!format;
  let supportMessage: string | undefined;

  if (!format) {
    supportMessage = `File format is not supported. Supported formats: MP4, MOV, MKV, WebM, MP3, WAV, etc.`;
    isSupported = false;
  } else if (videoCodec && !isCodecSupported(format.container, videoCodec, 'video')) {
    supportMessage = `Video codec ${videoCodec.toUpperCase()} may not be fully supported in ${format.container.toUpperCase()} container.`;
    isSupported = false;
  } else if (audioCodec && !isCodecSupported(format.container, audioCodec, 'audio')) {
    supportMessage = `Audio codec ${audioCodec.toUpperCase()} may not be fully supported in ${format.container.toUpperCase()} container.`;
    isSupported = false;
  } else if (!hasAudio) {
    supportMessage = `File has no audio track. Silence detection requires audio.`;
    isSupported = false;
  }

  return {
    name: file.name,
    size: file.size,
    type: file.type,
    container: format?.container || 'unknown',
    hasVideo,
    videoCodec,
    width,
    height,
    frameRate,
    hasAudio,
    audioCodec,
    sampleRate,
    channels,
    audioBitrate,
    duration,
    durationFormatted: formatDuration(duration),
    isSupported,
    supportMessage,
  };
}

/** Sample rate of the mono PCM copy returned by decodeAnalysisAudio. */
export const ANALYSIS_SAMPLE_RATE = 8000;

/**
 * Decode the audio track once to a small downsampled mono 16-bit PCM copy
 * (~16 KB per second at 8 kHz). Silence detection (silence.ts) and the
 * waveform both run on this cached copy, so changing settings never
 * re-decodes the file, and long recordings don't have to be decoded to
 * full-rate floats in the browser.
 */
export async function decodeAnalysisAudio(
  ffmpeg: FFmpeg,
  inputName: string
): Promise<Int16Array> {
  const pcmName = `${inputName}.pcm`;

  await ffmpeg.exec([
    '-i',
    inputName,
    '-vn',
    '-ac',
    '1',
    '-ar',
    String(ANALYSIS_SAMPLE_RATE),
    '-f',
    's16le',
    '-y',
    pcmName,
  ]);

  const data = (await ffmpeg.readFile(pcmName)) as Uint8Array;
  await deleteInputFile(ffmpeg, pcmName);
  return new Int16Array(
    data.buffer.slice(data.byteOffset, data.byteOffset + (data.byteLength & ~1))
  );
}
