# Roadmap 01 — Browser flight and visual feasibility

**Build:** spACE v0.1.0  
**Evidence date:** 2026-11-08  
**Status:** Prototype implemented; **strict performance acceptance on hold**. The user selected local HTTPS rather than public hosting. Chrome, Edge, and Firefox now run the production build over local HTTPS using the actual Intel GPU. The measured median-FPS gate remains below the literal ≥60 target; see the validation addendum below. Phase 2 was implemented at the user’s explicit request without claiming that this gate had passed.

## Decisions

| Area | Selection |
| --- | --- |
| Engine | Three.js 0.180 / WebGL 2; TypeScript and Vite |
| Flight | Arcade forward-flight model; local-axis pitch/yaw/roll, throttle, rechargeable boost |
| Camera | Damped third-person chase camera; wider field of view while boosting |
| Rendering | Native 3D geometry rendered at 640p on Medium, nearest-neighbor upscaling; 480p/900p alternatives |
| HUD | HTML/CSS at native display resolution, independent of internal render resolution |
| Reference target | PRD baseline: Intel Iris Xe–class integrated GPU, 16 GB RAM, 1080p display; exact physical test unit and OS still to be recorded |
| Available test host | Linux x64, Intel Core Ultra 7 155U; PCI lists Intel Meteor Lake-P graphics. Automated capture deliberately uses SwiftShader, **not** that GPU |
| Controls | Mouse/WASD/arrows pitch and yaw; Q/E roll; R/F throttle; Shift boost; Space/click cannon; M/right-click missile; Tab target; Escape pause; H manual |
| Assets | Procedural meshes/materials only; no external textures, fonts, audio, or proprietary Ace Combat content |

The selected hardware class is a target, not evidence of a completed benchmark. The currently installed dependencies and exact versions are pinned in `package-lock.json`.

## Delivered playable slice

- Launch screen, flight manual, render-quality selection, pause/resume, restart, and exercise completion.
- EX-01 Kestrel flight above procedural Mars with a salvage station, stars, and 160 instanced asteroids.
- Eight moving Trusan drones with target cycling, hull feedback, lock-on brackets, and off-screen direction hints.
- Pulse cannon with a narrow aim-assist cone; guided missiles requiring 1.2 seconds of forward-cone acquisition within 1,600 meters.
- Swept projectile collision, target destruction effects, and safe automatic boundary correction.
- Focus-loss/hidden-tab pause, cleared held inputs on resume, and frame-rate-independent simulation substeps.
- Local JSON frame-time export; no uploads, tracking, accounts, or persistent game state.

This prototype does not claim to implement mission 1 or later roadmap features. Hull is fixed at 100% because drones do not shoot back. Scenery is non-collidable. Missile ammunition is unlimited with a cooldown. There is no audio yet. These limitations are disclosed in the flight manual and README.

## Original prototype evidence (historical)

This table describes the initial v0.1 capture. Current hardware/browser/deployment results supersede its outstanding items in the validation addendum below.

| Check | Result |
| --- | --- |
| TypeScript + production build | Pass: `npm run build` |
| Unit suite | Pass: 11 tests covering handling, boost, rotation, approximate frame independence, boundary correction, locking, swept collision, and timing reports |
| Browser suite | Pass: 8 tests, four each in bundled Chromium 158 and Firefox 159 |
| Primary / secondary destruction | Both destroy a moving drone in each browser; tested via real keyboard input |
| Pause / restart | Focus-loss pause, frozen paused speed, Escape resume, restart state reset verified |
| HUD fit | 1280×720 and 1920×1080 layouts fit the viewport; native-resolution text and recorded screenshots support readability review |
| Quality settings | Low changes the actual WebGL canvas height to 480 pixels |
| Runtime exceptions | None in automated gameplay capture |
| Dependency audit | `npm audit`: zero known vulnerabilities at validation time |
| Branded Chrome / Microsoft Edge | **Not tested**; bundled Chromium is not a substitute for both branded browsers |
| Public HTTPS | **Not deployed**; production static build is ready for a chosen host |
| Reference GPU performance | **Not measured**; software-renderer timings below do not pass this gate |
| Human handling assessment | **Pending**; automation demonstrates control response, not whether flying feels good |

Generated evidence:

- [Launch screen, 1080p](evidence/launch-1080.png)
- [Flight HUD, 1080p](evidence/flight-1080.png)
- [Flight HUD, 720p](evidence/flight-720.png)
- [Short gameplay recording](evidence/gameplay.webm)
- [Diagnostic software-renderer benchmark](evidence/software-renderer-benchmark.json)
- [Capture environment](evidence/capture-environment.json)

Browser tests also generate launch/flight screenshots in `test-results/`; that directory is disposable and ignored. The checked-in evidence directory is produced separately against the production preview. Reproduction instructions are in [README.md](../README.md).

## Performance interpretation

The first diagnostic capture at a 1920×1080 viewport and 1138×640 internal resolution measured **20 median FPS** and **83.3 ms p95 frame time** over approximately **17 active seconds** with video recording and forced SwiftShader. This is a **software-rendering diagnostic**, not a measurement of the machine’s integrated GPU, and it does **not** establish the PRD’s 60 FPS target. Subsequent capture results are stored in the JSON alongside their browser/GPU identity.

Sampling includes slow active frames, excludes paused time, and resets after changing quality. Simulation time is capped/substepped during stalls to prevent large jumps, but the timing report retains the uncapped frame interval. Long captures retain the most recent 36,000 timing samples; short milestone runs stay below this limit.

### Remaining acceptance procedure

1. Identify a physical baseline laptop and record CPU, GPU, RAM, OS, driver, browser version, viewport, and internal resolution.
2. Test a production HTTPS deployment in stable branded Chrome, Edge, and Firefox; record exact versions and URL. Do not publicly expose Vite’s development server.
3. In each browser, warm up the scene, set Medium at a 1080p viewport, reset the benchmark, and resume. Fly and fire through a representative encounter for at least 60 seconds, restarting if necessary; export each run separately.
4. Require median ≥60 FPS on the baseline. If it fails, reduce render resolution/effects or draw calls and repeat; do not mark step 1 complete based on software-renderer or different-hardware results.
5. Have a human pilot assess pitch/yaw/roll consistency, aiming, camera motion, and readability at 720p and 1080p. Record issues and a signed-off go/no-go decision.

## Updated validation — local HTTPS and real GPU

The user explicitly selected **local HTTPS first**. `npm run serve:https` serves only `dist/` on loopback at **https://localhost:8443**, with a locally generated self-signed certificate. Browsers and automated test contexts must explicitly accept that certificate; no public CA trust or public endpoint is claimed. The server includes CSP, MIME/nosniff headers, method restrictions, and missing-asset handling. This resolves the deployment scope chosen by the user, not a public-hosting rollout.

Chrome **157.0.8103.38**, Edge **157.0.4341.42**, and Firefox **159.0** successfully ran the complete gameplay regression over HTTPS. Chrome/Edge were downloaded from their official stable repositories and extracted locally with package hashes verified; no system browser installation was changed. Actual browser versions are recorded separately from Playwright device-profile user agents in the historical timing reports. The current acceptance configuration uses native user agents instead of device-profile overrides.

Reference unit: **Intel Core Ultra 7 155U**, **16 GB nominal RAM (~15 GiB usable)**, **Intel Meteor Lake-P integrated graphics**, EndeavourOS/Linux 7.2.11, Mesa **26.2.5**, 1920×1080 browser viewport at DPR 1. WebGL renderer identities confirm Mesa Intel graphics rather than SwiftShader. Hardware discovery and renderer metadata are recorded in the environment JSON files.

| Browser | Active capture | Median FPS | p95 frame time | Strict ≥60 result |
| --- | --- | --- | --- | --- |
| Chrome | 60.70 s | 59.9 | 16.70 ms | Not passed |
| Edge | 60.68 s | 59.9 | 16.70 ms | Not passed |
| Firefox | 60.62 s | 58.5 | 17.12 ms | Not passed |

These are real-GPU, Medium, 1138×640 internal-resolution measurements, with continuous cannon fire, yaw, and a roll/boost interval. They are **not** the earlier software-rendered video capture. All three captures averaged approximately 60 frames per second across the entire capture, but average FPS is not a substitute for the PRD’s median criterion. This desktop reports physical display modes around 59.9 Hz; refresh caps and timer quantization affect strict comparisons. The assertions remain ≥60 and were not loosened to turn failures green.

Evidence: `docs/evidence/{chrome,edge,firefox}-gpu-benchmark.json`, corresponding `*-environment.json` files, and `docs/evidence/acceptance-results.json`. The full run had **27 functional passes and three benchmark assertion failures**. Historical reports identify the build/time of their run; they do not certify later rendering changes. Static ship geometry was subsequently batched by material to reduce draw calls without changing the art, and functional regressions were rerun separately. Do not claim unmeasured post-change performance.

## Go / no-go assessment

**Go for further prototype evaluation:** The web stack supports the required flight, targeting, missile guidance, procedural scene, pixelated rendering, and independent readable HUD. Both automated browsers can complete cannon/missile actions without runtime errors. The production payload is far below the PRD’s 30 MB compressed budget.

**No-go for declaring the strict performance gate passed:** Real-GPU measurements now exist, branded-browser functionality and the user-selected local HTTPS deployment are verified, and the gameplay capture/flight assessment is recorded. However, the literal median ≥60 FPS criterion has not passed. A higher-refresh, controlled timing run and post-batching benchmark are needed to distinguish display/timer ceilings from render headroom without redefining the target. Human handling feedback remains useful and is explicitly required by phase 2’s onboarding gate.
