# spACE

A browser-based, pixelated 3D arcade space-combat prototype set above Mars in 2256. Fly as **Lion**, Tetragon’s experimental rookie pilot, in Exavius’s EX-01 Kestrel.

This is the **phase-2 vertical slice**, not the full five-mission campaign. **First Light** includes a briefing, guided training, three Tetragon AI wingmates, six live Trusan raiders, failure/restart, debrief, and saved credit rewards. The original eight-drone proving ground remains separately available. Art and sound are procedural; gameplay makes no external API or asset requests.

## Run locally

Requires Node.js 22.12+ (or a compatible newer release) and npm. Tested here with Node 26.10.0.

```sh
npm ci
npm run dev
```

Open **http://localhost:5173**, choose **Mission 01 / First Light**, review the briefing, and launch. The server listens on all interfaces for local-device testing; do not expose it publicly.

```sh
npm run build
npm run preview
```

The production build is in `dist/`. For the user-selected **local HTTPS** deployment:

```sh
npm run build
npm run serve:https
```

Open **https://localhost:8443**. This loopback-only server generates a **self-signed** certificate with OpenSSL in ignored `.local/https/`. Your browser will warn until you explicitly trust it. Local automated tests bypass this warning; public certificate trust is not claimed. No system trust store is changed. Never publish the private key or use this certificate for public hosting.

Alternatively, serve `dist/` on a static HTTPS host. Relative asset URLs support subdirectories. No backend, accounts, or secrets are required. Public hosting is not configured; local HTTPS was selected for this phase.

## Controls

| Action | Control |
| --- | --- |
| Pitch / yaw | Mouse, WASD, or arrow keys |
| Roll | Q / E |
| Increase / decrease throttle | R / F |
| Boost | Hold Shift |
| Cannon | Space / left click |
| Guided missile | M / right click, after green target lock |
| Cycle target | Tab |
| Padlock camera | Hold C; release to return to chase view |
| Countermeasures | X |
| Vextra Focus | V |
| Pause / resume | Escape |
| Flight manual and quality settings | H |

**Relative mouse flight is the default:** Launch/Resume captures the cursor with Pointer Lock. Mouse motion controls pitch/yaw; stopping the mouse returns to straight flight after brief smoothing. Escape releases the cursor and pauses. If capture fails, click the scene to retry or choose **Screen-position steering** in the manual. That fallback preserves the old center-relative cursor mode. Sensitivity and inverted pitch are configurable and saved locally. Keyboard controls remain available.

**Padlock** rotates the camera boom around Lion to face the target, keeping Lion’s ship in frame. It does not aim the ship or weapons. The lit 3D arrow normally points toward the target in camera coordinates. During padlock it instead shows the ship’s full target-relative attitude, including bank, with numeric pitch/yaw/bank. Range shifts from green nearby to red far away and always includes a number.

### First Light systems

- Complete flight checks, a cannon kill, a guided-missile kill, countermeasure training, and a five-second Vextra Focus demonstration before the Trusan raid.
- Shields recharge after five damage-free seconds; hull does not. Continuous cannon fire overheats. Each sortie starts with 24 missiles; restarts replenish them for free.
- Countermeasures break missile guidance and recharge in eight seconds. Focus enhances acquisition/aim assist for five seconds, followed by a 30-second cooldown. It is required only for its tutorial demonstration.
- Standard and Assist are selectable in the briefing. Assist halves incoming damage and improves lock acquisition without restricting rewards.
- Wingmates assist in formation but cannot deliver the final blow. Survive and defeat all six raiders to complete the mission.
- Earn 1,500 base credits plus up to 500 for surviving hull. Replays earn rewards; reloading a debrief never awards the same run twice. Failure/abandonment preserve existing credits.
- Credits, reward ledger, last debrief, and mission-2 unlock flag save locally with validation, backup recovery, and storage warnings. Export Progress downloads a JSON backup. Import is not yet implemented.

**Mission 2, the hangar, purchasable ships, and parts are not playable yet.** Those belong to later phases. Clearing browser data can remove saves. No account or cloud save exists. Scenery remains non-collidable. The separate proving ground has eight moving targets, no incoming fire, and no rewards.

## Verification

```sh
npm test
npx playwright install chromium firefox
npm run test:browser
```

Linux may require Playwright browser dependencies (`npx playwright install-deps`); inspect packages before system-wide installation. Tests cover both resolutions, controls/settings persistence, pointer capture, target guidance/padlock, cannon/missile kills, full First Light completion via pilot inputs, reload-safe rewards, restart/abandonment, and storage denial. Forced software-rendered Chromium timings are not hardware acceptance evidence.

For branded stable Chrome/Edge and Firefox over local HTTPS on Linux x64:

```sh
npm run validation:browsers
npm run build
npm run test:acceptance
```

The helper downloads Chrome/Edge from official stable repositories, verifies SHA-256 against repository metadata, and extracts them under `/tmp/opencode/space-browsers` without root or default-browser changes. It requires `ar`, `tar`, and the matching decompressor. Set `SPACE_BROWSER_DIR` to change the location. GPU acceptance tests reject software renderer identities. Headless GPU mode avoids stealing desktop focus; `SPACE_HEADFUL=1` opens visible windows. Focus loss intentionally pauses gameplay.

To regenerate the gameplay recording, screenshots, and diagnostic benchmark against a production build:

```sh
npm run build
npm run preview -- --port 4173
```

In another terminal:

```sh
node scripts/capture.mjs
```

The capture script replaces files in `docs/evidence/`. Set `CAPTURE_OUTPUT=docs/evidence/phase-2` for a separate capture and `CAPTURE_URL=https://localhost:8443` for local HTTPS. It records gameplay and a padlock screenshot. For hardware measurements, reset the benchmark in the manual, resume, fly a representative encounter, and export the report. Browser/GPU information stays local. Quality changes reset sampling.

## Architecture

- `src/flight.ts` — frame-rate-independent handling, lock rules, and swept collision.
- `src/input.ts` — keyboard/mouse input and action bindings.
- `src/mouse-flight.ts` — relative/position modes and validated preferences.
- `src/camera-rig.ts`, `src/guide-renderer.ts` — player-centered padlock orbit and lit 3D guidance/attitude arrow.
- `src/systems.ts`, `src/mission.ts` — combat resources and guided mission progression.
- `src/progress.ts` — validated saves, backup recovery, and idempotent rewards.
- `src/audio.ts` — optional generated combat sounds.
- `src/world.ts` — procedural ships, Mars, station, stars, and instanced asteroids.
- `src/game.ts` — simulation, combat, camera, state transitions, and HUD projection.
- `src/metrics.ts` — frame timing and local JSON export.
- `src/main.ts`, `src/style.css` — crisp HTML HUD over a low-resolution WebGL 2 canvas.
- `docs/STEP-1.md` — milestone evidence, outstanding gates, and go/no-go assessment.
- `docs/STEP-2.md` — vertical-slice scope, verification, and remaining playtest gate.

Three.js provides the renderer and 3D math; Vite and TypeScript provide development/build tooling. The renderer runs at 480p, 640p, or 900p internally, never above the viewport’s height, with nearest-neighbor CSS scaling. The HUD renders at native display resolution.

See [PRD.md](PRD.md) for the full product scope.
