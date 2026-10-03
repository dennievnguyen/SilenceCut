import { describe, expect, it } from 'vitest';
import { buildCutFilterGraph, encoderArgs } from './cut.js';

const segments = [
  { start: 0, end: 2 },
  { start: 3.5, end: 5.25 },
];

describe('buildCutFilterGraph', () => {
  it('trims and concats video and audio together', () => {
    expect(buildCutFilterGraph(segments, { video: true, audio: true }).split(';')).toEqual([
      '[0:v]trim=start=0.000:end=2.000,setpts=PTS-STARTPTS[v0]',
      '[0:a]atrim=start=0.000:end=2.000,asetpts=PTS-STARTPTS[a0]',
      '[0:v]trim=start=3.500:end=5.250,setpts=PTS-STARTPTS[v1]',
      '[0:a]atrim=start=3.500:end=5.250,asetpts=PTS-STARTPTS[a1]',
      '[v0][a0][v1][a1]concat=n=2:v=1:a=1[outv][outa]',
    ]);
  });

  it('builds an audio-only graph', () => {
    expect(buildCutFilterGraph(segments, { video: false, audio: true }).split(';')).toEqual([
      '[0:a]atrim=start=0.000:end=2.000,asetpts=PTS-STARTPTS[a0]',
      '[0:a]atrim=start=3.500:end=5.250,asetpts=PTS-STARTPTS[a1]',
      '[a0][a1]concat=n=2:v=0:a=1[outa]',
    ]);
  });

  it('refuses an empty cut list', () => {
    expect(() => buildCutFilterGraph([], { video: true, audio: true })).toThrow(/Nothing to keep/);
  });
});

describe('encoderArgs', () => {
  it('keeps H.264 + AAC in MP4 at the input audio bitrate', () => {
    const { args, fallbacks } = encoderArgs({
      container: 'mp4',
      hasVideo: true,
      videoCodec: 'h264',
      hasAudio: true,
      audioCodec: 'aac',
      audioBitrate: 128000,
    });
    expect(args).toEqual([
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '20', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128000',
      '-movflags', '+faststart',
    ]);
    expect(fallbacks).toEqual([]);
  });

  it('passes PCM codecs straight through without a bitrate', () => {
    expect(
      encoderArgs({ container: 'wav', hasVideo: false, hasAudio: true, audioCodec: 'pcm_s24le' }).args
    ).toEqual(['-c:a', 'pcm_s24le']);
  });

  it('reports codecs it has no encoder for', () => {
    const { args, fallbacks } = encoderArgs({
      container: 'mov',
      hasVideo: true,
      videoCodec: 'prores',
      hasAudio: true,
      audioCodec: 'aac',
    });
    expect(fallbacks).toEqual(['video codec prores']);
    expect(args).toEqual(['-c:a', 'aac', '-b:a', '192000', '-movflags', '+faststart']);
  });
});
