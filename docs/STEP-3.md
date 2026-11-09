# Roadmap 03 — Fleet, fitting, and persistent progression

**Build:** spACE v0.3.0  
**Date:** 2026-11-09  
**Scope:** Phase 3 implementation and its automated acceptance checks. This does not implement phase 4’s additional missions or claim that earlier human-playtest/performance gates have passed.

## Delivered

- A full-screen hangar accessible from title, briefing, and debrief, with a rotating pixelated 3D preview, six-hull roster, credit balance, fitting editor, and real stat comparisons.
- All six PRD hulls are flyable with distinct silhouettes, handling, hull/shields, boost behavior, and fitting capacities. Kestrel is granted permanently; five alternatives cost the PRD prices.
- Every hull includes a free complete default fit and can launch immediately after purchase. Purchases do not silently switch the active ship; Set Active uses that hull’s saved loadout.
- Ten parts across five slots, each with three upgrade tiers. Parts and tiers are shared across saved hull configurations. Hull/slot compatibility and power capacity are enforced in UI, domain transactions, save validation, and launch validation.
- Price/balance confirmation for purchases and upgrades; before/after upgrade effects; saved-versus-draft fitting stats; active-hull comparison for unowned hull previews.
- Apply only saves valid drafts. Invalid drafts, canceled purchases, and insufficient funds do not mutate the last valid fit or credit balance. Free Default recovery retains purchases and tiers.
- Real gameplay effects: flight model, boost, primary damage/rate/heat/projectiles, secondary damage/ammo/tracking/acquisition, shields/recharge, and hull use the same `buildStats` calculation as the hangar.
- Saved active ship, per-hull loadouts, owned hulls, and shared part tiers. Export and explicitly confirmed, validated JSON import are available from the hangar.

## Balance and equipment

| Hull | Price | Hull / base shield | Top speed | Pitch/yaw | Fitting |
| --- | --- | --- | --- | --- | --- |
| EX-01 Kestrel | Granted | 100 / 100 | 150 m/s | 0.85 rad/s | 12 |
| EX-07 Viper | 3,000 | 65 / 80 | 190 m/s | 1.10 rad/s | 10 |
| EX-12 Bastion | 4,500 | 160 / 115 | 110 m/s | 0.62 rad/s | 15 |
| EX-16 Specter | 6,000 | 80 / 65 | 160 m/s | 0.95 rad/s | 12 |
| EX-21 Peregrine | 7,500 | 85 / 90 | 170 m/s | 1.05 rad/s | 11 |
| EX-30 Paladin | 10,000 | 110 / 110 | 155 m/s | 0.90 rad/s | 16 |

Viper trades durability/fitting room for pursuit. Bastion has stronger cannons but slow handling. Specter has improved acquisition/precision and thin shields. Peregrine has a 140-unit boost reserve and 320 m/s boost but weaker sustained firepower. Paladin offers fitting flexibility without beating specialists in their roles.

Default fittings use nine power. All five premium alternatives together need 18, exceeding even Paladin’s 16, so the highest-cost parts cannot simply all be stacked. Viper and Specter explicitly reject heavy torpedoes. Tiers improve stats but keep a part’s power cost fixed, preventing a shared upgrade from invalidating saved fits on another hull.

The pulse cannon hits harder per shot; rapid laser fires faster with lower heat and faster projectiles. Torpedoes trade guided-missile tracking, acquisition, rounds (8 vs 24), cone width, and cooldown for higher damage. Vector drives sacrifice speed for handling. Reinforced shields have more capacity but slower recovery and a longer recharge delay. Cooling competes with acquisition upgrades for the utility slot.

**Economy check:** First Light pays at least 1,500 CR. The first pulse upgrade costs 500. Viper costs 3,000: two minimum-reward runs without purchases, or three after that first upgrade. Hull-survival bonuses are normalized by maximum hull and remain capped at 500 regardless of hull choice.

## Save safety and migration

The original `space.progress.v1` storage key is retained; the payload is now **version 2**. A valid version-1 payload migrates without changing credits, campaign unlocks, completed-run IDs, or last debrief. Kestrel and five default tier-1 parts are added. Migration is persisted on the next legitimate transaction, with the valid prior payload backed up first.

Transactions copy and validate the candidate state before committing it. Failed purchases, invalid equipment, and excessive tiers cannot partially charge the balance. Rewards remain idempotent per completed run and replays remain legitimate new runs.

Import is an explicit replacement, not a merge. The file must validate before confirmation is offered. Cancellation makes no changes; confirmation retains pre-import on-disk data in `space.progress.v1.before-import` when storage is available. Bad inventory, missing starter gear, unowned active hulls, bad tiers, incompatible/over-capacity saved fits, unsupported versions, and negative balances are rejected. Corrupt existing saves are not silently reset or overwritten by ordinary play. A valid backup can recover them; otherwise the session stays playable with a warning and export path.

Storage denial/quota failures do not claim persistence succeeded. If backup creation fails, the old on-disk primary is left intact and the changed in-memory session can be exported. Mouse-yoke and other control settings use their separate key and are not overwritten by progress import.

## Automated evidence

Recorded results for this build:

| Check | Result |
| --- | --- |
| TypeScript and production build | Pass |
| Unit suite | 61 tests pass |
| Chromium / Firefox browser suite | 28 tests pass, including full First Light regression and all six flyable hulls |
| Production local-HTTPS functional matrix | 45 checks pass across branded Chrome, Edge, and Firefox; report: `docs/evidence/functional-results.json` |
| Dependency audit | Zero known vulnerabilities at validation time |

Visual layout evidence: [720p hangar in Firefox](evidence/phase-3/hangar-firefox-720.png) and [720p hangar in Chromium](evidence/phase-3/hangar-chromium-720.png). The fitting validation message and Apply/Default actions remain visible while the five-slot list scrolls independently.

### Unit coverage

`tests/unit/hangar.test.ts` covers:

- Catalog completeness, all default fits, specialization tradeoffs, real flight/defense effects, and real tier effects for every part.
- The first-reward/upgrade and two-to-three-run Viper economy.
- All five ship purchases and all ten part upgrades through tier 3.
- Insufficient funds, duplicate purchases, excessive tiers, unowned/incorrect-slot/incompatible/over-capacity gear, and preservation of the last valid fit.
- Shared upgrades, per-hull loadouts, selected hull, and default recovery across reload.
- Version-1 migration, reward deduplication, round-trip import/export, pre-import backup, malformed inventory rejection, and unavailable storage.

Existing flight, combat systems, mission, camera, mouse-yoke, collision, and reward tests remain in the suite.

### Browser coverage

`tests/browser/hangar.spec.ts` exercises the public UI in Chromium and Firefox:

1. Starter grant, roster, valid defaults, and disabled unaffordable purchases.
2. Canceled/confirmed hull purchases, actual upgrade comparisons, shared upgrades, invalid fitting rejection, free defaults, and reload persistence.
3. Import confirmation/cancellation, corrupt-file rejection, and portable JSON export.
4. Buying and flying **all six hulls**, verifying their actual defense capacities and destroying a moving target with default secondary weapons.
5. Equipping a purchased rapid laser, heavy torpedoes, and reinforced shield; checking actual combat names/capacity/ammunition, torpedo and laser kills, and reset resources.

Purchase tests use explicitly labelled synthetic save files through the same confirmed import UI available to players. They do **not** claim those fixture credits came from real mission completions. The separate First Light tests still play the mission with ordinary inputs and verify genuine earned rewards and reload-safe deduplication.

Screenshots are generated under `docs/evidence/phase-3/`. They are layout/art evidence, not hardware-performance certification. Run:

```sh
npm test
npm run build
npm run test:browser
```

For installed validation Chrome/Edge plus Firefox over local HTTPS, run `npm run test:acceptance:functional`. The full acceptance command also includes the still-open strict ≥60 FPS gate; do not reinterpret functional passes as performance passes.

## Release boundaries

The hangar and progression phase is implemented. **Missions 2–5 remain phase 4**, and the first-time-human onboarding study and strict performance gate documented in prior milestones remain open. This phase adds no accounts, cloud saves, multiplayer, crafting, selling, monetization, or new currency. Scenery remains non-collidable. Broader campaign balance and player preference studies are not replaced by automated tests.
