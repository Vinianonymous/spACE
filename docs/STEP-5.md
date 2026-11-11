# Step 5 — Release validation (in progress)

This is a **release-preparation increment**, not a v1.0 release or acceptance of the roadmap gates.

Subsequent gameplay work added the connected hangar technology tree and optional Phoenix, Bloodthirst, and Poison abilities. The save payload is now version 4 under the original key; version-1–3 saves migrate to the free Focus ability without losing owned ships or parts. Existing higher-tier equipment remains owned even if it does not satisfy a new tree prerequisite. See [current rules](../README.md#hangar--phase-3); the original verification numbers below describe the earlier release-preparation increment, not a new release acceptance.

## Delivered in this increment

- Flight manual settings now include remapping for 17 keyboard flight/combat actions. Click an action and press a physical key; Escape cancels, Reset restores the defaults. Duplicate bindings, browser arrows, Escape, and H are reserved. Fixed Escape (pause), H (manual), and arrow steering remain available as recovery paths. Mouse buttons and existing mouse-mode preferences are unchanged.
- Effects volume (including mute), radio-subtitle visibility, compact/standard/large HUD sizing, and reduced effects (lower particle cap and no vignette) are saved locally. Radio dialogue remains in the pause-menu transcript when subtitles are hidden; warnings and objectives remain visible. For the story experience, keep radio subtitles enabled: there is no voice-over.
- These settings use a separate `space.preferences.v1` key and do not change or migrate the campaign save. Invalid preference data falls back to safe defaults. Storage denial leaves settings usable for the current session. Progress export/import does **not** include pilot preferences; clearing site data removes them.
- Flight-HUD key hints follow remapped controls. The manual's static control chart describes **default** bindings; the expandable binding list shows the live ones.

## Verification performed

- `npm run build` passes; `npm test` passes 88 unit tests (including preference validation).
- `npm run test:browser` passes 36 tests across bundled Chromium and Firefox; browser coverage includes rejected duplicate bindings, persisted settings after reload, actual yaw input using a remapped key, and reset to defaults.
- These are functional regression tests, **not** a real-GPU benchmark or a clean-profile deployment check. Previous phase-4 campaign/Survival evidence is not re-certified by this increment.

## Release checklist still open

1. Run the documented Chrome, Edge, Firefox hardware matrix, cold-start, representative combat frame-time, and uninterrupted 30-minute stability checks on reference machines. Do not substitute software-rendered CI for GPU acceptance. The literal median 60 FPS gate remains unpassed.
2. Verify every remapped input (including mouse modes), all three HUD sizes at 720p and 1080p, subtitles, mute, reduced effects, and both difficulties with human pilots and supported browsers. The eight-person first-session onboarding study and earlier four-person slice study have not happened.
3. Complete ship/part balance, mission-pacing, blocker triage, dependency/license attribution audit, and production-hosting/security review. Do not tag or advertise v1.0 before these gates close.
4. From a fresh browser profile, open the **production** build on the chosen HTTPS host, play/save/export/import, reload, and simulate an asset failure/retry. Keep the last known-good deployment artifact and its static host configuration; rollback by redeploying that artifact without deleting site data or downgrading the `space.progress.v1` save. Verify rollback against a current save before release. A self-signed localhost server is not public deployment.

For current controls, browser requirements, and save warnings, see [README](../README.md). Earlier campaign limitations remain recorded in [Step 4](STEP-4.md).
