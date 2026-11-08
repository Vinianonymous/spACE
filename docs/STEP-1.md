# Roadmap 01 — Browser flight and visual feasibility

**Build:** spACE v0.1.0  
**Evidence date:** 2026-11-08  
**Status:** Prototype implemented; **milestone acceptance on hold**. Public HTTPS deployment, branded Chrome/Edge checks, and the reference-hardware performance gate remain open. Do not advance the roadmap as though these gates have passed.

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

## Verification evidence

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

## Go / no-go assessment

**Go for further prototype evaluation:** The web stack supports the required flight, targeting, missile guidance, procedural scene, pixelated rendering, and independent readable HUD. Both automated browsers can complete cannon/missile actions without runtime errors. The production payload is far below the PRD’s 30 MB compressed budget.

**No-go for declaring step 1 complete or starting content expansion as a passed milestone:** No public HTTPS endpoint has been provisioned, branded Chrome/Edge remain unverified, the required reference-hardware performance result is missing, and human flight-feel validation is outstanding. The software-renderer result is explicitly below target and cannot be used to certify GPU performance. Resolve these gaps before accepting the gate.
