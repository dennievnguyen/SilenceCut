import type { FileMetadata } from '../types.js';
import {
  formatFileSize,
  formatResolution,
  formatBitrate,
  formatSampleRate,
  formatCodecName,
} from '../utils.js';

interface FileInfoProps {
  metadata: FileMetadata;
  onRemove?: () => void;
}

export function FileInfo({ metadata, onRemove }: FileInfoProps) {
  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-semibold text-ink truncate mb-1">
            {metadata.name}
          </h3>
          <p className="text-sm text-muted">
            {formatFileSize(metadata.size)} • {metadata.durationFormatted}
          </p>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="ml-4 p-2 text-muted hover:text-ink hover:bg-canvas rounded transition-colors"
            title="Remove file"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Status Badge */}
      <div className="mb-4">
        {metadata.isSupported ? (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-mint/15 border border-mint/40 rounded-full text-sm text-mint-dark">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Supported Format
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-danger/10 border border-danger/40 rounded-full text-sm text-danger">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            Unsupported Format
          </div>
        )}
        {metadata.supportMessage && (
          <p className="mt-2 text-sm text-muted">{metadata.supportMessage}</p>
        )}
      </div>

      {/* Technical Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Container */}
        <div className="bg-canvas rounded p-3">
          <div className="text-xs text-muted mb-1">Container</div>
          <div className="text-sm font-medium text-ink">
            {metadata.container.toUpperCase()}
          </div>
        </div>

        {/* Duration */}
        <div className="bg-canvas rounded p-3">
          <div className="text-xs text-muted mb-1">Duration</div>
          <div className="text-sm font-medium text-ink">
            {metadata.durationFormatted}
            <span className="text-muted ml-1">
              ({metadata.duration.toFixed(1)}s)
            </span>
          </div>
        </div>

        {/* Video Info */}
        {metadata.hasVideo && (
          <>
            <div className="bg-canvas rounded p-3">
              <div className="text-xs text-muted mb-1">Video Codec</div>
              <div className="text-sm font-medium text-ink">
                {formatCodecName(metadata.videoCodec)}
              </div>
            </div>

            <div className="bg-canvas rounded p-3">
              <div className="text-xs text-muted mb-1">Resolution</div>
              <div className="text-sm font-medium text-ink">
                {formatResolution(metadata.width, metadata.height)}
              </div>
            </div>

            {metadata.frameRate && (
              <div className="bg-canvas rounded p-3">
                <div className="text-xs text-muted mb-1">Frame Rate</div>
                <div className="text-sm font-medium text-ink">
                  {metadata.frameRate.toFixed(2)} fps
                </div>
              </div>
            )}

            {metadata.videoBitrate && (
              <div className="bg-canvas rounded p-3">
                <div className="text-xs text-muted mb-1">Video Bitrate</div>
                <div className="text-sm font-medium text-ink">
                  {formatBitrate(metadata.videoBitrate)}
                </div>
              </div>
            )}
          </>
        )}

        {/* Audio Info */}
        {metadata.hasAudio && (
          <>
            <div className="bg-canvas rounded p-3">
              <div className="text-xs text-muted mb-1">Audio Codec</div>
              <div className="text-sm font-medium text-ink">
                {formatCodecName(metadata.audioCodec)}
              </div>
            </div>

            {metadata.sampleRate && (
              <div className="bg-canvas rounded p-3">
                <div className="text-xs text-muted mb-1">Sample Rate</div>
                <div className="text-sm font-medium text-ink">
                  {formatSampleRate(metadata.sampleRate)}
                </div>
              </div>
            )}

            {metadata.channels && (
              <div className="bg-canvas rounded p-3">
                <div className="text-xs text-muted mb-1">Channels</div>
                <div className="text-sm font-medium text-ink">
                  {metadata.channels === 1
                    ? 'Mono'
                    : metadata.channels === 2
                    ? 'Stereo'
                    : `${metadata.channels} channels`}
                </div>
              </div>
            )}

            {metadata.audioBitrate && (
              <div className="bg-canvas rounded p-3">
                <div className="text-xs text-muted mb-1">Audio Bitrate</div>
                <div className="text-sm font-medium text-ink">
                  {formatBitrate(metadata.audioBitrate)}
                </div>
              </div>
            )}
          </>
        )}

        {/* No Audio Warning */}
        {!metadata.hasAudio && (
          <div className="md:col-span-2 bg-orange-tint/60 border border-orange/40 rounded p-3">
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
              <div className="text-sm text-ink/80">
                <strong>No audio track detected.</strong> Silence detection requires an
                audio track. The file can be passed through unchanged, or you can add
                audio before processing.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
