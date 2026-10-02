import { useEffect, useRef } from 'react';
import { DETECTION_PRESETS } from '../constants.js';
import type { AudioLevels } from '../levels.js';
import type { DetectionSettings } from './SettingsPanel.js';

interface HelpDrawerProps {
  settings: DetectionSettings;
  levels: AudioLevels | null;
  onChange: (settings: DetectionSettings) => void;
  onClose: () => void;
}

// Loudness scale, top to bottom. Ranges are typical sample peaks, which is
// what detectSilence() compares against the threshold.
const SCALE_TOP_DB = 0;
const SCALE_BOTTOM_DB = -70;
const ZONES = [
  { label: 'Normal speech', from: 0, to: -20 },
  { label: 'Soft speech, word endings', from: -20, to: -35 },
  { label: 'Breaths, mouth sounds', from: -35, to: -45 },
  { label: 'Room tone, fan hum', from: -45, to: -60 },
  { label: 'Near-total silence', from: -60, to: -70 },
];

/** Position of a dB value on the scale, as a percentage from the top. */
function scalePosition(db: number): number {
  const clamped = Math.min(SCALE_TOP_DB, Math.max(SCALE_BOTTOM_DB, db));
  return ((SCALE_TOP_DB - clamped) / (SCALE_TOP_DB - SCALE_BOTTOM_DB)) * 100;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h5 className="text-[13px] font-medium tracking-wide text-muted mb-3">{children}</h5>;
}

function Marker({ db, label, color }: { db: number; label: string; color: string }) {
  return (
    <div
      className="absolute left-0 right-0 flex items-center gap-2 -translate-y-1/2"
      style={{ top: `${scalePosition(db)}%` }}
    >
      <span className={`h-0.5 w-6 rounded-full ${color}`} />
      <span className="text-xs font-medium text-ink whitespace-nowrap">
        {label} <span className="font-mono tabular-nums text-muted">{db} dB</span>
      </span>
    </div>
  );
}

function LoudnessScale({ threshold, levels }: { threshold: number; levels: AudioLevels | null }) {
  const thresholdPos = scalePosition(threshold);

  return (
    <div className="grid grid-cols-[1fr_12px_1fr] gap-3 h-64">
      {/* Zone labels */}
      <div className="relative">
        {ZONES.map((zone) => (
          <p
            key={zone.label}
            className="absolute right-0 text-right text-xs text-muted leading-tight -translate-y-1/2"
            style={{ top: `${(scalePosition(zone.from) + scalePosition(zone.to)) / 2}%` }}
          >
            {zone.label}
          </p>
        ))}
      </div>

      {/* Bar: everything under the threshold is a cut candidate */}
      <div className="relative rounded-full bg-border overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 bg-orange/60" style={{ top: `${thresholdPos}%` }} />
        {ZONES.slice(1).map((zone) => (
          <div
            key={zone.label}
            className="absolute inset-x-0 h-px bg-surface"
            style={{ top: `${scalePosition(zone.from)}%` }}
          />
        ))}
      </div>

      {/* Markers */}
      <div className="relative">
        <Marker db={threshold} label="Threshold" color="bg-orange" />
        {levels && (
          <>
            <Marker db={levels.speechDb} label="Your speech" color="bg-sky" />
            <Marker db={levels.noiseFloorDb} label="Your background" color="bg-navy-900" />
          </>
        )}
      </div>
    </div>
  );
}

function YourAudio({
  settings,
  levels,
  onChange,
}: {
  settings: DetectionSettings;
  levels: AudioLevels | null;
  onChange: (settings: DetectionSettings) => void;
}) {
  if (!levels) {
    return <p className="text-sm text-muted">Load a file to see where your own audio sits on this scale.</p>;
  }

  const suggested = levels.suggestedThresholdDb;
  if (suggested === null) {
    return (
      <p className="text-sm text-ink/80">
        Your background noise is almost as loud as your speech, so no threshold separates them
        cleanly. Try the <span className="font-medium">Noisy room</span> preset and a longer min
        silence duration.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink/80">
        Your background noise sits around{' '}
        <span className="font-mono tabular-nums">{levels.noiseFloorDb} dB</span>. A threshold of{' '}
        <span className="font-mono tabular-nums">{suggested} dB</span> sits just above it, so pauses
        get caught but speech doesn't.
      </p>
      <button
        onClick={() => onChange({ ...settings, silenceThreshold: suggested })}
        disabled={settings.silenceThreshold === suggested}
        className="px-3 py-1.5 rounded-sm bg-orange text-white text-xs font-medium hover:bg-orange-dark disabled:opacity-40 disabled:hover:bg-orange transition-colors"
      >
        {settings.silenceThreshold === suggested ? 'Using suggested threshold' : `Use ${suggested} dB`}
      </button>
    </div>
  );
}

export function HelpDrawer({ settings, levels, onChange, onClose }: HelpDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const isActive = (preset: (typeof DETECTION_PRESETS)[number]) =>
    preset.settings.silenceThreshold === settings.silenceThreshold &&
    preset.settings.minSilenceDuration === settings.minSilenceDuration &&
    preset.settings.padding === settings.padding;

  const troubleshooting = [
    {
      symptom: "Pauses aren't being cut",
      fix: levels
        ? `Background noise in your pauses is louder than the threshold. Raise it above ${levels.noiseFloorDb} dB.`
        : 'Background noise in your pauses is louder than the threshold. Raise the threshold.',
    },
    {
      symptom: 'Quiet words or word endings go missing',
      fix: 'The threshold is too high. Lower it, or add padding.',
    },
    {
      symptom: 'The result feels rushed or choppy',
      fix: 'Raise min silence duration so natural pauses between words stay in.',
    },
    {
      symptom: 'Cuts sound abrupt',
      fix: 'Raise padding to keep a little more room on each side of a cut.',
    },
  ];

  return (
    <aside
      role="dialog"
      aria-labelledby="help-drawer-title"
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] bg-surface shadow-lg flex flex-col"
    >
      <div className="h-11 shrink-0 bg-navy-900 flex items-center justify-between px-4">
        <h4 id="help-drawer-title" className="text-[13px] font-medium text-white">
          How detection settings work
        </h4>
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Close help"
          className="text-white/80 hover:text-orange transition-colors text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-8">
        <section>
          <SectionHeading>WHAT COUNTS AS SILENCE</SectionHeading>
          <p className="text-sm text-ink/80 mb-5">
            Silence doesn't mean zero sound. Anything quieter than the{' '}
            <span className="font-medium text-ink">threshold</span> counts, including hum and room
            noise. A stretch is cut once it stays under the line for at least{' '}
            <span className="font-mono tabular-nums">{settings.minSilenceDuration.toFixed(1)} s</span>,
            keeping <span className="font-mono tabular-nums">{settings.padding} ms</span> on each
            side.
          </p>
          <LoudnessScale threshold={settings.silenceThreshold} levels={levels} />
        </section>

        <section>
          <SectionHeading>YOUR AUDIO</SectionHeading>
          <YourAudio settings={settings} levels={levels} onChange={onChange} />
        </section>

        <section>
          <SectionHeading>PRESETS</SectionHeading>
          <ul className="divide-y divide-border border-y border-border">
            {DETECTION_PRESETS.map((preset) => (
              <li key={preset.name} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{preset.name}</p>
                  <p className="text-xs text-muted">{preset.description}</p>
                </div>
                {isActive(preset) ? (
                  <span className="px-2 py-1 rounded-sm bg-orange-tint text-xs font-medium text-orange-dark">
                    Active
                  </span>
                ) : (
                  <button
                    onClick={() => onChange({ ...settings, ...preset.settings })}
                    className="px-2 py-1 rounded-sm text-xs text-muted border border-border hover:text-ink hover:border-ink/30 transition-colors"
                  >
                    Apply
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionHeading>TROUBLESHOOTING</SectionHeading>
          <dl className="space-y-4">
            {troubleshooting.map((item) => (
              <div key={item.symptom}>
                <dt className="text-sm font-medium text-ink">{item.symptom}</dt>
                <dd className="text-sm text-muted">{item.fix}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </aside>
  );
}
