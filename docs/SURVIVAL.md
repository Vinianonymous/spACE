# Wave Survival

Start from **Wave Survival** on the title screen. Your active hangar ship and build are copied into a disposable run; campaign credits and equipment are not modified.

## Waves and tokens

- Wave 1 starts with three enemies. Counts increase to twelve regular contacts, with tougher enemies and heavies from wave 4.
- Odd waves use Trusan; even waves use Naurae. Trusan raiders below 35% hull overclock and detonate onto their target, so a self-destruct can clear a wave contact without granting siphon healing. Naurae charge EMPs and teleport when damaged; their lockout can briefly suspend cannon, missiles, countermeasures, and Focus. After one blast, Lion’s systems harden for six seconds so several Naurae cannot chain-lock every weapon.
- Clear every required contact to shop. Ordinary waves award 2 tokens; tenth waves award 6.
- After regular enemies on every tenth wave, defeat a summoner boss. It deploys two drones every eight seconds while alive, only when there are at most 17 active ships. Existing summons must also be cleared after the boss dies.
- The shop pauses simulation. Continue without purchasing to save tokens.
- Continuing restores shields/ammunition/boost and system readiness; repairs 25% of maximum hull.

## Run-only skills

Each skill has three ranks, costing 2, 3, then 4 tokens.

| Skill | Per-rank effect |
| --- | --- |
| Arc pulse | Primary hits arc for 15 damage to two other ships within 180 m |
| Shockwave warheads | Secondary hits splash 25% impact damage within 180 m |
| Shield siphon | Kills restore 8% maximum shields |
| Focus reactor | +20% lock speed; −5 seconds Focus cooldown |
| Thermal shunt | +25% weapon heat recovery |
| Ion wake | Boost deals 12 damage every 0.5 seconds within 110 m |

Death, restart, exit, and reload erase tokens and skills. Survival writes no campaign rewards or run state. Hangar purchases and settings remain separate persistent systems. No resume, leaderboard, or persistent Survival currency is implemented.

## Evidence

- Unit tests cover token pricing, rank caps, wave-10/20 bosses, summon limits, remaining minions, reset isolation, faction EMP/teleport/overclock timers, and EMP lockout.
- Chromium/Firefox smoke tests exercise real flight, shopping, skill activation, restart, and exit.
- An input-driven Firefox run cleared waves 1–10, bought skills, observed actual summons, killed the boss and remaining ships, and verified no campaign save writes and a fresh reset. See `docs/evidence/survival/ten-wave-playthrough.json` and `wave-10-summoner.png`.
- A held-fire transition bug found during regression was corrected: focus moves to the shop container, not its Continue button, so Space does not skip the shop.

Endless high-wave balance and stress performance are not certified.
