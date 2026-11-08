# spACE — Product Requirements Document

**Target release:** v1.0  
**Setting:** The year 2256  
**Platform:** Desktop browser  
**Genre:** Single-player, mission-based, arcade space combat  
**Status:** Proposed product scope; new names and story details below are working proposals.

## 1. Product vision

**spACE** is an Ace Combat 7–inspired browser game that puts players in the cockpit of an augmented rookie pilot fighting for humanity’s last civilized nation. Fast, accessible three-dimensional dogfights, squadron radio chatter, and meaningful ship customization bring a distant-future conflict to life through immersive, pixelated graphics.

Players should feel like a talented but vulnerable pilot becoming the decisive member of a squadron—not an invincible observer of a space war.

### Product pillars

1. **Readable, exhilarating combat:** Responsive flight, clear targeting, and dramatic encounters take priority over realistic orbital physics.
2. **A squadron worth fighting for:** Tetragon’s dialogue and battlefield presence give missions a human center.
3. **Earned customization:** Credits unlock ships, interchangeable parts, and upgrades that support different combat styles.
4. **A galaxy shaped by scarcity:** Vextra motivates the conflict and connects the fiction to weapons, technology, and progression.
5. **Accessible spectacle:** Pixelated 3D art delivers atmosphere without requiring a high-end gaming computer.

Ace Combat 7 is a reference for pacing, mission presentation, and arcade combat—not a source of assets, characters, dialogue, music, or interface designs to copy.

## 2. Audience and release boundaries

### Target players

- Players who enjoy arcade flight combat and science-fiction campaigns.
- Desktop browser players seeking focused sessions of approximately 10–20 minutes.
- Players who enjoy experimenting with builds without live-service obligations.

### v1.0 release scope

- A complete single-player campaign of five replayable missions.
- Three factions with distinct visual identities and battlefield behavior.
- Six player-flyable ships: one starter and five credit-purchased alternatives.
- A hangar supporting ship purchases, part swapping, and part upgrades.
- Keyboard-and-mouse flight controls, a guided tutorial, and local progression saves.
- Pixelated real-time 3D environments, music, effects, and subtitled squadron communications.

### Explicitly outside v1.0

- Multiplayer, PvP, cooperative play, and competitive leaderboards.
- Open-world travel, a seamless galaxy, planetary exploration, or orbital simulation.
- Accounts, cloud saves, trading, real-money purchases, and premium currencies.
- Mobile/touch support, VR, and required gamepad support.
- Branching campaigns, procedural missions, crafting, and extensive voice acting.

## 3. World and narrative

### The Vextra conflict

In 2256, **Vextra** powers civilization: propulsion, industrial technology, weapons, and experimental biological augmentation all depend on it. Scarcity drives three powers to scavenge deposits, seize salvage, and control the routes that could let them dominate the galaxy.

For v1.0, this galactic conflict is presented through a limited operational theater around Mars and nearby salvage routes. Vextra is a strategic resource in the story and in mission objectives; it is **not** a second spendable currency or a fuel timer that limits play.

### Factions

| Faction | Identity and motivation | Battlefield expression |
| --- | --- | --- |
| **Exavius** | A nation based on Mars, the last remnant of civilized mankind. It fights to preserve humanity and secure the Vextra needed for survival. | Disciplined formations, coordinated escorts, industrial-military silhouettes, and dependable multirole ships. |
| **Trusan** | A society of space pirates: often disorganized, but united by an unknown common leader. Its raiders fight for salvage, power, and access to Vextra. | Aggressive ambushes, scavenged hulls, opportunistic attacks, and uneven coordination. |
| **Naurae** | An AI society led by the rogue superintelligence **Nauralis**. It seeks control of Vextra and galactic infrastructure. | Coordinated drone groups, geometric ships, machine precision, and synchronized attacks. |

### Protagonist and squadron

- **Callsign:** Lion.
- **Name:** Unknown; not revealed in v1.0.
- **Allegiance:** Exavius.
- **Squadron:** Tetragon, a four-pilot unit including Lion.
- **Background:** A new pilot who has undergone experimental training and received Vextra-powered implants that augment his abilities.
- **Story tension:** Lion’s exceptional performance makes him valuable, while the risks and purpose of his augmentation remain uncertain.

Tetragon has three persistent AI wingmates with distinct communication styles and mission roles. Working roles are squadron leader, tactical support, and aggressive interceptor; final names and dialogue are content-production decisions.

The campaign establishes Lion’s place in Tetragon, introduces all three factions, and resolves a local battle for Vextra. The Trusan leader’s identity and Nauralis’s full plans remain unresolved without preventing the campaign from delivering a complete ending.

## 4. Player experience and core loop

1. Review a mission briefing, objectives, threats, and expected rewards.
2. Select an owned ship and configure its compatible parts in the hangar.
3. Launch with Tetragon and fight through a compact, scripted mission.
4. Complete objectives, receive a debrief and credits, and unlock the next mission.
5. Purchase ships or improve a build, then continue the campaign or replay missions.

**First-session goal:** Within 15 minutes, a new player should learn basic flight, destroy a target, experience a Tetragon exchange, complete the first mission, and make a first upgrade decision.

### Main screens

`Title / Continue → Mission Selection → Briefing → Hangar / Loadout → Mission → Debrief`

Settings are accessible from the title screen and pause menu. The hangar remains accessible between missions.

## 5. Gameplay requirements

### 5.1 Flight and camera

- Arcade six-direction positioning through pitch, yaw, roll, throttle, and boost; no realistic orbital mechanics or mandatory Newtonian drift.
- Forward-flight handling with tuned acceleration, braking, turn rates, and speed limits per ship.
- Keyboard-and-mouse controls with remappable gameplay actions and configurable mouse sensitivity and inversion.
- Third-person chase camera as the default; a cockpit view is not required for v1.0.
- Camera and flight behavior remain stable across variable frame rates.
- Pause freezes single-player simulation; losing browser focus automatically pauses the mission.
- Restart and return-to-hangar options are available from pause and failure screens.

### 5.2 Combat

- Every ship equips a primary weapon and a lock-on secondary weapon.
- Primary weapons use heat rather than consumable ammunition; overheating temporarily prevents firing.
- Secondary weapons have finite mission ammunition that replenishes on mission start or restart at no credit cost.
- Target selection, lock acquisition, range feedback, incoming-missile warnings, and recharging countermeasures are required.
- Hull and shields communicate damage clearly. Shields regenerate after a damage-free delay; hull does not passively regenerate.
- Friendly fire is disabled in v1.0.
- Enemies include fighters, interceptors, heavy attackers, and stationary defenses; faction tuning makes equivalent roles behave differently.
- Wingmates assist without reliably completing primary objectives for the player.

### 5.3 Lion’s augmentation

**Working mechanic: Vextra Focus.** A player-triggered implant mode briefly improves targeting stability and lock acquisition, with a distinct audiovisual treatment.

- Initial tuning target: five-second duration and a 30-second cooldown, beginning when the effect ends.
- The mode is available on every ship and introduced in the tutorial.
- An on-screen meter communicates readiness, active duration, and cooldown.
- It does not require paid items or a consumable resource.
- The campaign must remain completable without activating it outside its tutorial demonstration.

### 5.4 Objectives and failure

- Supported objectives: destroy targets, defend an ally, escort a convoy, and secure a zone while salvage is recovered.
- Mission failure occurs when Lion is destroyed or an explicitly identified critical objective is lost.
- Objective changes trigger a HUD update and a subtitled radio message.
- Destruction of optional targets never blocks campaign progression.
- Missions restart from the beginning in v1.0; short duration replaces a checkpoint system.
- Mission boundaries are visibly communicated; leaving them triggers a warning and a safe automatic course correction, not an unexplained death.

## 6. Ships, parts, and economy

### 6.1 Launch roster

All six ships are player-flyable Exavius or Exavius-authorized hulls. The five alternatives are purchased with earned credits, not unlocked through real-money transactions. Names and prices are initial balancing proposals.

| Ship | Role | Main strength | Main tradeoff | Acquisition |
| --- | --- | --- | --- | --- |
| **EX-01 Kestrel** | Starter multirole | Balanced handling and forgiving durability | No specialized advantage | Granted at new game; always retained |
| **EX-07 Viper** | Interceptor | Speed and rapid target pursuit | Low hull strength | 3,000 credits |
| **EX-12 Bastion** | Heavy assault | Armor and sustained damage | Slow turning and acceleration | 4,500 credits |
| **EX-16 Specter** | Precision fighter | Fast locks and accurate attacks | Low shields | 6,000 credits |
| **EX-21 Peregrine** | Skirmisher | Strong boost and evasive movement | Lower sustained firepower | 7,500 credits |
| **EX-30 Paladin** | Advanced multirole | Flexible fitting and balanced combat | High cost; less specialized than role-focused ships | 10,000 credits |

Every ship includes a functional default loadout. No purchased ship requires additional spending before it can launch. Later ships are alternatives, not mandatory replacements for the starter.

### 6.2 Parts and upgrades

Each ship exposes five interchangeable slots:

| Slot | Required launch options | Meaningful tradeoff |
| --- | --- | --- |
| Primary weapon | Pulse cannon, rapid laser | Per-shot damage versus fire rate and heat |
| Secondary weapon | Guided missiles, heavy torpedoes | Fast-target reliability versus heavy-target damage |
| Engine | Standard drive, vector drive | Top speed versus maneuverability |
| Shield | Balanced shield, reinforced shield | Recharge behavior versus capacity |
| Utility | Targeting processor, cooling system | Lock acquisition versus weapon heat recovery |

- Launch with at least ten distinct parts: two per slot.
- Each part has three upgrade tiers, with tier 1 as its base state.
- The hangar displays stat changes, price, compatibility, and upgrade effects before confirmation.
- Ships have fitting-capacity limits; parts consume capacity, preventing unrestricted stacking of the strongest components.
- Owned parts are reusable across saved ship loadouts without repurchase. A part may appear in multiple loadouts because only one ship launches at a time.
- Upgrades attach to the owned part and persist when it is moved between ships.
- Purchases cannot create a negative balance. Incompatible or over-capacity loadouts cannot launch and show the reason.
- Each ship retains its last valid loadout. A free default loadout is always recoverable.

### 6.3 Credits and progression

- Credits come from successful missions, optional objectives, and performance bonuses.
- Initial reward target: 1,000–2,000 base credits per mission, with up to 500 additional credits for optional objectives and performance.
- Replays award credits, so all ships and upgrades remain obtainable after the campaign ends.
- Failed or abandoned missions award no credits and impose no repair fees or purchase losses.
- Completion rewards are granted once per completed run, including when a debrief is reloaded.
- The first mission’s reward must cover at least one part purchase or upgrade.
- The first alternative ship should be affordable after two to three successful missions without optional-objective grinding.
- All five missions must be completable in the starter ship with its default equipment on Standard difficulty.
- No selling, crafting, loot boxes, premium currency, or random stat rolls in v1.0.

## 7. v1.0 campaign

Mission titles are working names. Duration estimates exclude briefings and hangar time.

| # | Mission | Expected duration | Gameplay and narrative purpose |
| --- | --- | --- | --- |
| 1 | **First Light** | 8–10 minutes | Guided Exavius patrol near Mars. Teach flight, weapons, defense, and Vextra Focus before a limited Trusan raid. Introduce Tetragon. |
| 2 | **Broken Convoy** | 10–15 minutes | Escort a Vextra transport through a debris field. Trusan ambushes introduce target prioritization; destroying a raider cache is optional. |
| 3 | **Silent Geometry** | 10–15 minutes | Secure a salvage zone and encounter Naurae drones. Introduce coordinated AI attacks and evidence of Nauralis’s involvement. |
| 4 | **Scavenger’s Crown** | 12–18 minutes | Strike a Trusan depot while Naurae forces intervene. Combine defenses and mobile threats; hint at the pirates’ unknown leader. |
| 5 | **Tetragon Rising** | 15–20 minutes | Defend an Exavius Vextra extraction operation, then disable a Naurae command vessel in a phased final encounter. Resolve the local operation and establish future stakes. |

Missions unlock sequentially. Completed missions remain replayable with any owned ship. All required instructions appear in text; understanding a mission must not depend on hearing dialogue.

## 8. Visual, audio, and interface direction

### Pixelated, immersive 3D

- Render real 3D ships and environments through a deliberately low-resolution internal render target with nearest-neighbor scaling.
- Use low-poly silhouettes, restrained texture detail, readable weapon effects, and faction-specific shape languages.
- Preserve immersion with parallax starfields, engine trails, debris, spatial sound, lighting, and large background structures.
- Render HUD text at display resolution so the pixel treatment does not impair readability.
- Provide Low, Medium, and High presets controlling internal resolution, particles, shadows, and effects.
- Keep faction identification readable through shapes and labels as well as color.

### Required HUD and feedback

- Hull, shields, speed, boost state, primary heat, secondary ammunition, and Focus status.
- Selected target, distance, lock state, radar, and off-screen threat indicators.
- Current objective, critical ally status, and relevant mission timer only when needed.
- Subtitled radio communication with speaker callsigns.
- Distinct feedback for hits, shield breaks, incoming missiles, objective completion, and damage.

### Accessibility and settings

- Remappable controls, sensitivity controls, and invert-axis options.
- Adjustable HUD scale and subtitle size.
- Separate master, music, effects, and dialogue volume controls.
- Reduced camera shake and reduced flashing options.
- Two difficulty settings: **Standard** and **Assist**. Assist reduces incoming damage and makes lock acquisition more forgiving without restricting rewards or progression.
- Radio subtitles are always available; recorded voices are optional polish, not a release dependency.

## 9. Technical and persistence requirements

### Browser architecture

- Use a WebGL 2–capable 3D engine; TypeScript with Three.js or Babylon.js is a proposed starting point, to be selected during the first milestone.
- Deploy as a static HTTPS application; no runtime backend is required for v1.0.
- Support current stable Chrome, Edge, and Firefox on desktop at release; record the exact tested versions in release notes.
- Display an actionable compatibility message if WebGL 2 is unavailable.
- Load mission-specific assets on demand with progress feedback and a retry path for failed downloads.
- Maintain separate systems for flight, combat, mission scripting, UI, content definitions, and persistence.
- Define ship stats, parts, prices, and objectives in validated data files rather than scattering them through gameplay code.

### Save behavior

- Persist campaign unlocks, credits, owned ships and parts, part tiers, loadouts, and settings locally in the browser.
- Save after purchases, loadout changes, settings changes, and mission rewards.
- Version the save format and validate data before use; retain a last-known-good backup when replacing a save.
- Provide JSON save export and validated import to support manual backup and transfer.
- Detect unavailable storage and clearly warn that progress will not persist; do not silently report a successful save.
- Warn that clearing browser data can remove progress and that private browsing may not retain it.
- A new-game reset requires confirmation and never happens automatically after a save-validation failure.

### Performance budgets

Reference hardware must be recorded before performance acceptance: a laptop with an Intel Iris Xe–class integrated GPU, 16 GB RAM, and a 1080p display.

| Measure | v1.0 acceptance target |
| --- | --- |
| Normal combat | Median at least 60 FPS on Medium at a 1080p display resolution, using the selected internal resolution |
| Stress encounter | Median at least 30 FPS on Low with 20 active enemies, three wingmates, and active weapon effects |
| Frame pacing | 95th-percentile frame time at most 50 ms during the stress encounter, excluding loading and pause transitions |
| Initial playable download | At most 30 MB compressed, excluding later mission downloads |
| Cold start to interactive title | At most 15 seconds on a controlled 25 Mbps connection with 50 ms latency |
| Cached mission launch | At most 10 seconds on reference hardware |
| Stability | No crash or progressive slowdown during a 30-minute mixed combat-and-replay session |

Record preset, internal resolution, browser version, hardware, and test scenario with performance results. Lower-fidelity effects are preferable to obscured targets or unstable controls.

## 10. Success criteria and validation

These are release-validation targets, not claims about an existing audience. Use at least eight first-time desktop playtesters for the onboarding study; report raw counts as well as percentages.

| Goal | Validation target |
| --- | --- |
| Learnability | At least 80% complete mission 1 without facilitator intervention |
| First-session progression | At least 80% complete a first part purchase or upgrade within 15 minutes |
| Combat clarity | At least 80% correctly identify the current objective and incoming-missile warning when asked |
| Customization comprehension | At least 80% can describe a meaningful tradeoff between two available builds |
| Campaign completeness | QA completes all five missions in sequence on both difficulties, including a default-starter Standard run |
| Economy integrity | Automated tests cover insufficient funds, duplicate reward prevention, replay rewards, and upgrade persistence |
| Save reliability | Reload, export/import, invalid-save, and unavailable-storage scenarios pass documented tests |

Use opt-in playtest logging or facilitated observation. Production analytics are not required for v1.0, and no personal data collection is needed for core gameplay.

## 11. Five-step roadmap to v1.0

Each step is complete only when its checklist passes and its evidence is recorded. Time estimates should be assigned after the first prototype establishes team capacity; these are sequential delivery gates, not calendar commitments.

### Step 1 — Prove browser flight and visual feasibility

**Deliverable:** A deployed, playable flight-and-combat prototype in a representative pixelated 3D scene.

- [x] Select and document the engine, controls, pixel-rendering method, and reference test hardware. See [step-1 evidence](docs/STEP-1.md); reference-hardware measurements remain pending.
- [ ] Deploy an HTTPS build that opens in Chrome, Edge, and Firefox without installation.
- [x] Implement pitch, yaw, roll, throttle, boost, chase camera, and focus-loss pause.
- [x] Let the player destroy a moving target with a primary weapon and a locked missile.
- [x] Demonstrate the HUD remains readable at both 1280×720 and 1920×1080 display resolutions. Screenshots and automated layout checks recorded in step-1 evidence.
- [ ] Benchmark a representative combat scene and record frame times; meet the normal-combat performance target or reduce scope before advancing.
- [x] Record a short gameplay capture and a written go/no-go assessment of flight feel and technical feasibility. Current decision: hold milestone acceptance pending hardware, browser, and deployment validation; see [assessment](docs/STEP-1.md).

### Step 2 — Deliver a complete vertical slice

**Deliverable:** Mission 1 playable from title screen through debrief.

- [x] Implement briefing, launch, objectives, success, failure, restart, pause, and debrief transitions.
- [x] Include shields, hull, weapon heat, secondary ammunition, lock warnings, and countermeasures.
- [x] Introduce Vextra Focus through an interactive tutorial with visible duration and cooldown.
- [x] Fly alongside three Tetragon wingmates and fight a Trusan encounter with subtitled communications.
- [x] Award credits exactly once for a successful run and preserve them after a browser reload. See [phase-2 verification](docs/STEP-2.md).
- [ ] Have at least four first-time testers attempt the slice; at least three complete it without facilitator intervention.
- [ ] Close all reproducible blockers preventing mission completion before expanding campaign content.

### Step 3 — Complete ships, customization, and progression

**Deliverable:** A functional hangar and persistent progression economy.

- [ ] Implement all six flyable ships with distinct handling and the starter granted on a new save.
- [ ] Make all five alternative ships purchasable with credits and immediately launchable with default loadouts.
- [ ] Deliver ten parts across five slots, with three tiers per part, compatibility rules, and fitting limits.
- [ ] Show accurate stat comparisons and preserve each ship’s last valid loadout after reload.
- [ ] Verify the first mission funds an upgrade and an alternative ship is affordable after two to three successful missions.
- [ ] Pass automated purchase, insufficient-funds, duplicate-reward, replay-reward, and upgrade-persistence tests.
- [ ] Pass save reload, export/import, invalid-save, and unavailable-storage tests without silently resetting progression.

### Step 4 — Finish and balance the campaign

**Deliverable:** All five missions form a complete, replayable campaign.

- [ ] Implement missions 2–5 with their specified objectives, briefings, debriefings, and radio dialogue.
- [ ] Include all three factions, distinguish Trusan and Naurae combat behavior, and identify Nauralis in the story.
- [ ] Complete the final phased encounter and provide a campaign ending that resolves the local Vextra operation.
- [ ] Verify sequential unlocking and replay access for every completed mission.
- [ ] Complete the full campaign on Standard using the starter ship’s default loadout and separately verify Assist difficulty.
- [ ] Playtest every ship and each part option in combat; fix dominant builds that remove meaningful tradeoffs.
- [ ] Check mission durations against the target ranges and eliminate repeatable objective stalls or unwinnable states.

### Step 5 — Validate, polish, and release v1.0

**Deliverable:** A publicly deployable, release-tested browser build with documented support limits.

- [ ] Pass the documented browser matrix, performance budgets, cold-start test, and 30-minute stability test.
- [ ] Validate remapping, sensitivity, subtitles, HUD scaling, audio settings, reduced effects, and both difficulties.
- [ ] Run the eight-person onboarding study and meet the learnability, first-session progression, combat-clarity, and customization targets.
- [ ] Resolve all known critical/high-severity bugs: crashes, data loss, blocked campaign progression, broken controls, or unusable required UI.
- [ ] Audit all art, audio, fonts, and dependencies for licensing and record attribution where required.
- [ ] Test the deployed production build from a clean browser profile, including save export/import and asset-load retry behavior.
- [ ] Publish controls, browser requirements, local-save warnings, known issues, and release notes alongside the game.
- [ ] Tag/archive the v1.0 build and document a tested deployment rollback procedure that does not invalidate existing saves.

## 12. Risks and scope controls

| Risk | Mitigation |
| --- | --- |
| Browser performance limits immersive battles | Validate representative encounters in step 1; cap active enemies, pool projectiles, and reduce effects before reducing combat readability. |
| Six ships and modular parts expand balancing work | Reuse a shared flight model, data-driven tuning, and common slot rules; avoid unique ship-only systems in v1.0. |
| Pixelation obscures combat information | Keep HUD text crisp, use strong silhouettes, and validate target recognition during playtests. |
| Campaign production outgrows the release | Fix scope at five missions, reuse environment kits, and prioritize subtitles over full voice acting. |
| Local saves are lost or corrupted | Provide explicit storage warnings, validated versioned saves, backups, and manual export/import. |
| Flight controls overwhelm new players | Use progressive tutorial prompts, forgiving early encounters, remapping, and Assist difficulty. |

**v1.0 release definition:** A player can open spACE in a supported desktop browser, learn to fly as Lion, fight alongside Tetragon through a complete five-mission campaign, earn credits, buy and customize all six ships, and reliably return to saved progress—without an account, payment, or installation.
