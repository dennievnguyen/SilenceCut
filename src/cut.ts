import type { KeepSegment } from './types.js';

/**
 * Build the ffmpeg -filter_complex graph that stitches the keep segments
 * together (SPECS.md §5.2 step 6). Each segment gets its own trim/atrim with
 * timestamps reset, then everything goes through one concat. Re-encoding
 * through filters is frame-accurate, unlike stream copy, which can only cut
 * on keyframes (see DECISIONS.md, Decision 18).
 *
 * Output pads are [outv] (video only) and [outa] (audio only).
 */
export function buildCutFilterGraph(
  segments: KeepSegment[],
  streams: { video: boolean; audio: boolean }
): string {
  if (segments.length === 0) throw new Error('Nothing to keep: every segment was cut');
  if (!streams.video && !streams.audio) throw new Error('Input has no video or audio stream');

  const t = (seconds: number) => seconds.toFixed(3);
  const chains: string[] = [];
  const concatInputs: string[] = [];

  segments.forEach(({ start, end }, i) => {
    if (streams.video) {
      chains.push(`[0:v]trim=start=${t(start)}:end=${t(end)},setpts=PTS-STARTPTS[v${i}]`);
      concatInputs.push(`[v${i}]`);
    }
    if (streams.audio) {
      chains.push(`[0:a]atrim=start=${t(start)}:end=${t(end)},asetpts=PTS-STARTPTS[a${i}]`);
      concatInputs.push(`[a${i}]`);
    }
  });

  const outputs = [streams.video && '[outv]', streams.audio && '[outa]'].filter(Boolean).join('');
  const concat =
    `${concatInputs.join('')}concat=n=${segments.length}` +
    `:v=${streams.video ? 1 : 0}:a=${streams.audio ? 1 : 0}${outputs}`;

  return [...chains, concat].join(';');
}

// Encoders for each input codec, so the output keeps the input's codec
// (SPECS.md §2.3). Speed-leaning presets: everything is re-encoded in
// single-threaded wasm, so encode time dominates the export.
const VIDEO_ENCODERS: Record<string, string[]> = {
  // ultrafast: veryfast took 26 min for a 5:54 1080p file (3:28 out, 76 MB);
  // the extra file size is a fair trade for speed. See Decision 18.
  h264: ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '20', '-pix_fmt', 'yuv420p'],
  hevc: ['-c:v', 'libx265', '-preset', 'veryfast', '-crf', '24', '-tag:v', 'hvc1'],
  vp8: ['-c:v', 'libvpx', '-crf', '10', '-b:v', '2M', '-deadline', 'realtime', '-cpu-used', '8'],
  vp9: ['-c:v', 'libvpx-vp9', '-crf', '32', '-b:v', '0', '-deadline', 'realtime', '-cpu-used', '8'],
};

const AUDIO_ENCODERS: Record<string, string> = {
  aac: 'aac',
  mp3: 'libmp3lame',
  opus: 'libopus',
  vorbis: 'libvorbis',
  flac: 'flac',
};

// Lossy audio codecs get the input's bitrate (or this fallback) so the cut
// doesn't quietly drop quality.
const LOSSY_AUDIO = new Set(['aac', 'mp3', 'opus', 'vorbis']);
const DEFAULT_AUDIO_BITRATE = 192_000;

export interface EncoderChoice {
  args: string[];
  /** Codecs we couldn't keep; ffmpeg falls back to the container default. */
  fallbacks: string[];
}

/**
 * ffmpeg output args that re-encode to the same codecs as the input.
 * Codecs without a known encoder are left to ffmpeg's default for the
 * output container, and reported in `fallbacks` so the UI can say so.
 */
export function encoderArgs(input: {
  container: string;
  hasVideo: boolean;
  videoCodec?: string;
  hasAudio: boolean;
  audioCodec?: string;
  audioBitrate?: number;
}): EncoderChoice {
  const args: string[] = [];
  const fallbacks: string[] = [];

  if (input.hasVideo) {
    const codec = normalize(input.videoCodec);
    const video = VIDEO_ENCODERS[codec];
    if (video) args.push(...video);
    else fallbacks.push(`video codec ${input.videoCodec ?? 'unknown'}`);
  }

  if (input.hasAudio) {
    const codec = normalize(input.audioCodec);
    if (codec.startsWith('pcm_')) {
      args.push('-c:a', codec); // WAV/MOV PCM: the encoder shares the codec's name
    } else if (AUDIO_ENCODERS[codec]) {
      args.push('-c:a', AUDIO_ENCODERS[codec]);
      if (LOSSY_AUDIO.has(codec)) {
        args.push('-b:a', String(input.audioBitrate ?? DEFAULT_AUDIO_BITRATE));
      }
    } else {
      fallbacks.push(`audio codec ${input.audioCodec ?? 'unknown'}`);
    }
  }

  // Put the index up front so MP4/MOV start playing before fully downloaded.
  if (input.container === 'mp4' || input.container === 'mov') {
    args.push('-movflags', '+faststart');
  }

  return { args, fallbacks };
}

function normalize(codec?: string): string {
  const c = (codec ?? '').toLowerCase();
  return c === 'h265' ? 'hevc' : c;
}
