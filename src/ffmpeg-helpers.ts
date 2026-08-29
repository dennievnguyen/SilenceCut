import type { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import type { FileMetadata, SilenceInterval } from './types';
import { formatDuration, getFileExtension } from './utils.js';
import { getFormatByExtension, isCodecSupported } from './constants.js';

/**
 * Write a file into FFmpeg's virtual filesystem once, so callers can run
 * multiple passes (metadata probe, silencedetect, ...) against it without
 * re-reading and re-copying the whole file for each pass.
 */
export async function writeInputFile(ffmpeg: FFmpeg, file: File): Promise<string> {
  const ext = getFileExtension(file.name);
  const inputName = `input${ext}`;
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

/**
 * Parse detailed metadata from FFmpeg logs
 */
function parseDetailedMetadata(
  logs: string,
  file: File,
  format: ReturnType<typeof getFormatByExtension>
): FileMetadata {
  // Extract duration
  const durationMatch = logs.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
  let duration = 0;
  if (durationMatch) {
    const hours = parseInt(durationMatch[1]);
    const minutes = parseInt(durationMatch[2]);
    const seconds = parseFloat(durationMatch[3]);
    duration = hours * 3600 + minutes * 60 + seconds;
  }

  // Extract video stream info
  const videoMatch = logs.match(
    /Stream #\d+:\d+.*?: Video: (\w+)[^\n]*?(\d{3,5})x(\d{3,5})[^\n]*?(\d+(?:\.\d+)?) fps/
  );
  let hasVideo = false;
  let videoCodec: string | undefined;
  let width: number | undefined;
  let height: number | undefined;
  let frameRate: number | undefined;

  if (videoMatch) {
    hasVideo = true;
    videoCodec = videoMatch[1];
    width = parseInt(videoMatch[2]);
    height = parseInt(videoMatch[3]);
    frameRate = parseFloat(videoMatch[4]);
  }

  // Extract audio stream info
  const audioMatch = logs.match(
    /Stream #\d+:\d+.*?: Audio: (\w+)[^\n]*?(\d+) Hz[^\n]*?(\w+)[^\n]*?(\d+) kb\/s/
  );
  let hasAudio = false;
  let audioCodec: string | undefined;
  let sampleRate: number | undefined;
  let channels: number | undefined;
  let audioBitrate: number | undefined;

  if (audioMatch) {
    hasAudio = true;
    audioCodec = audioMatch[1];
    sampleRate = parseInt(audioMatch[2]);
    const channelType = audioMatch[3];
    channels = channelType === 'mono' ? 1 : channelType === 'stereo' ? 2 : undefined;
    audioBitrate = parseInt(audioMatch[4]) * 1000;
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

/**
 * Run ffmpeg's silencedetect audio filter and parse the resulting
 * silence intervals from its log output.
 */
export async function detectSilence(
  ffmpeg: FFmpeg,
  inputName: string,
  thresholdDb: number,
  minDurationSeconds: number
): Promise<SilenceInterval[]> {
  let output = '';
  const logHandler = ({ message }: { message: string }) => {
    output += message + '\n';
  };
  ffmpeg.on('log', logHandler);

  try {
    await ffmpeg.exec([
      '-i',
      inputName,
      '-vn',
      '-af',
      `silencedetect=noise=${thresholdDb}dB:d=${minDurationSeconds}`,
      '-f',
      'null',
      '-',
    ]);
  } catch (error) {
    // ffmpeg exits non-zero when writing to the null muxer; the info we
    // need is in the captured logs regardless.
  }

  ffmpeg.off('log', logHandler);

  return parseSilenceIntervals(output);
}

/**
 * Parse silencedetect log lines into [start, end] intervals.
 *
 * Example lines:
 *   [silencedetect @ 0x...] silence_start: 4.2
 *   [silencedetect @ 0x...] silence_end: 6.7 | silence_duration: 2.5
 */
function parseSilenceIntervals(logs: string): SilenceInterval[] {
  const intervals: SilenceInterval[] = [];
  let pendingStart: number | null = null;

  for (const line of logs.split('\n')) {
    const startMatch = line.match(/silence_start:\s*(-?[\d.]+)/);
    if (startMatch) {
      pendingStart = parseFloat(startMatch[1]);
      continue;
    }

    const endMatch = line.match(
      /silence_end:\s*(-?[\d.]+)\s*\|\s*silence_duration:\s*(-?[\d.]+)/
    );
    if (endMatch && pendingStart !== null) {
      intervals.push({
        start: pendingStart,
        end: parseFloat(endMatch[1]),
        duration: parseFloat(endMatch[2]),
      });
      pendingStart = null;
    }
  }

  return intervals;
}
