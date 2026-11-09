# Desktop packaging — optional path and tradeoffs

**Recommendation:** keep the browser build as the primary target for now. Treat a desktop app as a **distribution wrapper**, not a platform rewrite and not a promised performance fix. Revisit the decision when distribution, offline play, or storefront requirements become real; do not switch only because frame rate is uneven.

## What a desktop wrapper would and would not fix

A desktop shell can improve **consistency**:

- Bundling one Chromium version removes browser-to-browser WebGL, timer, pointer-lock, and focus differences.
- The app can request GPU acceleration and disable background throttling on its own terms.
- It enables offline distribution, native window/fullscreen behavior, and storefront packaging.
- It avoids users needing to trust a locally served certificate.

A desktop shell does **not** remove the expensive parts of this game:

- Three.js still renders the same scene, at the same internal resolution, with the same number of draw calls and the same second HUD viewport pass.
- The simulation still runs the same enemy AI, projectiles, particles, and fixed-step update.
- GPU driver quality, thermal limits, and display refresh still determine real frame rate.
- A large wrapper download and its own update/security lifecycle are new costs.

The measured browser results already sit at roughly one frame below a 60 Hz display’s reportable value (59.9 FPS in Chrome and Edge, 58.5 FPS in Firefox on the recorded reference machine). That pattern is consistent with timer quantization and near-vsync pacing, not with an obviously CPU-bound renderer. A desktop wrapper would not automatically raise it above 60 and cannot be used as evidence that it does.

## Options

| Option | Advantages | Costs / risks | Fit for spACE |
| --- | --- | --- | --- |
| **Keep browser-first (current)** | Zero install, instant updates, existing Playwright coverage, same save format, lowest maintenance | Browser GPU/driver variance, pointer-lock and focus differences, certificate/HTTPS friction for local-only play | Best default while the game is still being balanced and playtested |
| **Electron wrapper** | Bundled Chromium matches the primary test engine, predictable WebGL and pointer lock, offline play, straightforward packaging | Large download, Chromium security updates become the project’s responsibility, still same render cost | Best low-risk desktop option if distribution becomes a requirement |
| **Tauri wrapper** | Much smaller binary, system WebView, native shell | WebView differs by OS; Linux WebKitGTK WebGL behavior is not equivalent to Chromium; more cross-platform graphics testing | Viable only after per-platform WebGL validation |
| **Native rewrite** | Long-term control over renderer and platform integration | Throws away the current web codebase and test suite; large scope increase | Not justified for this prototype |

## Concrete Electron path if requested later

1. **Keep `dist/` as the product.** The Vite build remains the single source of truth; the desktop shell only loads it.
2. **Add a minimal main process and preload.** Load `dist/index.html`, keep `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`, disable in-app navigation, and retain the existing CSP.
3. **Window behavior.** Set a 1280×720 default window, allow fullscreen, enable `backgroundThrottling: false` only while flying, and keep pause-on-focus-loss so input is not lost.
4. **Persistence.** `localStorage` continues to work under the packaged origin. Add the existing export/import flow as the migration tool before changing origins, and keep save validation and backups unchanged.
5. **Package and sign.** Use `electron-builder` for Windows, macOS, and Linux, add code signing/notarization where required, and plan auto-update separately from gameplay work.
6. **Test the packaged app.** Reuse the Playwright functional suite against the web build, then add a packaged-app smoke test for launch, save, flight, and quit.
7. **Measure before claiming.** Run the built-in 60-second benchmark in the packaged app and record GPU, preset, internal resolution, and browser/Electron version exactly as the web evidence does.

## Browser performance work already in place

- The lit 3D guide viewport renders every other frame and reuses cached bounds until resize.
- Enemy orbit/aim and guidance calculations reuse scratch vectors instead of allocating per frame.
- HUD updates return early outside active flight; menu states do not perform target projections or flight-HUD writes.
- Survival skill-data DOM serialization is cached instead of rewritten every frame.
- Opt-in **AUTO** quality starts at 640p and steps down once to 480p after three consecutive seconds below roughly 52 FPS; manual presets never change themselves.

Remaining browser-side opportunities are scene-level: draw-call/instancing review, light/shadow cost, asteroid count, particle limits, and the second guide viewport. Each should be measured against the same benchmark before being claimed as an improvement.

## Decision rule

Choose the desktop wrapper when **distribution, offline access, or a storefront** requires it. Choose further browser optimization while the question is **frame rate**. If a future packaged build is pursued, compare it against the current browser benchmark on the same machine and report both; do not infer a win from packaging alone.
