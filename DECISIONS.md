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
**Status:** 🔄 Planned for Milestone 2

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

## Next Milestone: File Intake (Milestone 1)

**Planned Decisions:**
1. Drag-and-drop library vs native API
2. File validation strategy (reject early vs attempt processing)
3. Metadata display format
4. Preview generation approach

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

## Performance Benchmarks (To Be Collected)

Will track processing times for different file sizes:
- 5min H.264 1080p video
- 30min podcast audio (MP3)
- 1hr screen recording (VP9)

Target: <30 seconds for 10-minute 1080p video on modern laptop.

---

*This document will be updated as development progresses through each milestone.*
