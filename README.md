# Silence Cutter 🎬✂️

A browser-based video/audio editor that automatically detects and removes silent sections from your recordings — without uploading files to any server.

**Current Status:** 🏗️ Milestone 2 Complete - Silence Detection & Waveform Verified

---

## What is this?

Silence Cutter is a single-page web app designed for podcasters, YouTubers, and content creators who want to remove dead air from their recordings quickly without manual timeline editing.

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
- [x] Run FFmpeg silencedetect filter
- [x] Parse silence intervals
- [x] Render interactive waveform
- [x] Highlight silent regions

### 🔄 Milestone 3: Settings Panel (NEXT)
- [ ] Threshold slider (-60 to -20 dB)
- [ ] Min duration slider (0.1 to 3.0s)
- [ ] Padding control (0 to 500ms)
- [ ] Live waveform updates (no re-processing)

### ✂️ Milestone 4: Cut & Export
- [ ] Build FFmpeg trim/concat filter graph
- [ ] Process video with silence removed
- [ ] Export in same format as input
- [ ] Download button

### 💅 Milestone 5: Polish
- [ ] Progress indicators
- [ ] Error state handling
- [ ] Before/after duration stats
- [ ] Multi-format testing
- [ ] Performance optimization

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

- **Frontend:** React 18 + TypeScript
- **Styling:** Tailwind CSS
- **Build Tool:** Vite
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
- Cached audio waveform (no re-decoding when adjusting settings)
- Downsampled audio for detection (faster processing)

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

**Current Milestone:** Milestone 2 ✅
**Next Up:** Settings panel (threshold, min duration, padding)
**Target v1 Completion:** [TBD]
