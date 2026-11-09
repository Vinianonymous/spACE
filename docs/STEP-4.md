# Phase 4 — Campaign and Wave Survival

## Delivered

All five campaign missions are playable with briefings, objectives, dialogue, debriefs, sequential unlocks, and replay access. Missions 2–5 add convoy protection, contested salvage recovery, depot defenses and Naurae intervention, extraction protection, and a relay/drive/core command-vessel encounter. The ending resolves the local Vextra operation while leaving the wider conflict open.

Faction combat is now mechanically distinct. Exavius handling is unchanged. Naurae ships inside 950 m charge a 1.6-second EMP that drains up to 45 shields without hull damage and locks cannon, missiles, countermeasures, and Focus for three seconds; Lion’s systems then harden for six seconds so multiple Naurae cannot chain-lock every weapon. Damaged Naurae at or below 75% hull teleport on a 12-second cooldown. Trusan raiders below 35% hull within 1,800 m overclock, lock onto their target, dive at 380 m/s, and detonate after a 3.2-second fuse for up to 42 proximity damage (170 m radius). The HUD warning strip and generated audio telegraph both wind-ups. A self-detonating contact advances the sortie contact counter and mission completion, while player kill credit and Survival siphon healing remain restricted to damage the player actually caused.

The flight HUD is now gated by a single `hud-visible` body class tied to `state === 'flying'`. Title, briefing, hangar, pause, debrief, and failure screens hide the mission panel, telemetry, reticle, heading scale, target markers/guide, padlock, yoke, warnings, objective marker, boss status, bottom HUD, and status bar while preserving their layout boxes.

Naurae use geometric meshes and synchronized volleys; Trusan use irregular attacks. G tracks objectives, Tab returns to hostiles, and C padlocks while keeping Lion visible. Protected-objective loss fails a mission; optional caches do not block completion. Pause includes a comms transcript.

Performance work for this pass: the lit guide viewport renders every other frame and caches bounds until resize; enemy orbit/aim uses scratch vectors; menu HUD updates return early; Survival skill JSON is cached; and opt-in AUTO quality steps 640p→480p after three consecutive sub-52 FPS seconds. These reduce browser overhead but do not close the strict 60 FPS gate.

Save version 3 migrates versions 1/2 without changing the storage key, campaign credits, or existing equipment. Wave Survival uses separate disposable tokens and skills; see [rules and evidence](SURVIVAL.md).

## Verification

- Production TypeScript/Vite build passes; **84 unit tests** pass, including faction timers, EMP lockout/shield drain, and overclock falloff.
- **34 browser tests** pass across Chromium and Firefox, including the new HUD-visibility test and the full First Light kill-count path with a self-detonating contact.
- The functional HTTPS acceptance suite passes **54/54** across stable Chrome, Edge, and Firefox in 4.2 minutes (`docs/evidence/functional-results.json`). The separate strict 60 FPS benchmark gate remains open.
- Default tier-1 Kestrel completed all five missions sequentially on Standard using ordinary keyboard input and public HUD telemetry, with no injected kills or progression. Unlocks, ending, replay access, and reload reward deduplication passed with no browser errors.
- A separate default tier-1 Kestrel Assist run completed the same full sequence and assertions, with no browser errors (`campaign-assist.json`).
- Real Survival playthrough cleared waves 1–10, observed boss summons, defeated all required contacts, and verified credit/save isolation and reset. Faction lethality was tuned during this regression: EMP hardening prevents chain-lock, while the Trusan dive now uses a 3.2-second fuse, 380 m/s, 42 maximum proximity damage, and a 170 m blast radius.
- Evidence: `docs/evidence/phase-4/campaign-standard.json`, final encounter screenshots, and `docs/evidence/survival/`.
- Inspected 1280×720 title, token shop, summoner, and final-encounter screenshots. Shop content scrolls within the viewport; inactive combat panels are hidden on the title to avoid overlapping its expanded action buttons.
- HUD visibility is asserted before launch, in flight, while paused, and after resume in both browsers. The debrief reads the final contact count even though the flight HUD is hidden on the completion screen.

## Open acceptance gates

This is not a declaration that phase 4 or v1.0 is fully accepted.

- Expert input-driven Standard mission times were approximately 25, 80, 71, 28, and 74 simulation seconds—well below the PRD’s 8–20-minute ranges. Convoy travel uses 80 seconds and salvage/extraction use 45-second objective timers. These demonstrate functional completion, not accepted pacing.
- Full ship/part combat balance and dominant-build studies remain open.
- First-time human onboarding studies remain unperformed.
- Strict median ≥60 FPS, reference-hardware stress budgets, and release stability remain open. Software-rendered test FPS is not hardware acceptance evidence.
- Local HTTPS uses a self-signed certificate; public deployment and trusted public TLS were not requested or performed.
- Desktop packaging has not been implemented. A browser-first recommendation and an optional Electron path are documented in [DESKTOP.md](DESKTOP.md); packaging would not by itself raise frame rate.
