# Codec Support Testing Results

This document tracks which codecs are supported by the FFmpeg.wasm build we're using, based on actual testing.

**FFmpeg.wasm Version:** @ffmpeg/core@0.12.6
**Last Updated:** 2026-06-30

---

## Testing Methodology

For each format listed in SPECS.md Section 2, we will:
1. Create or obtain a small test file in that format
2. Attempt to process it through FFmpeg.wasm
3. Verify the output maintains quality and format
4. Document any limitations or fallbacks needed

---

## Video Container & Codec Support

### MP4 Container
| Codec | Status | Notes |
|-------|--------|-------|
| H.264 | 🔄 Testing | Primary target, highest priority |
| H.265/HEVC | 🔄 Testing | May have licensing constraints in browser builds |

### QuickTime MOV Container
| Codec | Status | Notes |
|-------|--------|-------|
| H.264 | 🔄 Testing | - |
| H.265/HEVC | 🔄 Testing | - |
| ProRes | ⚠️ Unknown | Spec notes this may be unavailable in WASM builds due to size |

### Matroska MKV Container
| Codec | Status | Notes |
|-------|--------|-------|
| H.264 | 🔄 Testing | Common for screen recordings |
| H.265/HEVC | 🔄 Testing | - |
| VP9 | 🔄 Testing | - |

### WebM Container
| Codec | Status | Notes |
|-------|--------|-------|
| VP8 | 🔄 Testing | Older codec, good browser support |
| VP9 | 🔄 Testing | Modern, efficient codec |
| AV1 | 🔄 Testing | Newest codec, may have encode performance issues |

### Legacy Formats
| Format | Status | Notes |
|--------|--------|-------|
| AVI | 🔄 Testing | Spec suggests re-mux to MP4 if codec unsupported |
| MPEG-TS (.ts, .m2ts) | 🔄 Testing | Camera/drone footage format |
| FLV | 🔄 Testing | Legacy streaming format |

---

## Audio-Only Format Support

| Format | Codec | Status | Notes |
|--------|-------|--------|-------|
| WAV | PCM | 🔄 Testing | Lossless, large files |
| MP3 | MPEG Layer III | 🔄 Testing | Universal compatibility |
| M4A | AAC-LC | 🔄 Testing | Apple ecosystem default |
| FLAC | FLAC | 🔄 Testing | Lossless, podcast/music production |
| OGG | Vorbis | 🔄 Testing | Open format |
| OGG | Opus | 🔄 Testing | Modern, efficient for speech |

---

## Known Limitations (From Spec Section 7)

### 1. Binary Size Constraints
FFmpeg.wasm has size limits that affect which codecs can be included:
- **ProRes:** Likely excluded due to large encoder size
- **HEVC/H.265:** May be excluded in some builds due to licensing/size
- **AV1:** Encoding may be very slow even if available

**Mitigation Strategy:**
- Test each codec on app load
- Document which are available in current build
- Provide clear error messages if user uploads unsupported format
- Consider custom FFmpeg.wasm build for production if critical codecs missing

### 2. Browser-Specific Issues (Section 7)
- **Safari:** Historically lagged on SharedArrayBuffer/WASM threading
  - Minimum version: Safari 15.2+
  - May have slower performance than Chrome/Firefox
- **Firefox:** Generally good support
- **Chrome:** Best support and performance

### 3. Performance Constraints
- **Large files (1hr+):** May exceed browser memory limits
- **4K video:** Encoding may be very slow
- **Recommended limits (to be tested):**
  - Max file size: 2GB
  - Max duration: 2 hours
  - Max resolution: 1080p (for reasonable processing time)

---

## Test Files Needed

To complete testing, we need small sample files (~10 seconds each) in:

**High Priority:**
- [ ] MP4/H.264 (most common format)
- [ ] MP3 audio
- [ ] M4A/AAC audio
- [ ] MOV/H.264

**Medium Priority:**
- [ ] WebM/VP9
- [ ] MKV/H.264
- [ ] WAV/PCM
- [ ] FLAC

**Low Priority:**
- [ ] MP4/HEVC
- [ ] MOV/ProRes (expect failure)
- [ ] AVI
- [ ] FLV
- [ ] OGG/Vorbis
- [ ] OGG/Opus

---

## Fallback Strategy (Spec Section 2.3)

When a codec is not supported:

1. **Detect** input format using ffprobe
2. **Check** if codec is available in our build
3. **If unsupported:**
   - Show clear error message naming the format
   - Suggest closest supported alternative
   - Example: "ProRes encoding not available. Re-encode to H.264 MP4? (smaller file, wide compatibility)"
4. **Allow user override** via advanced settings dropdown

---

## Next Steps

1. ✅ Document methodology (this file)
2. ⏳ Gather test files for each format
3. ⏳ Create automated test suite
4. ⏳ Run tests and update this document with results
5. ⏳ Implement fallback logic in app
6. ⏳ Document any limitations in user-facing UI

**Target Completion:** End of Milestone 1 (after file intake is working)

---

*This document will be updated as we test each codec/format combination.*
