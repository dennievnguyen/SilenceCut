import { useCallback, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, SETTINGS_RANGES } from '../constants.js';
import type { AudioLevels } from '../levels.js';
import { HelpDrawer } from './HelpDrawer.js';

export interface DetectionSettings {
  silenceThreshold: number; // dB
  minSilenceDuration: number; // seconds
  padding: number; // milliseconds
}

interface SettingsPanelProps {
  settings: DetectionSettings;
  levels: AudioLevels | null;
  onChange: (settings: DetectionSettings) => void;
}

interface SliderProps {
  id: string;
  label: string;
  hint: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function Slider({ id, label, hint, value, display, min, max, step, onChange }: SliderProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label htmlFor={id} className="text-[13px] font-medium text-ink">
          {label}
        </label>
        <span className="text-[13px] font-mono tabular-nums text-ink">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-orange cursor-pointer"
      />
      <p className="text-xs text-muted mt-1">{hint}</p>
    </div>
  );
}

export function SettingsPanel({ settings, levels, onChange }: SettingsPanelProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const closeHelp = useCallback(() => {
    setHelpOpen(false);
    helpButtonRef.current?.focus();
  }, []);

  const isDefault =
    settings.silenceThreshold === DEFAULT_SETTINGS.silenceThreshold &&
    settings.minSilenceDuration === DEFAULT_SETTINGS.minSilenceDuration &&
    settings.padding === DEFAULT_SETTINGS.padding;

  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h4 className="text-[13px] font-medium tracking-wide text-muted">DETECTION SETTINGS</h4>
          <button
            ref={helpButtonRef}
            onClick={() => setHelpOpen((open) => !open)}
            aria-expanded={helpOpen}
            className="flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs text-muted border border-transparent hover:border-border hover:text-ink transition-colors"
          >
            <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px] leading-none">
              ?
            </span>
            How these work
          </button>
        </div>
        <button
          onClick={() =>
            onChange({
              silenceThreshold: DEFAULT_SETTINGS.silenceThreshold,
              minSilenceDuration: DEFAULT_SETTINGS.minSilenceDuration,
              padding: DEFAULT_SETTINGS.padding,
            })
          }
          disabled={isDefault}
          className="px-2 py-1 rounded-sm text-xs text-muted border border-transparent hover:border-border disabled:opacity-40 disabled:hover:border-transparent transition-colors"
        >
          Reset to defaults
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Slider
          id="silence-threshold"
          label="Silence threshold"
          hint="Quieter than this counts as silence. Lower catches only true silence."
          value={settings.silenceThreshold}
          display={`${settings.silenceThreshold} dB`}
          {...SETTINGS_RANGES.silenceThreshold}
          onChange={(silenceThreshold) => onChange({ ...settings, silenceThreshold })}
        />
        <Slider
          id="min-silence-duration"
          label="Min silence duration"
          hint="Shorter pauses are left in, so natural speech isn't choppy."
          value={settings.minSilenceDuration}
          display={`${settings.minSilenceDuration.toFixed(1)} s`}
          {...SETTINGS_RANGES.minSilenceDuration}
          onChange={(minSilenceDuration) => onChange({ ...settings, minSilenceDuration })}
        />
        <Slider
          id="padding"
          label="Padding"
          hint="Kept on each side of a cut so words aren't clipped."
          value={settings.padding}
          display={`${settings.padding} ms`}
          {...SETTINGS_RANGES.padding}
          onChange={(padding) => onChange({ ...settings, padding })}
        />
      </div>

      {helpOpen && (
        <HelpDrawer settings={settings} levels={levels} onChange={onChange} onClose={closeHelp} />
      )}
    </div>
  );
}
