import { useCallback, useEffect, useRef } from 'react';
import type { SilenceInterval } from '../types.js';

interface WaveformProps {
  peaks: Float32Array;
  duration: number;
  silenceIntervals: SilenceInterval[];
  currentTime: number;
  onSeek: (time: number) => void;
}

export function Waveform({ peaks, duration, silenceIntervals, currentTime, onSeek }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const mid = height / 2;
    const sampleCount = peaks.length / 2;
    const barWidth = width / sampleCount;

    // Silence region shading (drawn first, under the waveform)
    ctx.fillStyle = 'rgba(240, 168, 74, 0.35)'; // orange tint: regions that will be cut
    for (const interval of silenceIntervals) {
      const x1 = (interval.start / duration) * width;
      const x2 = (interval.end / duration) * width;
      ctx.fillRect(x1, 0, Math.max(1, x2 - x1), height);
    }

    // Waveform bars
    ctx.fillStyle = '#38bdf8'; // sky
    for (let i = 0; i < sampleCount; i++) {
      const min = peaks[i * 2];
      const max = peaks[i * 2 + 1];
      const x = i * barWidth;
      const y1 = mid + min * mid;
      const y2 = mid + max * mid;
      ctx.fillRect(x, y1, Math.max(1, barWidth - 0.5), Math.max(1, y2 - y1));
    }

    // Playhead
    if (duration > 0) {
      const playheadX = (currentTime / duration) * width;
      ctx.strokeStyle = '#f97316'; // orange
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }
  }, [peaks, duration, silenceIntervals, currentTime]);

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || duration <= 0) return;
      const rect = canvas.getBoundingClientRect();
      const fraction = (e.clientX - rect.left) / rect.width;
      onSeek(Math.max(0, Math.min(duration, fraction * duration)));
    },
    [duration, onSeek]
  );

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="w-full h-32 rounded-md bg-navy-900 cursor-pointer"
    />
  );
}
