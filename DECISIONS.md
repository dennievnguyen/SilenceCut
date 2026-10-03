# Engineering & Design Decisions Log

This document tracks all significant design and engineering decisions made during the development of Silence Cutter, with rationale for learning purposes.

---

## Milestone 0: FFmpeg.wasm Integration

### Decision 1: React + TypeScript + Vite
**Date:** 2026-06-30
**Status:** ✅ Implemented

**Decision:**
Use React with TypeScript and Vite as the build tool, rather than vanilla JavaScript.

**Rationale:**
- **React:** While specs say "vanilla JS or lightweight framework acceptable," React provides:
  - Better state management for complex UI interactions (waveform updates, settings changes)
  - Component reusability (will need multiple components for upload, waveform, settings, export)
  - Easier testing and maintenance as project grows
  - Strong TypeScript integration

- **TypeScript:** Adds type safety for:
  - FFmpeg.wasm API interactions (helps catch errors early)
  - File format handling (container/codec combinations)
  - Complex state management (silence intervals, segment timing)

- **Vite:**
  - Fastest build tool currently available
  - Excellent HMR (Hot Module Replacement) for development speed
  - Built-in support for modern web features
  - Much faster than Create React App

**Tradeoffs:**
- Slightly larger bundle size than vanilla JS (but still <100KB gzipped)
- Learning curve if developer is unfamiliar with React (mitigated by clear component structure)

**Alternatives Considered:**
- Vanilla JS: Too verbose for the complex state management needed
- Next.js: Overkill - no SSR/routing needed for single-page app
- Svelte: Would work but React has better ecosystem for this use case

---

### Decision 2: Tailwind CSS for Styling
**Date:** 2026-06-30
**Status:** ✅ Implemented

**Decision:**
Use Tailwind CSS utility-first framework for all styling.

**Rationale:**
- **Rapid development:** No need to write custom CSS classes, just compose utilities
- **Consistency:** Design tokens (colors, spacing, etc.) are consistent across the app
- **Performance:** PurgeCSS automatically removes unused styles in production
- **Responsive design:** Built-in responsive utilities make mobile support easier
- **Dark mode:** Built-in dark mode support (important for video editors who prefer dark UIs)

**Tradeoffs:**
- HTML classes can get verbose (mitigated by extracting components)
- ~50KB base size (but purged to ~10KB in production for our use case)

**Alternatives Considered:**
- Plain CSS: Too slow to iterate
- CSS Modules: Good but more boilerplate
- Styled-components: Runtime CSS-in-JS has performance overhead

**Implementation Details:**
```bash
npm install -D tailwindcss postcss autoprefixer @tailwindcss/postcss
```

```javascript
// postcss.config.js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

**Note:** Tailwind v4+ requires `@tailwindcss/postcss` instead of the old `tailwindcss` PostCSS plugin. This is a breaking change from v3.

---

### Decision 3: CORS Headers for SharedArrayBuffer
**Date:** 2026-06-30
**Status:** ✅ Implemented

**Decision:**
Configure Vite dev server with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers.

**Rationale:**
- **Required for FFmpeg.wasm:** Modern browsers require these headers to enable SharedArrayBuffer
- **Performance:** SharedArrayBuffer enables multi-threaded WASM, making FFmpeg significantly faster
- **Security:** These headers provide isolation from cross-origin resources
- **Spec requirement:** Section 7 mentions SharedArrayBuffer support is critical

**Implementation:**
```typescript
// vite.config.ts
server: {
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  },
}
```

**Production Deployment:**
- Must configure hosting provider (Vercel, Netlify, etc.) to send these headers
- Will document in deployment guide when reaching Milestone 5

**Browser Compatibility:**
- Chrome 92+: ✅
- Firefox 90+: ✅
- Safari 15.2+: ✅ (but historically problematic - see Decision 4)

---

### Decision 4: FFmpeg.wasm Version & CDN Loading
**Date:** 2026-06-30
**Status:** ✅ Implemented

**Decision:**
Use `@ffmpeg/ffmpeg` v0.12.15 (latest stable) and load core files from unpkg.com CDN.

**Rationale:**
- **Version 0.12.x:** Latest stable branch with best codec support
- **CDN loading:** FFmpeg core files are large (~30MB), loading from CDN:
  - Keeps our build bundle small
  - Leverages browser caching across sites
  - Faster initial page load (core loads async in background)

**Codec Support Verified:**
- ✅ H.264/H.265 encoding (MP4, MOV)
- ✅ VP8/VP9 (WebM)
- ⚠️ ProRes: Need to verify (may require custom build - see Milestone 6)
- ✅ AAC, MP3, Opus audio codecs

**Loading Strategy:**
```typescript
const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
await ffmpegRef.load({
  coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
  wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
});
```

**Tradeoffs:**
- Requires internet connection (acceptable for web app)
- CDN availability dependency (unpkg.com is very reliable)
- Could self-host in future if needed

**Alternatives Considered:**
- Bundle core files: 30MB+ in bundle is too large
- Self-host: Adds hosting complexity, decided to defer until needed

---

### Decision 5: Web Worker for FFmpeg Processing
**Date:** 2026-06-30
**Status:** ✅ Satisfied by the library (2026-10-02). `@ffmpeg/ffmpeg` 0.12 already runs the core in its own Web Worker, so no custom worker is needed. Cancelling uses `ffmpeg.terminate()`, then reloads the core.

**Decision:**
Run FFmpeg operations in a Web Worker to keep UI thread responsive.

**Rationale:**
- **Spec requirement:** Section 5.1 explicitly requires Web Worker
- **User experience:** Video processing is CPU-intensive - blocking main thread would freeze UI
- **Progress updates:** Worker can post messages for progress bars
- **Cancellation:** Worker can be terminated if user cancels operation

**Implementation Plan:**
```typescript
// ffmpeg.worker.ts - separate worker file
// main thread - App.tsx
const worker = new Worker(new URL('./ffmpeg.worker.ts', import.meta.url));
```

**Status:** Not implemented in Milestone 0 (just verification), will implement in Milestone 2 when we start actual processing.

---

### Decision 6: FFmpeg Initialization UI
**Date:** 2026-06-30
**Status:** ✅ Implemented

**Decision:**
Show detailed loading status with console logs during FFmpeg initialization, not just a spinner.

**Rationale:**
- **Transparency:** User can see what's happening (builds trust)
- **Debugging:** If loading fails, logs help diagnose the issue
- **Education:** Shows users the app is processing client-side (privacy principle)
- **Milestone 0 requirement:** Spec says "console logs FFmpeg version"

**UI Components:**
1. Status indicator (loading/loaded/error with colored dot)
2. FFmpeg version display
3. Live console output window
4. Checklist showing Milestone 0 completion

**Next Milestones:**
- This verbose logging will be hidden by default in production
- Keep available in "advanced" or "debug" mode

---

### Decision 7: No Backend for v1
**Date:** 2026-06-30
**Status:** ✅ Decided

**Decision:**
Do not use Supabase or any backend for v1, despite it being available.

**Rationale:**
- **Spec requirement:** Section 5.1: "No backend server required for core functionality"
- **Product principle:** "Privacy by default - files never uploaded" (Section 9)
- **Zero hosting cost:** Static site is free to host
- **Simplicity:** No server = fewer failure points

**Future Considerations:**
Could use Supabase later for:
- User accounts / saved presets (v2 feature)
- Usage analytics (privacy-respecting)
- File sharing links (optional, user-initiated)

But v1 must work 100% offline after initial page load.

---

### Decision 8: File System Access API Strategy
**Date:** 2026-06-30
**Status:** 🔄 Planned for Milestone 1

**Decision:**
Use File System Access API for large files (>500MB) with fallback to standard File API.

**Rationale:**
- **Performance:** File System Access API allows streaming, doesn't load entire file into memory
- **Large files:** Section 5.3 mentions files up to 1hr+ need special handling
- **Progressive enhancement:** Fallback ensures app works in all browsers

**Browser Support:**
- Chrome/Edge: ✅ File System Access API
- Firefox/Safari: ❌ Use File API fallback

**Implementation Plan (Milestone 1):**
```typescript
if ('showOpenFilePicker' in window) {
  // Use File System Access API
} else {
  // Fallback to <input type="file">
}
```

---

### Decision 9: Error Handling Philosophy
**Date:** 2026-06-30
**Status:** ✅ Implemented

**Decision:**
Show clear, specific error messages that explain what went wrong and what to do next.

**Rationale:**
- **Product principle:** "Honest about limits" (Section 9)
- **User trust:** Vague errors frustrate users
- **Debugging:** Specific errors help users self-solve

**Examples:**
- ❌ Bad: "Error loading FFmpeg"
- ✅ Good: "Failed to load FFmpeg: Your browser doesn't support SharedArrayBuffer. Please update to Chrome 92+, Firefox 90+, or Safari 15.2+"

**Error Categories (from Spec Section 6.3):**
1. Unsupported format → Name format, link to supported list
2. No audio track → Explain detection needs audio, offer pass-through
3. No silence detected → Suggest loosening settings
4. Browser incompatibility → Name missing capability, suggest browser update
5. Processing failure → State step that failed, offer retry

---

## Intake & Stability Fixes (2026-10-02)

### Decision 10: Parse ffmpeg stream lines with optional fields
**Date:** 2026-10-02
**Status:** ✅ Implemented

**Decision:**
Parse each `Stream #...: Video:/Audio:` line on its own and require only the codec. Treat bitrate, fps, resolution, and channel layout as optional.

**Rationale:**
- The old single regex required `kb/s` on audio lines and `fps` on video lines. ffmpeg omits bitrate for FLAC and Opus, and fps for variable-frame-rate video. FLAC and WebM files were rejected as "no audio track", and VFR video was treated as audio-only.
- `(attached pic)` streams (MP3/M4A cover art) are skipped so audio files aren't classified as video.
- Unit tests use real `ffmpeg -i` output as fixtures, so parser changes are checked against what ffmpeg actually prints.

### Decision 11: Cancellable jobs via job IDs + terminate
**Date:** 2026-10-02
**Status:** ✅ Implemented

**Decision:**
Every file selection or removal bumps a job ID. Async steps check it after each `await` and drop stale results. Removing a file mid-processing calls `ffmpeg.terminate()` and reloads the core from cached blob URLs. Each job's input file in ffmpeg's virtual filesystem gets a unique name.

**Rationale:**
Removing a file during detection used to let the old job finish and write its results over the cleared state. Unique filenames stop an old job's cleanup from deleting a newer job's input.

### Decision 12: Add Vitest
**Date:** 2026-10-02
**Status:** ✅ Implemented

**Decision:**
Use Vitest (`npm test`) for unit tests of pure logic: metadata parsing, silence detection, padding, and waveform peaks.

**Rationale:**
It shares Vite's config and TypeScript setup with no extra build step. The parsing bugs fixed today would have been caught by tests built from real ffmpeg output.

---

## Milestone 3: Settings Panel

### Decision 13: Decode once, detect silence in JS
**Date:** 2026-10-02
**Status:** ✅ Implemented

**Decision:**
ffmpeg decodes each file once to an 8 kHz mono 16-bit PCM copy (`-vn -ac 1 -ar 8000 -f s16le`). Silence detection (`src/silence.ts`) and the waveform both run on that copy. ffmpeg's `silencedetect` is no longer used.

**Rationale:**
- **Spec 5.3:** "cache the decoded audio... and re-threshold against cached data" and "process detection on a downsampled/mono copy."
- **Speed:** re-detection takes ~30 ms in Node and ~60 ms end-to-end in the browser for a 10-minute file, against the Milestone 3 exit criterion of under 1 s. A 60-minute file takes ~150 ms.
- **Accuracy:** on synthesized speech it found the same regions as `silencedetect` on the full-rate stereo file, with boundaries within ~80 ms. That's below the default 120 ms padding.
- **Memory:** the copy is ~16 KB per second (~58 MB per hour). The previous waveform path decoded the whole file to full-rate floats with `decodeAudioData`, which also couldn't read MKV.

**Algorithm:** mirrors `silencedetect`. A run of samples with |level| < 10^(dB/20) × 32768 lasting at least the minimum duration counts as silence, including silence that runs to the end of the file.

**Tradeoffs:**
Downmixing to mono means a silent channel next to a loud one isn't detected as silence. `silencedetect`'s default mode behaves the same way, and it's fine for spoken-word content.

### Decision 14: Padding semantics
**Date:** 2026-10-02
**Status:** ✅ Implemented

**Decision:**
Shrink each silence interval inward by the padding on both sides (spec 5.2 step 4). Edges touching the start or end of the file aren't padded, since there's no speech there to protect. Intervals that padding shrinks to nothing are dropped. The waveform shades the padded intervals, i.e. what will actually be cut.

### Decision 15: Deferred re-detection
**Date:** 2026-10-02
**Status:** ✅ Implemented

**Decision:**
Detected regions are derived state (`useMemo` over the cached samples and settings), using `useDeferredValue` on the settings.

**Rationale:**
Sliders stay smooth on long files: React renders the slider position immediately and catches detection up in the background. There's no separate interval state to keep in sync.

### Decision 16: Settings persist across files
**Date:** 2026-10-02
**Status:** ✅ Implemented (open to revisit)

**Decision:**
Slider values carry over when a new file is loaded, and "Reset to defaults" restores the spec defaults.

**Rationale:**
Users processing a batch of similar recordings (e.g. a podcast series) usually want the same tuning.

---

### Decision 17: Default threshold -35 dB
**Date:** 2026-10-03
**Status:** ✅ Implemented

**Decision:**
The default silence threshold moves from -40 dB to -35 dB. The presets are unchanged, so "Home recording" (-40 dB) no longer matches the defaults.

**Rationale:**
Product call. Less strict, so quiet room tone counts as silence and gets cut out of the box.

---

## Milestone 4: Cut & Export

### Decision 18: Re-encode through trim + concat, not stream copy
**Date:** 2026-10-03
**Status:** ✅ Implemented (filter graph); export wiring in progress

**Decision:**
Cut with a `-filter_complex` graph: one `trim`/`atrim` per keep segment, timestamps reset, then a single `concat`. This re-encodes the output.

**Alternatives considered:**
- **Stream copy (`-c copy` with segment seeks):** much faster, no quality loss, but can only cut on keyframes. With typical 2–10 s GOPs, cuts land up to seconds away from the detected boundary, which clips words or leaves silence in. That breaks the "don't clip words" promise in SPECS.md §4.
- **`select`/`aselect` with `between()` expressions:** one filter instead of N, but the expression grows just as long and is harder to debug.

**Tradeoff:**
Re-encoding video in single-threaded wasm is slow. Audio-only files are cheap. This is the main reason to revisit the multi-threaded core after Milestone 4.

**Details:**
- `keepSegments()` (src/silence.ts) drops slivers under 20 ms between cuts.
- `buildCutFilterGraph()` (src/cut.ts) writes timestamps to the millisecond.
- H.264 uses `-preset ultrafast -crf 20`. With `veryfast`, a 5:54 1080p Canon MP4 (1.29 GB, 85 segments) took 26 min 13 s to export (3:28 out, 76.2 MB, quality judged fine). Switched to `ultrafast` on 2026-10-03 to trade file size for speed. Same file and settings: **644.6 s (10 min 45 s), 2.4× faster**, 179.3 MB out (~6.9 Mbps). Export now takes ~1.8× the input's length on 1080p.

---

## Codec Support Matrix (To Be Documented)

**Status:** 🔄 In Progress

Testing each format from spec Section 2 to verify FFmpeg.wasm build supports it:

### Video Codecs
- [ ] H.264 (MP4, MOV, MKV) - **High Priority**
- [ ] H.265/HEVC - **High Priority**
- [ ] VP9 (WebM, MKV)
- [ ] VP8 (WebM)
- [ ] AV1 (WebM, MP4)
- [ ] ProRes (MOV) - **May require custom build**
- [ ] MJPEG (AVI)

### Audio Codecs
- [ ] AAC (MP4, M4A) - **High Priority**
- [ ] MP3
- [ ] Opus (WebM, OGG)
- [ ] Vorbis (OGG)
- [ ] FLAC
- [ ] PCM (WAV)

**Next Step:** Create test files and run encoding test for each format (Milestone 1-2).

---

## Performance Benchmarks (In Progress)

Will track processing times for different file sizes:
- 5min H.264 1080p video
- 30min podcast audio (MP3)
- 1hr screen recording (VP9)

Target: <30 seconds for 10-minute 1080p video on modern laptop.

### Collected so far

| Date | Input | Step | Result | Environment |
|---|---|---|---|---|
| 2026-08-29 | 648 MB / 3 min video | Silence detection (after the `-vn` and single-copy fixes) | 5+ min → ~30 s | Chrome, single-thread core |
| 2026-10-02 | 9.6 min speech WAV (44.1 kHz stereo, 102 MB) | Load + one-pass decode to 8 kHz mono | 3.2 s | Headless Chrome, single-thread core |
| 2026-10-02 | Same file | Re-detect on slider change | 55–66 ms | Headless Chrome |
| 2026-10-02 | 10 min / 60 min synthetic speech PCM | `detectSilence` + `applyPadding` | ~30 ms / ~150 ms | Node 24 |

Still to measure: compressed video (H.264 1080p, VP9) and export times (Milestone 4). The `@ffmpeg/core-mt` multi-threaded core is a deferred follow-up for further decode speedup.

---

*This document will be updated as development progresses through each milestone.*
