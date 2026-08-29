# Troubleshooting Guide

Common issues and their solutions for Silence Cutter development.

---

## Tailwind CSS PostCSS Error

**Error Message:**
```
[postcss] It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin.
The PostCSS plugin has moved to a separate package, so to continue using Tailwind CSS
with PostCSS you'll need to install `@tailwindcss/postcss`
```

**Cause:**
Tailwind CSS v4+ changed how the PostCSS plugin works. The old `tailwindcss` plugin no longer works directly.

**Solution:**
1. Install the new plugin:
```bash
npm install -D @tailwindcss/postcss
```

2. Update `postcss.config.js`:
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},  // Changed from 'tailwindcss'
    autoprefixer: {},
  },
}
```

3. Restart the dev server:
```bash
# Stop the current server (Ctrl+C)
npm run dev
```

**Status:** ✅ Fixed in current codebase

---

## SharedArrayBuffer Not Available

**Error Message:**
```
SharedArrayBuffer is not defined
```

**Cause:**
Browser security requirements. SharedArrayBuffer requires specific CORS headers to be enabled.

**Solution:**
Already configured in `vite.config.ts`:
```typescript
server: {
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  },
}
```

**For Production Deployment:**
Ensure your hosting provider sends these headers. Examples:

**Vercel** - Create `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

**Netlify** - Create `_headers`:
```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
```

---

## FFmpeg.wasm Loading Fails

**Error Message:**
```
Failed to load FFmpeg
```

**Possible Causes & Solutions:**

### 1. Network Issues
FFmpeg core loads from CDN (unpkg.com). Check:
- Internet connection is active
- unpkg.com is not blocked by firewall/proxy
- Browser DevTools Network tab shows 200 status for ffmpeg-core files

### 2. Browser Compatibility
Minimum browser versions:
- Chrome 92+
- Firefox 90+
- Safari 15.2+

Check: `chrome://version` or equivalent

### 3. CORS Headers Not Set
See "SharedArrayBuffer Not Available" section above.

### 4. Adblocker Interference
Some adblockers block WebAssembly. Try:
- Disable adblocker for localhost
- Whitelist unpkg.com

---

## TypeScript Errors

**Error:** Cannot use JSX unless the '--jsx' flag is provided

**Solution:**
Ensure `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2023", "DOM", "DOM.Iterable"]
  }
}
```

**Status:** ✅ Already configured

---

## Vite Build Errors

**Error:** Module not found / Cannot resolve

**Solutions:**

1. Clear node_modules and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

2. Clear Vite cache:
```bash
rm -rf node_modules/.vite
npm run dev
```

3. Check imports use correct file extensions:
```typescript
import App from './App.tsx'  // ✅ Include .tsx
import App from './App'       // ❌ May cause issues
```

---

## React Hook Errors

**Error:** "Rendered more hooks than during the previous render"

**Cause:**
Conditional hooks or hooks in callbacks.

**Solution:**
Always call hooks at the top level:
```typescript
// ❌ Wrong
if (condition) {
  const [state, setState] = useState(false);
}

// ✅ Correct
const [state, setState] = useState(false);
if (condition) {
  // Use state here
}
```

---

## Performance Issues

### Slow FFmpeg Loading

**Expected:** 2-3 seconds on fast connection

**If slower:**
- Check Network tab in DevTools
- FFmpeg core is ~30MB total
- Consider self-hosting core files if CDN is slow in your region

### High Memory Usage

**Normal:** ~100-200MB for FFmpeg core

**If higher:**
- Check for memory leaks in React components
- Ensure FFmpeg instance is cleaned up when component unmounts
- Large files will use more memory (expected)

---

## Development Workflow Issues

### Hot Reload Not Working

1. Check console for errors
2. Restart dev server
3. Clear browser cache
4. Check if file is in `src/` directory (only those are watched)

### Port Already in Use

**Error:** Port 5173 is already in use

**Solution:**
```bash
# Find process using port 5173
lsof -ti:5173 | xargs kill -9

# Or use different port
npm run dev -- --port 3000
```

---

## Browser Console Errors

### "Failed to fetch dynamically imported module"

**Cause:** Vite HMR can sometimes break during development

**Solution:**
Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

### CORS errors on production

**Cause:** Assets loaded from different origin

**Solution:**
Ensure all assets are served from same origin, or configure CORS headers

---

## Testing Issues

### Cannot test in production build locally

**Wrong:**
```bash
npm run build
# Open dist/index.html directly - WON'T WORK
```

**Correct:**
```bash
npm run build
npm run preview  # Serves with proper headers
```

**Why:** SharedArrayBuffer requires HTTPS or localhost with headers

---

## Getting Help

If you encounter an issue not listed here:

1. **Check browser console** - Most errors show here first
2. **Check terminal** - Build/server errors appear here
3. **Check GitHub issues** - Both for this project and FFmpeg.wasm
4. **Review DECISIONS.md** - Understand why things are set up this way

### Useful Commands

```bash
# Clear everything and start fresh
rm -rf node_modules package-lock.json dist
npm install
npm run dev

# Check what's actually installed
npm list @ffmpeg/ffmpeg
npm list tailwindcss

# Verify Node version (need 18+)
node --version

# Check TypeScript config
npx tsc --showConfig
```

---

## Known Limitations (Not Bugs)

See SPECS.md Section 7 for product limitations:
- Large files (1hr+) may be slow
- ProRes may not be supported
- Safari has historically been slower
- In-browser processing is device-dependent

These are expected tradeoffs for client-side processing.

---

*Last updated: 2026-06-30*
