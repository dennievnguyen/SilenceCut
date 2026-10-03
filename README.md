# Silence Cutter 🎬✂️

The ultimate browser-based video/audio editor that automatically detects and removes silent sections from your recordings without uploading files to any server.

**Current Status:** 🏗️ Milestone 4 Complete - Cut & Export

---

## What is this?

SilenceCut is a single-page web app designed for podcasters, YouTubers, and content creators who want to remove dead air from their recordings quickly without manual timeline editing.

**Key Features:**
- 🔒 **100% Private:** All processing happens in your browser - files never leave your device
- ⚡ **Fast:** Powered by FFmpeg.wasm running on WebAssembly
- 🎯 **Smart:** Automatically detects silence with adjustable settings
- 📦 **Same Format Out:** Input MP4 → Output MP4 (no format confusion)
- 🎛️ **Adjustable:** Control threshold, minimum duration, and padding in real-time

---

## Project Status & Roadmap

### ✅ Milestone 0: FFmpeg.wasm Integration (COMPLETE)
- [x] Vite + React + TypeScript + Tailwind setup
- [x] FFmpeg.wasm loaded and verified working
- [x] CORS headers configured for SharedArrayBuffer
- [x] Basic UI shell with status display
- [x] Engineering decisions documented

### ✅ Milestone 1: File Intake (COMPLETE)
- [x] Drag-and-drop file upload
- [x] File format validation
- [x] Metadata extraction (duration, codec, container, resolution/sample rate)
- [x] Display file info to user

### ✅ Milestone 2: Silence Detection (COMPLETE)
- [x] Run FFmpeg silencedetect filter *(replaced by JS detection in Milestone 3)*
- [x] Parse silence intervals
- [x] Render interactive waveform
- [x] Highlight silent regions

### 🛠️ Intake & Stability Fixes (2026-10-02)
- [x] FLAC and WebM/Opus files no longer rejected as "no audio track" (ffmpeg omits their bitrate)
- [x] Variable-frame-rate video (no fps reported) detected as video, not audio-only
- [x] MP3/M4A cover art ignored instead of treated as a video stream; 5.1 audio reports 6 channels
- [x] Removing a file mid-detection cancels the ffmpeg job and discards stale results
- [x] Duration limits (30 min warning / 2 hr max) now enforced once metadata is known
- [x] Waveform built from a small 8 kHz mono decode instead of full-rate `decodeAudioData` (fixes MKV and memory on long files)
- [x] Unit tests added (`npm test`, Vitest)

### ✅ Milestone 3: Settings Panel (COMPLETE)
- [x] Threshold slider (-60 to -20 dB)
- [x] Min duration slider (0.1 to 3.0s)
- [x] Padding control (0 to 500ms)
- [x] Live waveform updates (no re-processing)
- [x] Exit criterion met: re-detection takes ~60 ms on a 10-minute file (target: under 1 s)
- [x] Estimated before → after duration and % removed shown live

### ✅ Milestone 4: Cut & Export (COMPLETE)
- [x] Build FFmpeg trim/concat filter graph
- [x] Process video with silence removed (re-encoded for frame-accurate cuts)
- [x] Export in same format as input *(verified: H.264/AAC MP4; other formats in Milestone 5)*
- [x] Download button
- [x] Progress bar and cancel during export; retry after a failure without re-uploading
- [x] Exit criterion met: 5:54 1080p MP4 → 3:28 MP4, plays back with silence gone (export ~10 min)

### 🔄 Milestone 5: Polish (NEXT)
- [ ] Progress indicators *(export progress bar done; detection pending)*
- [ ] Error state handling *(cancel mid-detection and mid-export done)*
- [ ] Before/after duration stats *(live estimate and post-export duration/size done)*
- [ ] Multi-format testing *(fill in CODEC_SUPPORT.md)*
- [ ] Performance optimization *(H.264 now `ultrafast`; next: multi-threaded core, needs a hosting decision; see DECISIONS.md 18)*

---

## Getting Started

### Prerequisites
- Node.js 18+
- Modern browser with SharedArrayBuffer support:
  - Chrome 92+
  - Firefox 90+
  - Safari 15.2+

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd silenceCut

# Install dependencies
npm install

# Start dev server
npm run dev

# Run unit tests
npm test
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview  # Preview production build locally
```

---

## Documentation

- **[SPECS.md](src/memories/SPECS.md)** - Complete product specification
- **[DECISIONS.md](DECISIONS.md)** - Engineering decisions and rationale
- **[CODEC_SUPPORT.md](CODEC_SUPPORT.md)** - Codec testing results
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions

---

## Technology Stack

- **Frontend:** React 19 + TypeScript
- **Styling:** Tailwind CSS
- **Build Tool:** Vite
- **Testing:** Vitest
- **Processing:** FFmpeg.wasm (@ffmpeg/ffmpeg v0.12.15)
- **No Backend:** Everything runs client-side

---

## Supported Formats (Planned)

### Video
- MP4 (H.264, H.265/HEVC)
- MOV (H.264, H.265, ProRes*)
- MKV (H.264, H.265, VP9)
- WebM (VP8, VP9, AV1)

### Audio
- MP3
- WAV
- M4A/AAC
- FLAC
- OGG (Vorbis, Opus)

\* ProRes support depends on FFmpeg.wasm build

---

## Architecture Highlights

### Privacy-First Design
Files are processed entirely in your browser using WebAssembly. No server uploads, no cloud processing, no data collection.

### Performance
- FFmpeg runs in a Web Worker (non-blocking UI)
- Audio decoded once to an 8 kHz mono copy; waveform and silence detection both run on it
- Settings changes re-detect in JS against that copy (no re-decoding)

### Browser Compatibility
Requires modern browser features:
- **WebAssembly:** For FFmpeg
- **SharedArrayBuffer:** For multi-threading (faster processing)
- **File System Access API:** For large files (with fallback)

---

## Development

### Project Structure

```
silenceCut/
├── src/
│   ├── App.tsx           # Main application component
│   ├── main.tsx          # React entry point
│   ├── components/       # AppShell, FileUpload, FileInfo, Waveform, SettingsPanel
│   ├── ffmpeg-helpers.ts # Metadata probe, one-pass audio decode, export
│   ├── silence.ts        # Silence detection, padding, keep segments (runs on cached audio)
│   ├── cut.ts            # Export filter graph + same-codec encoder choice
│   ├── waveform.ts       # Waveform peak computation
│   ├── index.css         # Tailwind styles
│   └── memories/         # Project documentation
│       └── SPECS.md      # Product specification
├── DECISIONS.md          # Engineering decisions log
├── CODEC_SUPPORT.md      # Codec testing results
└── README.md             # This file
```

### Key Design Decisions

1. **React over Vanilla JS:** Better state management for complex UI
2. **Tailwind CSS:** Rapid development with consistent design
3. **CDN for FFmpeg Core:** Keeps bundle small (~30MB core loaded separately)
4. **Web Worker:** Keeps UI responsive during processing
5. **No Backend:** Privacy + zero hosting cost

See [DECISIONS.md](DECISIONS.md) for detailed rationale.

---

## Contributing

This is currently a learning/development project. Contributions welcome once we reach Milestone 5.

---

## License

[To be determined]

---

## Credits

Built with:
- [FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) - FFmpeg for browsers
- [React](https://react.dev/) - UI framework
- [Vite](https://vite.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - Styling

---

**Current Milestone:** Milestone 4 ✅
**Next Up:** Polish (multi-format testing, error states, performance)
**Target v1 Completion:** [TBD]
