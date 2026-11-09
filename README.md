# spACE

A browser-based, pixelated 3D arcade space-combat prototype set above Mars in 2256. Fly as **Lion**, Tetragon’s experimental rookie pilot, in Exavius’s EX-01 Kestrel.

This is the **phase-4 campaign and Wave Survival build**: five sequential, replayable missions, six flyable hulls, ten interchangeable parts, three tiers per part, and persistent builds. Survival adds escalating waves, a separate run-token skill shop, and summoning bosses every tenth wave. Trusan and Naurae ships now fight differently: Trusan raiders overclock and ram, while Naurae charge EMPs and teleport when damaged. The eight-drone proving ground remains available. Art and sound are procedural; gameplay makes no external API or asset requests. This is a prototype, not a fully balanced v1.0 release.

The flight HUD is visible only during active flight. Title, briefing, hangar, pause, debrief, and failure screens hide the combat readouts instead of leaving them over the menu. Local desktop packaging is documented as an optional path, not a platform change: [desktop packaging tradeoffs](docs/DESKTOP.md).

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
| Pitch / yaw | WASD / arrows; mouse in Relative or Screen-position mode |
| Mouse-yoke pitch / roll | Mouse movement shifts a persistent input (enable in H) |
| Roll | Q / E |
| Increase / decrease throttle | R / F |
| Boost | Hold Shift |
| Cannon | Space / left click |
| Guided missile | M / right click, after green target lock |
| Cycle target | Tab |
| Track campaign objective / return to hostile targeting | G / Tab |
| Padlock camera | Hold C; release to return to chase view |
| Countermeasures | X |
| Vextra Focus | V |
| Recenter mouse yoke | Z (in Mouse yoke mode) |
| Pause / resume | Escape |
| Flight manual and quality settings | H |

**Relative mouse flight is the default:** Launch/Resume captures the cursor with Pointer Lock. Mouse motion controls pitch/yaw; stopping the mouse returns to straight flight after brief smoothing. Escape releases the cursor and pauses. If capture fails, click the scene to retry or choose **Screen-position steering** in the manual. That fallback preserves the old center-relative cursor mode. Sensitivity and inverted pitch are configurable and saved locally. Keyboard controls remain available.

**Mouse yoke:** Choose **H → Mouse control → Mouse yoke · Pitch / Roll** for a persistent virtual stick. Relative mouse movement shifts a bounded Cartesian pitch/roll coordinate: move right to hold right roll, then move left toward center to reduce it. Stopping the mouse does **not** recenter or stop the rotation. Vertical movement similarly holds pitch (with configurable inversion); A/D still provide yaw. The small HUD grid shows the held input, not the ship’s attitude. Press **Z** to recenter instantly. Pause, resume, restart, and mode changes safely recenter it. The selected mode persists across reloads; existing preferences and the other control modes are preserved.

**Padlock** rotates the camera boom around Lion to face the target, keeping Lion’s ship in frame. It does not aim the ship or weapons. The lit 3D arrow normally points toward the target in camera coordinates. During padlock it instead shows the ship’s full target-relative attitude, including bank, with numeric pitch/yaw/bank. Range shifts from green nearby to red far away and always includes a number.

### First Light systems

- Complete flight checks, a cannon kill, a guided-missile kill, countermeasure training, and a five-second Vextra Focus demonstration before the Trusan raid.
- Shields recharge after five damage-free seconds; hull does not. Continuous cannon fire overheats. Each sortie starts with 24 missiles; restarts replenish them for free.
- Countermeasures break missile guidance and recharge in eight seconds. Focus enhances acquisition/aim assist for five seconds, followed by a 30-second cooldown. It is required only for its tutorial demonstration.
- Standard and Assist are selectable in the briefing. Assist halves incoming damage and improves lock acquisition without restricting rewards.
- Wingmates assist in formation but cannot deliver the final blow. Survive and defeat all six raiders to complete the mission.
- Earn 1,500 base credits plus up to 500 for surviving hull. Replays earn rewards; reloading a debrief never awards the same run twice. Failure/abandonment preserve existing credits.
- Credits, reward ledger, last debrief, sequential campaign unlocks, owned hulls, part tiers, active ship, and per-hull loadouts save locally with validation, backup recovery, and storage warnings. Export/confirmed import are available in the hangar.

### Campaign

Complete **First Light → Broken Convoy → Silent Geometry → Scavenger’s Crown → Tetragon Rising**. Protect the convoy, recover salvage inside the marked zone, raid the depot, and defend extraction before disabling the final command vessel’s relays, drives, and core. Use **G** to track navigation objectives and **Tab** to select hostiles. Losing a protected objective fails the sortie; optional caches never block completion. Mission Select allows replay of completed sorties.

Clearing browser data can remove saves. No account or cloud save exists. Scenery remains non-collidable. The proving ground has eight moving targets, no incoming fire, and no rewards. Campaign pacing remains shorter than the PRD targets; balance and human onboarding studies are still open.

### Faction combat

- **Exavius** flight and weapons are unchanged; Lion’s handling, cannon, missiles, countermeasures, and Focus behave exactly as before.
- **Trusan** raiders remain opportunistic, but a raider below **35% hull** within 1,800 m overclocks its drive, locks onto its target, and dives at 380 m/s. A 3.2-second fuse ends in a proximity detonation (up to 42 damage, falling off to 35% at the 170 m edge). Destroy it or break away. A self-detonating raider still counts as a destroyed sortie contact and advances mission progress, but does not award player kill credit or Survival siphon healing.
- **Naurae** ships charge a telegraphed EMP for **1.6 seconds** within 950 m. The blast drains up to 45 shields without damaging hull and locks cannon, missiles, countermeasures, and Focus for **3 seconds**. Lion’s systems then harden for **6 seconds**, so several Naurae cannot chain-lock every weapon. Damaged Naurae at or below **75% hull** also teleport to a new firing solution on a 12-second cooldown, breaking an existing lock.
- The warning strip above the reticle shows the active wind-up and countdown; EMP lockout also tints the reticle and vignette. Generated audio cues distinguish EMP charge, teleport, and overclock. Assist halves the EMP shield drain.

### Performance and quality

Press **H** to choose **AUTO · ADAPTIVE 640p**, LOW 480p, MEDIUM 640p, or HIGH 900p. AUTO starts at 640p and steps down once to 480p after three consecutive seconds below roughly 52 FPS; manual presets never change themselves. Quality changes reset the FPS sample.

The guide renderer updates every other frame and caches its bounds, enemy aiming reuses scratch vectors, menu states skip flight-HUD writes and projections, and Survival skill serialization is cached. These are implementation improvements, not a claim that the strict 60 FPS release gate is closed. Prior reference-machine medians were 59.9 FPS in Chrome and Edge and 58.5 FPS in Firefox; see [phase-1 evidence](docs/STEP-1.md).

### Wave Survival

Choose **Wave Survival → Start New Run** from the title. Fly your active hangar build against escalating waves. Every cleared ordinary wave awards **2 run tokens**; every tenth wave awards **6**, after defeating its boss and surviving reinforcements. Tokens are not campaign credits.

- Spend or save tokens between waves. Six special skills—Arc pulse, Shockwave warheads, Shield siphon, Focus reactor, Thermal shunt, and Ion wake—have three ranks costing **2 / 3 / 4 tokens**.
- After the regular enemies in waves **10, 20, 30…**, a summoner boss arrives and deploys two drones every eight seconds, subject to the active-ship limit. Killing it stops summons; clear remaining drones to finish.
- Continuing restores shields, ammunition, boost, and systems, and repairs **25% maximum hull**.
- **Death, restart, exit, or reload clears all run tokens and skills.** No campaign credits are earned or spent, and saved equipment is unchanged. Runs cannot be resumed after reload.

See [Survival details](docs/SURVIVAL.md) and [phase-4 evidence](docs/STEP-4.md).

### Hangar / phase 3

Open **Hangar / Refit** from title, the briefing, or the debrief. Earn credits by completing/replaying First Light; there is no free-credit/debug purchase mode.

- **Six ships:** Free Kestrel; Viper (3,000 CR), Bastion (4,500), Specter (6,000), Peregrine (7,500), and Paladin (10,000). Every purchase includes a complete default fit. Choose **Set active · Saved loadout** to select an owned hull for the next sortie.
- **Five slots / ten parts:** pulse cannon or rapid laser; guided missiles or heavy torpedoes; standard or vector drive; balanced or reinforced shield; targeting processor or cooling system. Hulls have different fitting capacities. Viper and Specter cannot carry heavy torpedoes.
- **Draft → Apply:** Selecting a part previews real stat changes. Buy locked parts or upgrade owned ones only after reviewing the price and confirmation. Invalid, unowned, incompatible, or over-capacity drafts cannot be applied or launched. Your last valid fit remains intact. Leaving a draft or changing the previewed hull discards unapplied edits.
- **Shared tiers:** Every part has tiers 1–3. An upgrade applies wherever that part is equipped. Parts can be reused in multiple saved ship fits without repurchase; only one ship flies at a time. Upgrades do not increase fitting power. Restore Free Default retains purchases/upgrades and costs nothing.
- **Real flight effects:** Hull silhouette, speed/handling, boost, hull/shields, recharge, weapon damage/rate/heat, projectile speed, secondary ammunition/tracking, and lock acquisition use the same data as the hangar stat table. The starter’s default stats are preserved.
- **Save compatibility:** Version-1/2 saves migrate to version 3 with credits, equipment, and reward history retained; legacy mission-2 unlocks grant campaign access through mission 2. Version-1 saves receive starter gear. The original storage key is retained. Survival is never saved. Valid previous data is backed up before writes.
- **Export/import:** Export Save downloads JSON. Import Save validates a file (up to 1 MB), previews its contents, and requires explicit replacement confirmation. It replaces, rather than merges, progress. Existing on-disk data is retained in a before-import backup when storage permits. Invalid imports do not mutate current progress or silently reset it. Storage failures keep the session playable with a visible warning; export before closing.

The first mission’s minimum reward covers an upgrade. Viper is affordable after two minimum-reward runs if you save credits, or three after buying the first 500-CR upgrade.

## Verification

```sh
npm test
npx playwright install chromium firefox
npm run test:browser
npm run test:campaign
```

Linux may require Playwright browser dependencies (`npx playwright install-deps`); inspect packages before system-wide installation. Tests cover both resolutions, controls/settings persistence, pointer capture, target guidance/padlock, cannon/missile kills, full First Light completion via pilot inputs, HUD visibility outside flight, faction behavior, reload-safe rewards, restart/abandonment, and storage denial. The current suite is **84 unit tests** and **34 browser tests** across Chromium and Firefox. Forced software-rendered Chromium timings are not hardware acceptance evidence.

For branded stable Chrome/Edge and Firefox over local HTTPS on Linux x64:

```sh
npm run validation:browsers
npm run build
npm run test:acceptance
```

The helper downloads Chrome/Edge from official stable repositories, verifies SHA-256 against repository metadata, and extracts them under `/tmp/opencode/space-browsers` without root or default-browser changes. It requires `ar`, `tar`, and the matching decompressor. Set `SPACE_BROWSER_DIR` to change the location. GPU acceptance tests reject software renderer identities. Headless GPU mode avoids stealing desktop focus; `SPACE_HEADFUL=1` opens visible windows. Focus loss intentionally pauses gameplay.

`npm run test:acceptance:functional` runs only the functional subset. The latest local HTTPS run passed **54/54** across Chrome, Edge, and Firefox (`docs/evidence/functional-results.json`). The full acceptance command also enforces the strict median ≥60 FPS gate, which remains open; see [STEP-1.md](docs/STEP-1.md) for measured results and limitations. It is not currently an all-green performance certification.

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
- `src/campaign.ts`, `src/survival.ts` — campaign objectives and disposable wave/token/skill state.
- `src/factions.ts` — Trusan overclock/detonation and Naurae EMP/teleport timing rules.
- `src/progress.ts` — validated saves, backup recovery, and idempotent rewards.
- `src/catalog.ts` — six hulls, ten parts, prices, fitting rules, and shared build-stat calculation.
- `src/hangar.ts` — roster, 3D preview, refitting, transactions, and save import/export.
- `src/audio.ts` — optional generated combat sounds.
- `src/world.ts` — procedural ships, Mars, station, stars, and instanced asteroids.
- `src/game.ts` — simulation, combat, camera, state transitions, and HUD projection.
- `src/metrics.ts` — frame timing and local JSON export.
- `src/main.ts`, `src/style.css` — crisp HTML HUD over a low-resolution WebGL 2 canvas.
- `docs/STEP-1.md` — milestone evidence, outstanding gates, and go/no-go assessment.
- `docs/STEP-2.md` — vertical-slice scope, verification, and remaining playtest gate.
- `docs/STEP-3.md` — fleet/fitting delivery, save migration, and verification evidence.
- `docs/STEP-4.md`, `docs/SURVIVAL.md` — campaign and Survival scope, verification, and open gates.
- `docs/DESKTOP.md` — optional packaging tradeoffs and a concrete Electron path, without changing the current platform.

Three.js provides the renderer and 3D math; Vite and TypeScript provide development/build tooling. The renderer runs at 480p, 640p, or 900p internally, never above the viewport’s height, with nearest-neighbor CSS scaling. The HUD renders at native display resolution.

See [PRD.md](PRD.md) for the full product scope.
