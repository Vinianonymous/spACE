# Roadmap 02 — First Light vertical slice

**Build:** spACE v0.2.0  
**Date:** 2026-11-08  
**Status:** Implementation delivered; automated functional verification recorded below. Human onboarding/playtest acceptance remains open. This is one mission slice, not v1.0 or the ship-customization phase.

## Play it

Open **https://localhost:8443** for the locally deployed production build, or **http://localhost:5173** for development. Local HTTPS uses a self-signed certificate and may show a trust warning; no public hosting or public certificate trust is claimed. Choose **Mission 01 / First Light**, select Standard or Assist, and launch from its briefing.

## Mission flow

1. **Flight check:** Demonstrate pitch, yaw, roll, and boost. Individual actions tick off in the objective panel.
2. **Pulse-cannon drill:** Destroy a moving drone. Heat accumulates, prevents firing when overheated, and clears after cooling.
3. **Missile drill:** Acquire the next drone in the forward cone and destroy it with a guided missile. Other weapon use is safely disabled during the relevant drill so lessons cannot be skipped into an unwinnable state.
4. **Defense check:** A practice missile approaches. Deploy countermeasures with X; the lesson remains available if the practice missile already hit or expired.
5. **Implant check:** Activate Vextra Focus with V and fly through its five-second duration. The 30-second cooldown starts after activation ends.
6. **Trusan incursion:** Six live raiders attack with pulse fire and guided missiles. Three Tetragon wingmates maintain formation and assist without finishing primary targets for Lion. Destroy all six and survive to complete First Light.
7. **Debrief:** Earn 1,500 credits plus up to 500 hull-survival bonus. Return to title, replay, export progress, or view the last debrief after reload.

Mission failure is Lion’s hull reaching zero. Restart replenishes shields, hull, missiles, boost, heat, countermeasures, and Focus state. Pausing freezes the simulation; abandonment and failure award nothing and preserve previously earned credits. There are no protected allies or escort objectives in this mission; wingmates are invulnerable support units.

### Combat details

- 100 hull / 100 shield; shields regenerate after five damage-free seconds, hull does not regenerate.
- 24 guided missiles per sortie with a 2.5-second rack cooldown. No repair/refill costs.
- Countermeasures are active for 2.5 seconds and recharge in eight seconds.
- Focus improves acquisition speed and the cannon’s small aim-assist cone without changing flight physics or automatically steering Lion.
- Assist halves incoming damage and improves acquisition; rewards remain the same.
- Hostile shots cannot damage other raiders or wingmates; player shots cannot damage wingmates.
- Generated effects sounds have an optional volume control. All instructions and communications are available in text without recorded dialogue.

## Requested control and camera changes

### Relative mouse flight

The default uses Pointer Lock and relative mouse-motion deltas for pitch/yaw, not the cursor’s screen destination. Deltas are consumed once per rendered frame, then applied consistently through simulation substeps. Brief smoothing removes jitter and decays to neutral when motion stops. The old screen-position steering remains available in the manual, with sensitivity and pitch inversion. Preferences are validated and persisted separately from progression.

### Player-centered padlock

Hold **C** to orbit the camera boom rotationally around Lion toward the selected target. Camera distance from the ship remains fixed; interpolation follows an orientation quaternion rather than translating the camera through the ship. The look point remains player-anchored, maintaining the ship’s lower-center framing even for a target behind the player. Release C to return smoothly to chase view. A stable target-facing up reference allows the ship’s bank to remain visible. Neither mode changes flight axes or weapon direction.

### Actual 3D direction / attitude arrow

The lower-center indicator is a **lit shaft-and-cone mesh with bank fins**, rendered into a small scissored WebGL HUD viewport. It is not an SVG rotated in screen space.

- **Normal view:** The world vector from Lion to target is transformed by the inverse of the current camera rotation. The 3D arrow points along that camera-relative vector, including forward/backward depth.
- **Padlock:** The arrow instead takes the full relative orientation `inverse(cameraRotation) × shipRotation`. It shows Lion’s pitch, yaw, and bank in the target-facing view; matching text readouts support interpretation.
- Numeric range always remains visible. Color moves from green at ≤350 meters through amber to red at ≥1,600 meters. The rear-hemisphere label means color and foreshortening are not the only directional signals.

## Saves and rewards

`space.progress.v1` stores a versioned credit balance, completed-run IDs, last result, and a mission-2 unlock flag. A successful run receives a fresh UUID; completion is idempotent for that UUID, including after a browser reload. Viewing a debrief does not call the reward path.

Validated previous saves become a backup before replacement. A corrupt primary can recover from a valid backup. Invalid primary/backup data is not silently overwritten: the game warns and continues with session-only progression. Storage denial and quota failures are visible. Export Progress downloads a JSON backup; import remains a later-phase feature. Mouse settings use a separate key. Clearing browser data can remove both.

## Verification

- Flight, locking, collision, mouse input, camera geometry, 3D guide orientation, resources, mission checks, and save integrity have unit coverage.
- Camera tests project Lion into clip space on every frame of a 180° padlock transition, including targets above/below, and assert the ship remains in view and the boom remains outside the ship.
- Browser tests run the actual mission from briefing through all lessons and the raid using ordinary keyboard input and HUD feedback. They do not inject kills, mission state, damage, credits, or completion.
- Complete-mission tests passed individually in bundled Chromium and Firefox, including persistent reward checks and reload-safe last-debrief display.
- Browser regressions cover both requested resolutions, control-mode persistence, pointer capture/release, target selection, hold-C/release camera behavior, pause/restart, and render quality.
- Resource tests cover shield overflow, destruction, recharge delay, heat lockout/recovery, ammunition exhaustion/reset, countermeasures, Focus duration/cooldown, and Assist damage.
- Save tests cover replay rewards, duplicate completion, malformed saves, backup preservation, storage denial, quota failure, and invalid balances/rewards.

Reproduce with `npm test`, `npm run build`, and `npm run test:browser`. The production HTTPS/branded-browser suite is `npm run test:acceptance`; its machine-readable report lives in `docs/evidence/acceptance-results.json` when run. Historical failed runs must not be interpreted as passing evidence.

## Scope and remaining acceptance

- [x] Implement briefing → mission → success/failure → debrief, with pause, restart, and abandonment.
- [x] Implement hull/shields, weapon heat/ammunition, acquisition and incoming-missile warnings, and countermeasures.
- [x] Teach Focus interactively and display its active duration and cooldown.
- [x] Include three Tetragon wingmates, a live Trusan encounter, and speaker-labelled text communications.
- [x] Persist credits and prevent duplicate rewards across reload/debrief viewing.
- [ ] Have four first-time human testers attempt the slice; at least three complete it without facilitator intervention.
- [ ] Resolve any remaining reproducible mission-completion blockers found by those testers before accepting the content-expansion gate.

**Balance caveat:** Automated pilots can complete the current slice quickly; its eventual 8–10-minute first-mission pacing is not yet validated with new players. No artificial waiting is added to inflate duration. Use the onboarding study to adjust training clarity, encounter size, and pacing before calling this a final campaign mission.

**Not implemented here:** Hangar, ship purchases, parts/upgrades, mission 2 content, a full campaign, cloud saves, or multiplayer. The mission-2 unlock flag reserves progression for later content and is clearly labelled as not yet playable.

## Human playtest checklist

For each of four first-time pilots, record browser/device, difficulty, completion/failure, completion time, facilitator help, confusing prompts, control mode, padlock/arrow comprehension, and any blocking bug. Explicitly ask whether the ship remains visible in padlock and whether the 3D indicator’s mode switch is understandable. Record raw results; automated runs are not human playtests.
