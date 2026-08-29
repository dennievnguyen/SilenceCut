# Silence Cutter — Product Specification

**Build target:** Claude Code
**Platform:** Browser-based web app
**Processing:** Client-side (FFmpeg.wasm)
**Version:** 1.0

---

## 1. Product Summary

A single-page web app that lets a user drop in a video or audio file, automatically detects silent sections, and exports a trimmed version with the silence removed — in seconds, without uploading the file to a server.

- **Primary user:** Podcasters, YouTubers, course creators, and anyone editing raw recordings who wants to cut dead air without manually scrubbing a timeline.
- **Core promise:** Drop a file in, get a tighter cut out, in the time it takes to make coffee.
- **Out of scope for v1:** Multi-track editing, transcription/captions, cloud storage/accounts, collaborative editing, mobile native apps.

---

## 2. Format Support

The tool must accept all common video and audio container/codec combinations, and export the result in the **same container and codec as the input file by default**. The user should never have to think about format conversion — `input.mov` in, `output.mov` out, just shorter.

### 2.1 Video formats

| Container | Extensions | Video codec(s) | Notes |
|---|---|---|---|
| MP4 | .mp4, .m4v | H.264, H.265/HEVC | Primary target; broadest device support |
| QuickTime | .mov | H.264, H.265, ProRes* | ProRes re-encode only if libopenjpeg/prores unavailable in build |
| Matroska | .mkv | H.264, H.265, VP9 | Common for screen recordings |
| WebM | .webm | VP8, VP9, AV1 | Browser-native playback |
| AVI | .avi | Various (often MJPEG, H.264) | Legacy; re-mux to MP4 if codec unsupported in WASM build |
| MPEG-TS | .ts, .m2ts | H.264, H.265 | Common from cameras/drones |
| FLV | .flv | H.264 | Legacy streaming format |

\* ProRes encoding may be unavailable in some FFmpeg.wasm builds due to binary size constraints — see Section 7, Known Constraints.

### 2.2 Audio-only formats

| Format | Extensions | Codec(s) | Notes |
|---|---|---|---|
| WAV | .wav | PCM (uncompressed) | Lossless; large files |
| MP3 | .mp3 | MPEG Layer III | Universal compatibility |
| AAC / M4A | .m4a, .aac | AAC-LC | Common Apple ecosystem default |
| FLAC | .flac | FLAC (lossless) | Podcast/music production |
| OGG | .ogg, .oga | Vorbis, Opus | Open format |

### 2.3 Format-handling rules

- Detect the input container/codec on file load using ffprobe (bundled with FFmpeg.wasm) and store it as the default export target.
- If the exact input codec cannot be re-encoded by the available FFmpeg.wasm build, fall back to the closest supported codec in the same container, and clearly tell the user what changed and why.
- Let the user override the output format manually via an advanced/optional dropdown — same-format-out is the default behavior, not the only option.
- Reject unsupported files at the intake step with a specific error naming the detected format and explaining it isn't supported, rather than failing silently mid-process.

---

## 3. Core User Flow

1. User drags a file onto the page, or clicks to browse.
2. App reads file metadata (duration, format, resolution or sample rate) and displays it immediately.
3. App runs silence detection using default settings and renders a waveform with silent regions visually marked.
4. User can adjust threshold, minimum silence duration, and padding via sliders; the waveform's marked regions update live.
5. User clicks "Remove Silence." App builds the cut list, processes the file, and shows a progress indicator.
6. App displays before/after duration (e.g. "12:40 → 8:55, cut 30%") and a download button for the result, in the original format.

---

## 4. Detection & Editing Settings

These are the user-facing controls. Defaults are tuned for typical spoken-word content (podcasts, talking-head video, tutorials) — aggressive enough to feel automatic, conservative enough not to clip words.

| Parameter | Default | Range | Description |
|---|---|---|---|
| Silence threshold | -40 dB | -60 to -20 dB | Audio level below which a moment counts as silence. Lower (more negative) = stricter, catches only true silence. |
| Min silence duration | 0.4 s | 0.1 to 3.0 s | Silences shorter than this are ignored and left in place, to avoid choppy cuts on natural speech pauses. |
| Padding | 120 ms | 0 to 500 ms | Buffer kept before/after each cut boundary so words are not clipped. |
| Speed-up (optional) | Off | 1x to 8x | Alternative to hard cuts: speed up silent segments instead of removing them entirely (style popularized by Descript/Premiere auto-cut tools). |

---

## 5. Technical Architecture

### 5.1 Stack

- **Frontend:** static single-page app (vanilla JS or lightweight framework — React acceptable). No backend server required for core functionality.
- **Processing engine:** FFmpeg compiled to WebAssembly (ffmpeg.wasm or equivalent), running entirely in the user's browser via a Web Worker so the UI thread stays responsive.
- **File handling:** File System Access API where available (for large-file streaming) with a fallback to standard File/Blob APIs.
- No file ever leaves the user's device unless the user explicitly exports/shares it — this is a stated product principle, not just an implementation detail.

### 5.2 Processing pipeline

1. Probe input file (ffprobe): extract container, codec, duration, resolution/sample rate.
2. Run `silencedetect` audio filter to get a list of `[start, end]` silence intervals.
3. Apply min-duration filter: discard intervals shorter than the user's minimum silence duration setting.
4. Apply padding: shrink each remaining interval's start/end inward by the padding value, so the cut doesn't bite into adjacent speech.
5. Invert the silence intervals into a list of "keep" segments (the non-silent parts, plus padding).
6. Build an FFmpeg filter graph (trim + concat, or segment muxer) that stitches the keep segments together.
7. Encode the output using the same codec/container as the input (or the user-selected override) and hand back a downloadable Blob.

### 5.3 Performance considerations

- Re-running detection when settings change should **not** re-decode the full file — cache the decoded audio waveform/levels from the first pass and re-threshold against cached data.
- For files above roughly 500MB or 30 minutes, show an upfront warning that in-browser processing may be slow, and suggest trimming the file first or processing in chunks.
- Process detection on a downsampled/mono copy of the audio track for speed; only the final cut/encode step needs to touch full-quality data.

---

## 6. UI Requirements

### 6.1 Layout

- Upload zone doubles as the waveform display once a file is loaded — no separate "upload page" then "editor page" transition.
- Silent regions are visually distinct on the waveform (e.g. dimmed/shaded) and update live as sliders move.
- Settings (threshold, min duration, padding) are visible alongside the waveform at all times during editing, not buried in a modal.
- Before/after duration and "% removed" are shown prominently after processing — this is the headline result the user came for.

### 6.2 States to design for

- Empty state (no file loaded) — clear call to action, list of supported formats.
- File loading / probing.
- Detecting silence (may take a few seconds on longer files).
- Ready to edit (waveform + settings visible).
- Processing / exporting (progress bar with time estimate if feasible).
- Done (result ready, download button, before/after stats).
- Error (see 6.3).

### 6.3 Error states

| Condition | Required behavior |
|---|---|
| Unsupported file format | Name the detected format; state plainly it isn't supported; point to the supported-formats list. |
| File has no audio track | Explain that silence detection needs an audio track; offer to just pass the video through unchanged. |
| No silence detected at current settings | State this plainly and suggest loosening the threshold or minimum duration — don't fail, just report zero cuts. |
| Browser lacks WASM/SharedArrayBuffer support | Detect on load; show a clear message naming the missing capability and recommend an updated browser. |
| Processing fails mid-job | Allow cancel; on failure, state what step failed and offer retry without re-uploading the file. |

---

## 7. Known Constraints

- FFmpeg.wasm binary size limits which codecs are built in by default — confirm ProRes, HEVC, and AV1 support in the chosen build before committing to the full format matrix in Section 2; document any gaps found.
- In-browser processing speed depends on the user's device. There is no server fallback in v1 — this is a stated tradeoff in exchange for privacy and zero hosting cost (see Section 9).
- Safari has historically lagged Chrome/Firefox on SharedArrayBuffer and WASM threading support — verify current behavior before launch and document any Safari-specific limitations to the user.
- Very long files (1hr+) may exceed practical in-browser memory limits; Milestone 5 should include a defined maximum recommended file size/duration based on real testing, not a guess.

---

## 8. Build Milestones

| Phase | Scope | Exit criteria |
|---|---|---|
| 0 | Project scaffold: static site shell, FFmpeg.wasm loaded and verified working in-browser with a hardcoded test file. | Console logs FFmpeg version; no UI yet. |
| 1 | File intake: drag-and-drop + file picker, format validation against the support matrix, metadata read (duration, codec, container, resolution/sample rate). | Any supported file can be dropped and its metadata displayed. |
| 2 | Silence detection: run ffmpeg `silencedetect` filter, parse stdout into a list of silence intervals, render as an interactive waveform with highlighted regions. | Detected silences visibly match what the user hears on scrubbing. |
| 3 | Settings panel: threshold/min-duration/padding controls wired to live re-detection without re-decoding the whole file. | Adjusting a slider updates highlighted regions in under 1s for a 10-minute file. |
| 4 | Cut + export: build the trim/concat filter graph, encode, and export in the SAME container and codec as the input by default. | Round-trip test: `input.mp4` in, `output.mp4` out, plays in QuickTime/VLC, silence is gone. |
| 5 | Polish: progress UI, error states, cancel mid-job, before/after duration display, multi-format regression test across the full support matrix. | All formats in the matrix pass the round-trip test in milestone 4. |

---

## 9. Product Principles (do not compromise on these)

- **Privacy by default:** files are processed on-device and never uploaded, and this is communicated to the user, not just true under the hood.
- **Same format in, same format out:** the user should not need to know or care about codecs to get a result in the format they expect.
- **Fast feels automatic, but stays adjustable:** defaults should work with zero configuration; settings should be one click away, not hidden.
- **Honest about limits:** if a file is too large, a format isn't supported, or no silence was found, say so plainly rather than failing quietly or guessing.