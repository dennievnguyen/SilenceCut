import type { SupportedFormat } from './types.js';

/**
 * Supported formats from SPECS.md Section 2
 */

export const SUPPORTED_FORMATS: SupportedFormat[] = [
  // Video formats - High Priority
  {
    container: 'mp4',
    extensions: ['.mp4', '.m4v'],
    videoCodecs: ['h264', 'hevc', 'h265'],
    audioCodecs: ['aac', 'mp3'],
    priority: 'high',
    notes: 'Primary target; broadest device support',
  },
  {
    container: 'mov',
    extensions: ['.mov'],
    videoCodecs: ['h264', 'hevc', 'h265', 'prores'],
    audioCodecs: ['aac', 'pcm'],
    priority: 'high',
    notes: 'ProRes support depends on FFmpeg build',
  },
  {
    container: 'mkv',
    extensions: ['.mkv'],
    videoCodecs: ['h264', 'hevc', 'h265', 'vp9'],
    audioCodecs: ['aac', 'mp3', 'opus', 'vorbis'],
    priority: 'medium',
    notes: 'Common for screen recordings',
  },
  {
    container: 'webm',
    extensions: ['.webm'],
    videoCodecs: ['vp8', 'vp9', 'av1'],
    audioCodecs: ['opus', 'vorbis'],
    priority: 'medium',
    notes: 'Browser-native playback',
  },

  // Video formats - Lower Priority
  {
    container: 'avi',
    extensions: ['.avi'],
    videoCodecs: ['mjpeg', 'h264'],
    audioCodecs: ['mp3', 'pcm'],
    priority: 'low',
    notes: 'Legacy format; may re-mux to MP4',
  },
  {
    container: 'ts',
    extensions: ['.ts', '.m2ts'],
    videoCodecs: ['h264', 'hevc', 'h265'],
    audioCodecs: ['aac', 'mp3'],
    priority: 'low',
    notes: 'Common from cameras/drones',
  },
  {
    container: 'flv',
    extensions: ['.flv'],
    videoCodecs: ['h264'],
    audioCodecs: ['aac', 'mp3'],
    priority: 'low',
    notes: 'Legacy streaming format',
  },

  // Audio-only formats
  {
    container: 'wav',
    extensions: ['.wav'],
    audioCodecs: ['pcm'],
    priority: 'high',
    notes: 'Lossless; large files',
  },
  {
    container: 'mp3',
    extensions: ['.mp3'],
    audioCodecs: ['mp3'],
    priority: 'high',
    notes: 'Universal compatibility',
  },
  {
    container: 'm4a',
    extensions: ['.m4a', '.aac'],
    audioCodecs: ['aac'],
    priority: 'high',
    notes: 'Common Apple ecosystem default',
  },
  {
    container: 'flac',
    extensions: ['.flac'],
    audioCodecs: ['flac'],
    priority: 'medium',
    notes: 'Lossless; podcast/music production',
  },
  {
    container: 'ogg',
    extensions: ['.ogg', '.oga'],
    audioCodecs: ['vorbis', 'opus'],
    priority: 'medium',
    notes: 'Open format',
  },
];

/**
 * Get all supported file extensions for file picker
 */
export const SUPPORTED_EXTENSIONS = SUPPORTED_FORMATS.flatMap(
  (format) => format.extensions
);

/**
 * Get supported format by file extension
 */
export function getFormatByExtension(filename: string): SupportedFormat | null {
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!ext) return null;

  return (
    SUPPORTED_FORMATS.find((format) => format.extensions.includes(ext)) || null
  );
}

/**
 * Get supported format by container name
 */
export function getFormatByContainer(container: string): SupportedFormat | null {
  return (
    SUPPORTED_FORMATS.find(
      (format) => format.container.toLowerCase() === container.toLowerCase()
    ) || null
  );
}

/**
 * Normalize a codec name for comparison/display. FFmpeg reports PCM
 * variants as e.g. "pcm_s16le", "pcm_s24le", "pcm_f32le" — collapse all
 * of those to a single "pcm" so they match our support matrix, which
 * doesn't track individual sample formats.
 */
export function normalizeCodecName(codec: string): string {
  const normalized = codec.toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalized.startsWith('pcm') ? 'pcm' : normalized;
}

/**
 * Check if codec is supported for a container
 */
export function isCodecSupported(
  container: string,
  codec: string,
  type: 'video' | 'audio'
): boolean {
  const format = getFormatByContainer(container);
  if (!format) return false;

  const codecs = type === 'video' ? format.videoCodecs : format.audioCodecs;
  if (!codecs) return false;

  const normalizedCodec = normalizeCodecName(codec);
  return codecs.some((supported) => normalizeCodecName(supported) === normalizedCodec);
}

/**
 * Default processing settings from SPECS.md Section 4
 */
export const DEFAULT_SETTINGS = {
  silenceThreshold: -40,      // dB
  minSilenceDuration: 0.4,    // seconds
  padding: 120,               // milliseconds
  speedUp: false,
  speedUpFactor: 1,
};

/**
 * Settings ranges from SPECS.md Section 4
 */
export const SETTINGS_RANGES = {
  silenceThreshold: { min: -60, max: -20, step: 1 },
  minSilenceDuration: { min: 0.1, max: 3.0, step: 0.1 },
  padding: { min: 0, max: 500, step: 10 },
  speedUpFactor: { min: 1, max: 8, step: 0.5 },
};

/**
 * File size limits from SPECS.md Section 5.3
 */
export const FILE_LIMITS = {
  warningSize: 500 * 1024 * 1024,      // 500MB
  warningDuration: 30 * 60,             // 30 minutes
  maxRecommendedSize: 2 * 1024 * 1024 * 1024,  // 2GB
  maxRecommendedDuration: 120 * 60,     // 2 hours
};
