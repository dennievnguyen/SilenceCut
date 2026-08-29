import { useCallback, useState } from 'react';
import { SUPPORTED_EXTENSIONS, SUPPORTED_FORMATS } from '../constants.js';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function FileUpload({ onFileSelect, disabled }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (disabled) return;
      onFileSelect(file);
    },
    [onFileSelect, disabled]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFile(files[0]); // Only handle first file
      }
    },
    [handleFile, disabled]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [handleFile]
  );

  // Group formats by type for display
  const videoFormats = SUPPORTED_FORMATS.filter((f) => f.videoCodecs);
  const audioFormats = SUPPORTED_FORMATS.filter((f) => !f.videoCodecs);

  return (
    <div className="w-full">
      {/* Drag and Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center
          transition-all duration-200 ease-in-out
          ${
            disabled
              ? 'border-border bg-canvas cursor-not-allowed opacity-50'
              : isDragging
              ? 'border-orange bg-orange-tint scale-[1.02]'
              : 'border-border bg-canvas hover:border-orange/50 hover:bg-orange-tint/40 cursor-pointer'
          }
        `}
      >
        {/* Upload Icon */}
        <div className="mb-4">
          <svg
            className={`mx-auto h-8 w-8 ${
              disabled ? 'text-border' : isDragging ? 'text-orange' : 'text-muted'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        {/* Main Text */}
        <div className="mb-2">
          <p className={`text-xl font-semibold ${disabled ? 'text-muted' : 'text-ink'}`}>
            {isDragging ? 'Drop your file here' : 'Drag & drop your video or audio file'}
          </p>
        </div>

        {/* Subtitle */}
        <p className="text-muted mb-6">or</p>

        {/* File Picker Button */}
        <label
          className={`
            inline-flex items-center gap-2 px-6 py-3 rounded-md font-medium
            transition-colors duration-200
            ${
              disabled
                ? 'bg-border text-muted cursor-not-allowed'
                : 'bg-orange text-white hover:bg-orange-dark cursor-pointer'
            }
          `}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          Browse Files
          <input
            type="file"
            className="hidden"
            accept={SUPPORTED_EXTENSIONS.join(',')}
            onChange={handleFileInput}
            disabled={disabled}
          />
        </label>

        {/* Privacy Notice */}
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>Your file stays on your device - nothing is uploaded</span>
        </div>
      </div>

      {/* Supported Formats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Video Formats */}
        <div className="bg-canvas rounded-md p-4">
          <h3 className="text-sm font-semibold text-ink mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-muted" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
            Video Formats
          </h3>
          <div className="text-xs text-muted space-y-1">
            {videoFormats.slice(0, 4).map((format) => (
              <div key={format.container}>
                <span className="font-medium text-ink/80">
                  {format.extensions.join(', ')}
                </span>
                {' - '}
                {format.container.toUpperCase()}
              </div>
            ))}
            {videoFormats.length > 4 && (
              <div className="text-muted/70">+ {videoFormats.length - 4} more</div>
            )}
          </div>
        </div>

        {/* Audio Formats */}
        <div className="bg-canvas rounded-md p-4">
          <h3 className="text-sm font-semibold text-ink mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-muted" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
            Audio Formats
          </h3>
          <div className="text-xs text-muted space-y-1">
            {audioFormats.slice(0, 4).map((format) => (
              <div key={format.container}>
                <span className="font-medium text-ink/80">
                  {format.extensions.join(', ')}
                </span>
                {' - '}
                {format.container.toUpperCase()}
              </div>
            ))}
            {audioFormats.length > 4 && (
              <div className="text-muted/70">+ {audioFormats.length - 4} more</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
