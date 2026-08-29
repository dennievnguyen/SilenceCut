/**
 * Utility functions for Silence Cutter
 */

import { normalizeCodecName } from './constants.js';

/**
 * Format seconds as MM:SS or HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format bytes as human-readable size
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Format resolution as "1920x1080" or "1080p"
 */
export function formatResolution(width?: number, height?: number): string {
  if (!width || !height) return 'Unknown';

  // Common resolutions with shortcuts
  const shortcuts: Record<string, string> = {
    '3840x2160': '4K (2160p)',
    '2560x1440': '1440p',
    '1920x1080': '1080p',
    '1280x720': '720p',
    '854x480': '480p',
    '640x360': '360p',
  };

  const key = `${width}x${height}`;
  return shortcuts[key] || key;
}

/**
 * Format bitrate as kbps or Mbps
 */
export function formatBitrate(bps?: number): string {
  if (!bps) return 'Unknown';

  if (bps >= 1000000) {
    return `${(bps / 1000000).toFixed(1)} Mbps`;
  }
  return `${(bps / 1000).toFixed(0)} kbps`;
}

/**
 * Format sample rate as kHz
 */
export function formatSampleRate(hz?: number): string {
  if (!hz) return 'Unknown';
  return `${(hz / 1000).toFixed(1)} kHz`;
}

/**
 * Format codec name for display
 */
export function formatCodecName(codec?: string): string {
  if (!codec) return 'Unknown';

  const codecs: Record<string, string> = {
    h264: 'H.264',
    hevc: 'H.265/HEVC',
    h265: 'H.265/HEVC',
    vp8: 'VP8',
    vp9: 'VP9',
    av1: 'AV1',
    prores: 'ProRes',
    mjpeg: 'MJPEG',
    aac: 'AAC',
    mp3: 'MP3',
    opus: 'Opus',
    vorbis: 'Vorbis',
    flac: 'FLAC',
    pcm: 'PCM',
  };

  const normalized = normalizeCodecName(codec);
  return codecs[normalized] || codec.toUpperCase();
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const match = filename.toLowerCase().match(/\.[^.]+$/);
  return match ? match[0] : '';
}

/**
 * Check if file is video (has video stream)
 */
export function isVideoFile(filename: string): boolean {
  const videoExtensions = ['.mp4', '.mov', '.mkv', '.webm', '.avi', '.ts', '.m2ts', '.flv', '.m4v'];
  const ext = getFileExtension(filename);
  return videoExtensions.includes(ext);
}

/**
 * Check if file is audio-only
 */
export function isAudioFile(filename: string): boolean {
  const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.oga'];
  const ext = getFileExtension(filename);
  return audioExtensions.includes(ext);
}

/**
 * Generate output filename
 */
export function generateOutputFilename(inputFilename: string): string {
  const ext = getFileExtension(inputFilename);
  const nameWithoutExt = inputFilename.slice(0, -ext.length);
  return `${nameWithoutExt}_silenceCut${ext}`;
}

/**
 * Validate file size and duration against limits
 */
export function validateFileLimits(
  size: number,
  duration?: number
): { valid: boolean; warning?: string; error?: string } {
  const { warningSize, warningDuration, maxRecommendedSize, maxRecommendedDuration } = {
    warningSize: 500 * 1024 * 1024,
    warningDuration: 30 * 60,
    maxRecommendedSize: 2 * 1024 * 1024 * 1024,
    maxRecommendedDuration: 120 * 60,
  };

  // Hard limits (errors)
  if (size > maxRecommendedSize) {
    return {
      valid: false,
      error: `File is too large (${formatFileSize(size)}). Maximum recommended size is ${formatFileSize(maxRecommendedSize)}. Processing may fail or be very slow.`,
    };
  }

  if (duration && duration > maxRecommendedDuration) {
    return {
      valid: false,
      error: `File is too long (${formatDuration(duration)}). Maximum recommended duration is ${formatDuration(maxRecommendedDuration)}. Processing may fail or be very slow.`,
    };
  }

  // Soft limits (warnings)
  if (size > warningSize || (duration && duration > warningDuration)) {
    const sizeWarning = size > warningSize ? `${formatFileSize(size)} file size` : '';
    const durationWarning = duration && duration > warningDuration ? `${formatDuration(duration)} duration` : '';
    const combined = [sizeWarning, durationWarning].filter(Boolean).join(', ');

    return {
      valid: true,
      warning: `Large file detected (${combined}). In-browser processing may be slow. Consider trimming the file first.`,
    };
  }

  return { valid: true };
}
