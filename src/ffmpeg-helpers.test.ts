import { describe, expect, it } from 'vitest';
import { parseDetailedMetadata } from './ffmpeg-helpers.js';
import { getFormatByExtension } from './constants.js';
import { computeWaveformPeaks } from './waveform.js';

// Stream/Duration lines captured from real `ffmpeg -i` output.
const LOGS = {
  flac: `  Duration: 00:00:04.00, start: 0.000000, bitrate: 80 kb/s
  Stream #0:0: Audio: flac, 44100 Hz, mono, s16`,
  webm: `  Duration: 00:00:04.01, start: 0.000000, bitrate: 161 kb/s
  Stream #0:0: Video: vp9 (Profile 1), gbrp(pc, gbr/unknown/unknown, progressive), 640x360, SAR 1:1 DAR 16:9, 25 fps, 25 tbr, 1k tbn
  Stream #0:1: Audio: opus, 48000 Hz, mono, fltp`,
  // MediaRecorder-style VFR WebM: no "fps", only tbr
  webmVfr: `  Duration: N/A, start: 0.000000, bitrate: N/A
  Stream #0:0(eng): Video: vp8, yuv420p(progressive), 1280x720, SAR 1:1 DAR 16:9, 1k tbr, 1k tbn (default)
  Stream #0:1(eng): Audio: opus, 48000 Hz, stereo, fltp (default)`,
  wav: `  Duration: 00:00:04.00, bitrate: 705 kb/s
  Stream #0:0: Audio: pcm_s16le ([1][0][0][0] / 0x0001), 44100 Hz, mono, s16, 705 kb/s`,
  mp3WithCover: `  Duration: 00:00:04.00, start: 0.025056, bitrate: 100 kb/s
  Stream #0:0: Audio: mp3 (mp3float), 44100 Hz, mono, fltp, 64 kb/s, start 0.025057
  Stream #0:1: Video: mjpeg (Baseline), yuvj444p(pc, bt470bg/unknown/unknown), 300x300 [SAR 1:1 DAR 1:1], 90k tbr, 90k tbn, start 0.025056 (attached pic)`,
  m4a51: `  Duration: 00:00:04.00, start: 0.000000, bitrate: 177 kb/s
  Stream #0:0[0x1](und): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, 5.1, fltp, 173 kb/s (default)`,
  mp4: `  Duration: 00:00:04.00, start: 0.000000, bitrate: 225 kb/s
  Stream #0:0[0x1](und): Video: h264 (High 4:4:4 Predictive) (avc1 / 0x31637661), yuv444p(progressive), 1920x1080 [SAR 1:1 DAR 16:9], 146 kb/s, 25 fps, 25 tbr, 12800 tbn (default)
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, mono, fltp, 69 kb/s (default)`,
};

function parse(logs: string, name: string) {
  return parseDetailedMetadata(logs, new File([], name), getFormatByExtension(name));
}

describe('parseDetailedMetadata', () => {
  it('detects FLAC audio, which has no bitrate on the stream line', () => {
    const m = parse(LOGS.flac, 'a.flac');
    expect(m).toMatchObject({ hasAudio: true, audioCodec: 'flac', sampleRate: 44100, channels: 1, hasVideo: false, isSupported: true });
    expect(m.audioBitrate).toBeUndefined();
  });

  it('detects Opus audio in WebM, which has no bitrate on the stream line', () => {
    const m = parse(LOGS.webm, 'a.webm');
    expect(m).toMatchObject({ hasAudio: true, audioCodec: 'opus', hasVideo: true, videoCodec: 'vp9', width: 640, height: 360, frameRate: 25, isSupported: true });
  });

  it('detects video in variable-frame-rate WebM with no fps value', () => {
    const m = parse(LOGS.webmVfr, 'a.webm');
    expect(m).toMatchObject({ hasVideo: true, videoCodec: 'vp8', width: 1280, height: 720, hasAudio: true, channels: 2, duration: 0, isSupported: true });
    expect(m.frameRate).toBeUndefined();
  });

  it('parses PCM WAV', () => {
    expect(parse(LOGS.wav, 'a.wav')).toMatchObject({ audioCodec: 'pcm_s16le', audioBitrate: 705000, duration: 4, isSupported: true });
  });

  it('ignores MP3 cover art instead of treating it as video', () => {
    expect(parse(LOGS.mp3WithCover, 'a.mp3')).toMatchObject({ hasVideo: false, hasAudio: true, audioCodec: 'mp3', isSupported: true });
  });

  it('maps 5.1 layouts to 6 channels', () => {
    expect(parse(LOGS.m4a51, 'a.m4a')).toMatchObject({ channels: 6, isSupported: true });
  });

  it('parses H.264 MP4 without mistaking the codec tag for a resolution', () => {
    expect(parse(LOGS.mp4, 'a.mp4')).toMatchObject({ videoCodec: 'h264', width: 1920, height: 1080, frameRate: 25, audioCodec: 'aac', isSupported: true });
  });

  it('rejects files with no audio track', () => {
    const videoOnly = LOGS.mp4.split('\n').slice(0, 2).join('\n');
    expect(parse(videoOnly, 'a.mp4')).toMatchObject({ hasAudio: false, isSupported: false });
  });
});

describe('computeWaveformPeaks', () => {
  it('normalizes 16-bit samples and derives duration from the sample rate', () => {
    const samples = new Int16Array([0, 16384, -32768, 0]);
    const { peaks, duration } = computeWaveformPeaks(samples, 2, 2);
    expect(Array.from(peaks)).toEqual([0, 0.5, -1, 0]);
    expect(duration).toBe(2);
  });
});
