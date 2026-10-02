import { useEffect, useRef, useState, useCallback, useMemo, useDeferredValue } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { FileUpload } from './components/FileUpload.js';
import { FileInfo } from './components/FileInfo.js';
import { Waveform } from './components/Waveform.js';
import { SettingsPanel, type DetectionSettings } from './components/SettingsPanel.js';
import { AppShell, type PipelineStepId } from './components/AppShell.js';
import type { FileMetadata, AppState } from './types.js';
import {
  extractMetadataDetailed,
  decodeAnalysisAudio,
  writeInputFile,
  deleteInputFile,
  ANALYSIS_SAMPLE_RATE,
} from './ffmpeg-helpers.js';
import { validateFileLimits, formatDuration } from './utils.js';
import { computeWaveformPeaks, type WaveformPeaks } from './waveform.js';
import { DEFAULT_SETTINGS } from './constants.js';
import { detectSilence, applyPadding } from './silence.js';
import { measureLevels } from './levels.js';

function App() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [ffmpegLoaded, setFFmpegLoaded] = useState(false);
  const [ffmpegVersion, setFFmpegVersion] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [ffmpegRef] = useState(() => new FFmpeg());
  const loadStartedRef = useRef(false);
  const coreURLsRef = useRef<{ coreURL: string; wasmURL: string } | null>(null);

  // Incremented whenever a file is selected or removed. A processing job
  // checks it after each await and bails out if it's no longer current, so
  // a removed/replaced file's results never land in state.
  const jobIdRef = useRef(0);
  const busyRef = useRef(false);

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileMetadata, setFileMetadata] = useState<FileMetadata | null>(null);
  const [fileWarning, setFileWarning] = useState<string>('');
  const [objectUrl, setObjectUrl] = useState<string>('');

  // Silence detection state
  // Decoded once per file; every settings change re-detects against this.
  const [analysisSamples, setAnalysisSamples] = useState<Int16Array | null>(null);
  const [settings, setSettings] = useState<DetectionSettings>({
    silenceThreshold: DEFAULT_SETTINGS.silenceThreshold,
    minSilenceDuration: DEFAULT_SETTINGS.minSilenceDuration,
    padding: DEFAULT_SETTINGS.padding,
  });
  const [waveformPeaks, setWaveformPeaks] = useState<WaveformPeaks | null>(null);

  // Playback state
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // StrictMode runs effects twice in dev; only load once.
    if (loadStartedRef.current) return;
    loadStartedRef.current = true;
    ffmpegRef.on('log', ({ message }) => {
      console.log('[FFmpeg]', message);
    });
    loadFFmpeg();
  }, []);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString().split('T')[1].split('.')[0]}] ${message}`]);
  };

  const loadFFmpeg = async () => {
    try {
      addLog('Loading FFmpeg.wasm...');

      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

      // Cached so a reload after cancelling a job doesn't re-download the core.
      coreURLsRef.current ??= {
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      };
      await ffmpegRef.load(coreURLsRef.current);

      addLog('FFmpeg.wasm loaded successfully!');
      setFFmpegLoaded(true);
      setFFmpegVersion('FFmpeg loaded (check console for version)');

      // Get FFmpeg version
      await ffmpegRef.exec(['-version']);

      addLog('✓ Ready to process files');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error loading FFmpeg:', err);
      setError(errorMessage);
      addLog(`✗ Error: ${errorMessage}`);
    }
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (!ffmpegLoaded) {
      setError('FFmpeg is not loaded yet. Please wait...');
      return;
    }

    const jobId = ++jobIdRef.current;
    const isStale = () => jobIdRef.current !== jobId;
    busyRef.current = true;

    try {
      setAppState('loading-file');
      setError('');
      setFileWarning('');
      setSelectedFile(file);

      addLog(`Selected file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

      // Validate file size up front, before copying it into ffmpeg's memory.
      // Duration is checked again below once the metadata is known.
      const validation = validateFileLimits(file.size);
      if (!validation.valid) {
        setError(validation.error || 'File validation failed');
        setAppState('error');
        return;
      }
      if (validation.warning) {
        setFileWarning(validation.warning);
      }

      // Write the file into ffmpeg's virtual filesystem once and reuse it
      // for both the metadata probe and the silencedetect pass below,
      // instead of re-reading and re-copying the whole file for each.
      const inputName = await writeInputFile(ffmpegRef, file);

      try {
        // Extract metadata
        addLog('Extracting file metadata...');
        const metadata = await extractMetadataDetailed(ffmpegRef, file, inputName);
        if (isStale()) return;

        const durationCheck = validateFileLimits(file.size, metadata.duration);
        if (!durationCheck.valid) {
          setError(durationCheck.error || 'File validation failed');
          setAppState('error');
          return;
        }
        if (durationCheck.warning) {
          setFileWarning(durationCheck.warning);
        }

        setFileMetadata(metadata);
        addLog(`✓ Metadata extracted: ${metadata.durationFormatted}, ${metadata.container.toUpperCase()}`);

        if (!metadata.isSupported) {
          setAppState('error');
          setError(metadata.supportMessage || 'File format not supported');
          addLog(`✗ ${metadata.supportMessage}`);
          return;
        }

        setObjectUrl(URL.createObjectURL(file));

        setAppState('detecting-silence');
        addLog('Analyzing audio...');

        const samples = await decodeAnalysisAudio(ffmpegRef, inputName);
        if (isStale()) return;

        setWaveformPeaks(computeWaveformPeaks(samples, ANALYSIS_SAMPLE_RATE));
        setAnalysisSamples(samples);
        addLog('✓ Audio analyzed — adjust the settings to tune detection');
        setAppState('editing');
      } finally {
        await deleteInputFile(ffmpegRef, inputName);
      }

    } catch (err) {
      if (isStale()) return; // cancelled: the terminated job's rejection isn't an error
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error processing file:', err);
      setError(`Failed to process file: ${errorMessage}`);
      setAppState('error');
      addLog(`✗ Error: ${errorMessage}`);
    } finally {
      if (!isStale()) busyRef.current = false;
    }
  }, [ffmpegLoaded, ffmpegRef]);

  const handleRemoveFile = useCallback(() => {
    jobIdRef.current++;
    if (busyRef.current) {
      // Stop the running ffmpeg job rather than letting it finish in the
      // background, then bring a fresh instance back up for the next file.
      busyRef.current = false;
      ffmpegRef.terminate();
      setFFmpegLoaded(false);
      addLog('Processing cancelled');
      loadFFmpeg();
    }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setSelectedFile(null);
    setFileMetadata(null);
    setError('');
    setFileWarning('');
    setObjectUrl('');
    setAnalysisSamples(null);
    setWaveformPeaks(null);
    setCurrentTime(0);
    setIsPlaying(false);
    setAppState('idle');
    addLog('File removed');
  }, [objectUrl, ffmpegRef]);

  const handleSeek = useCallback((time: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
    }
    setCurrentTime(time);
  }, []);

  const togglePlayback = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    if (media.paused) {
      media.play();
    } else {
      media.pause();
    }
  }, []);

  // Re-detect whenever the settings change. Deferred so dragging a slider
  // stays smooth on long files while detection catches up.
  const deferredSettings = useDeferredValue(settings);
  const silenceIntervals = useMemo(() => {
    if (!analysisSamples) return null;
    const duration = analysisSamples.length / ANALYSIS_SAMPLE_RATE;
    const raw = detectSilence(
      analysisSamples,
      ANALYSIS_SAMPLE_RATE,
      deferredSettings.silenceThreshold,
      deferredSettings.minSilenceDuration
    );
    return applyPadding(raw, deferredSettings.padding, duration);
  }, [analysisSamples, deferredSettings]);

  const audioLevels = useMemo(
    () => (analysisSamples ? measureLevels(analysisSamples, ANALYSIS_SAMPLE_RATE) : null),
    [analysisSamples]
  );

  const analysisDuration = analysisSamples ? analysisSamples.length / ANALYSIS_SAMPLE_RATE : 0;
  const removedDuration = silenceIntervals?.reduce((sum, i) => sum + i.duration, 0) ?? 0;
  const percentRemoved = analysisDuration > 0 ? Math.round((removedDuration / analysisDuration) * 100) : 0;

  // Show Milestone 0 completion screen if no file is loaded
  const showMilestone0 = !selectedFile && appState === 'idle';

  // Map app state to sidebar pipeline step
  const currentStep: PipelineStepId = silenceIntervals
    ? 'trim'
    : fileMetadata
    ? 'detect'
    : 'upload';
  const completedSteps: PipelineStepId[] = fileMetadata
    ? silenceIntervals
      ? ['upload', 'detect']
      : ['upload']
    : [];

  return (
    <AppShell currentStep={currentStep} completedSteps={completedSteps}>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-ink mb-1">Silence Cutter</h1>
        <p className="text-muted text-sm">
          {showMilestone0
            ? 'Milestone 0: FFmpeg.wasm Integration Test'
            : silenceIntervals
            ? 'Milestone 3: Trim Settings'
            : fileMetadata
            ? 'Milestone 1: File Intake & Metadata'
            : 'Drop your file to begin'}
        </p>
      </header>

      <div className="space-y-6">
        {/* FFmpeg Status (show only on Milestone 0 screen) */}
        {showMilestone0 && (
          <div className="bg-canvas rounded-md p-6">
            <h2 className="text-lg font-semibold text-ink mb-4">FFmpeg Status</h2>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${ffmpegLoaded ? 'bg-mint-dark' : error ? 'bg-danger' : 'bg-orange animate-pulse'}`}></div>
                <span className="font-medium text-ink text-sm">
                  {ffmpegLoaded ? 'Loaded' : error ? 'Error' : 'Loading...'}
                </span>
              </div>

              {ffmpegVersion && (
                <div className="text-sm text-muted bg-surface border border-border p-3 rounded font-mono">
                  {ffmpegVersion}
                </div>
              )}

              {error && !selectedFile && (
                <div className="text-danger text-sm bg-danger/10 p-3 rounded border border-danger/30">
                  <strong>Error:</strong> {error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* File Upload or File Info */}
        {!fileMetadata ? (
          <FileUpload
            onFileSelect={handleFileSelect}
            disabled={!ffmpegLoaded || appState === 'loading-file'}
          />
        ) : (
          <FileInfo
            metadata={fileMetadata}
            onRemove={handleRemoveFile}
          />
        )}

        {/* Loading State */}
        {appState === 'loading-file' && (
          <div className="bg-sky/10 border border-sky/40 rounded-md p-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sky"></div>
              <span className="text-ink text-sm">Analyzing file...</span>
            </div>
          </div>
        )}

        {/* File Warning (large file) */}
        {fileWarning && (
          <div className="bg-orange-tint/60 border border-orange/40 rounded-md p-4">
            <div className="flex items-start gap-2">
              <svg
                className="w-4 h-4 text-orange-dark flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-ink/80">{fileWarning}</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && selectedFile && (
          <div className="bg-danger/10 border border-danger/30 rounded-md p-4">
            <div className="flex items-start gap-2">
              <svg
                className="w-4 h-4 text-danger flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="text-sm text-danger">
                <strong>Error:</strong> {error}
              </div>
            </div>
          </div>
        )}

        {/* Console Logs (collapsible on file loaded) */}
        {logs.length > 0 && (
          <details className="bg-canvas rounded-md border border-border" open={!fileMetadata}>
            <summary className="p-4 cursor-pointer hover:bg-border/40 transition-colors rounded-t-md">
              <span className="text-sm font-semibold text-ink">Console Output</span>
              <span className="text-xs text-muted ml-2">
                ({logs.length} messages)
              </span>
            </summary>

            <div className="bg-navy-900 rounded-b-md p-4 font-mono text-xs max-h-96 overflow-y-auto">
              {logs.map((log, idx) => (
                <div key={idx} className="text-mint mb-1">
                  {log}
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Milestone Status */}
        {(ffmpegLoaded && !fileMetadata) && (
          <div className="bg-mint/10 border border-mint/30 rounded-md p-6">
            <h3 className="text-base font-semibold mb-4 text-mint-dark">
              Milestone 0 Complete
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-mint-dark mt-0.5">✓</span>
                <span className="text-ink/80">FFmpeg.wasm loaded and initialized</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-mint-dark mt-0.5">✓</span>
                <span className="text-ink/80">File upload UI ready (drag & drop + file picker)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky mt-0.5">→</span>
                <span className="text-ink/80">Drop a file above to test metadata extraction</span>
              </li>
            </ul>
          </div>
        )}

        {/* Detecting Silence */}
        {appState === 'detecting-silence' && (
          <div className="bg-sky/10 border border-sky/40 rounded-md p-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sky"></div>
              <span className="text-ink text-sm">
                Analyzing audio...
              </span>
            </div>
          </div>
        )}

        {/* Media Preview + Waveform */}
        {fileMetadata && objectUrl && silenceIntervals && (
          <div className="bg-canvas rounded-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink">Waveform</h3>
              <span className="text-xs text-muted">
                Click anywhere on the waveform to seek
              </span>
            </div>

            {fileMetadata.hasVideo ? (
              <video
                ref={mediaRef as React.RefObject<HTMLVideoElement>}
                src={objectUrl}
                className="w-full rounded-md max-h-64 bg-black"
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            ) : (
              <audio
                ref={mediaRef as React.RefObject<HTMLAudioElement>}
                src={objectUrl}
                className="w-full"
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            )}

            {waveformPeaks ? (
              <Waveform
                peaks={waveformPeaks.peaks}
                duration={waveformPeaks.duration}
                silenceIntervals={silenceIntervals}
                currentTime={currentTime}
                onSeek={handleSeek}
              />
            ) : (
              <div className="w-full h-32 rounded-md bg-navy-900 flex items-center justify-center text-sm text-muted px-4 text-center">
                Generating waveform preview...
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={togglePlayback}
                className="px-4 py-2 rounded-md bg-orange text-white text-sm font-medium hover:bg-orange-dark transition-colors"
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <span className="text-sm text-muted font-mono">
                {formatDuration(currentTime)} / {fileMetadata.durationFormatted}
              </span>
            </div>

            <SettingsPanel settings={settings} levels={audioLevels} onChange={setSettings} />
          </div>
        )}

        {/* Detection result: what the current settings would cut */}
        {silenceIntervals && (
          silenceIntervals.length > 0 ? (
            <div className="bg-mint/10 border border-mint/30 rounded-md p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <div>
                  <p className="text-[13px] font-medium tracking-wide text-mint-dark mb-1">
                    ESTIMATED RESULT
                  </p>
                  <p className="text-3xl font-medium font-mono tabular-nums text-ink">
                    {formatDuration(analysisDuration)} → {formatDuration(analysisDuration - removedDuration)}
                  </p>
                </div>
                <p className="text-sm text-ink/80">
                  {silenceIntervals.length} cut{silenceIntervals.length === 1 ? '' : 's'}, removing{' '}
                  {formatDuration(removedDuration)} ({percentRemoved}%)
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-orange-tint/60 border border-orange/40 rounded-md p-4">
              <p className="text-sm text-ink/80">
                No silence found at these settings (threshold {deferredSettings.silenceThreshold} dB,
                min duration {deferredSettings.minSilenceDuration.toFixed(1)} s). Try raising the
                threshold or lowering the minimum duration.
              </p>
            </div>
          )
        )}
      </div>
    </AppShell>
  );
}

export default App;
