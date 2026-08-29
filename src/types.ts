/**
 * Type definitions for Silence Cutter
 */

export interface FileMetadata {
  // File info
  name: string;
  size: number;
  type: string;

  // Container/Format info
  container: string;      // e.g., "mp4", "mov", "mkv"

  // Video info (if present)
  hasVideo: boolean;
  videoCodec?: string;    // e.g., "h264", "hevc", "vp9"
  width?: number;
  height?: number;
  frameRate?: number;
  videoBitrate?: number;

  // Audio info
  hasAudio: boolean;
  audioCodec?: string;    // e.g., "aac", "mp3", "opus"
  sampleRate?: number;
  channels?: number;
  audioBitrate?: number;

  // Timing
  duration: number;       // in seconds
  durationFormatted: string;  // e.g., "12:40"

  // Processing info
  isSupported: boolean;
  supportMessage?: string;
}

export interface ProcessingSettings {
  // Silence detection settings
  silenceThreshold: number;      // in dB, -60 to -20
  minSilenceDuration: number;    // in seconds, 0.1 to 3.0
  padding: number;               // in milliseconds, 0 to 500

  // Optional: speed up instead of remove
  speedUp: boolean;
  speedUpFactor: number;         // 1x to 8x
}

export interface SilenceInterval {
  start: number;     // in seconds
  end: number;       // in seconds
  duration: number;  // in seconds
}

export interface ProcessingResult {
  originalDuration: number;
  newDuration: number;
  percentRemoved: number;
  silenceIntervalsFound: number;
  outputBlob: Blob;
  outputFilename: string;
}

export type AppState =
  | 'idle'                    // No file loaded
  | 'loading-file'            // Loading file metadata
  | 'ready'                   // File loaded, ready to detect
  | 'detecting-silence'       // Running silence detection
  | 'editing'                 // Adjusting settings, viewing waveform
  | 'processing'              // Removing silence
  | 'complete'                // Processing done
  | 'error';                  // Error state

export interface SupportedFormat {
  container: string;
  extensions: string[];
  videoCodecs?: string[];
  audioCodecs?: string[];
  priority: 'high' | 'medium' | 'low';
  notes?: string;
}
