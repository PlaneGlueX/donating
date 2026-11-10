# Performance: measuring lag and what was found

Older notes (spark's background profiler, `/lag`, safepoints): docs/setup.md, the "Lag" bullet in Local setup.

## Measuring
- `/dphone prof start`, then `/dphone prof stop` (TaskProf.java, donating.phone.admin): writes `plugins/DonatingPhone/prof.txt`: tick times (mean, p50, p90, p99, max, over 50 ms), tasks' ms by tick of the second, what ran in each tick over 50 ms, and every task's cost (a Skript `every X:` as file:line). Nothing runs while it's off. Not counted: code after a `wait`, tasks scheduled after start.
- Don't start it in the first 10 s after a server start: its wrappers hide the tasks from TaskSpread (that start then says "SPREAD moved 0 of 0"). `/dphone spread` fixes it.
- Compare with the load test's NPC count in view: `bots/run.js load` makes 8, 11 or 14 NPCs from run to run (the hit copies vary; cops stay at 6). Its heap check calls a full GC (a 1 s tick): that one is the test's.
- The first run after a restart is cold (JIT, heists opening): measure the second.

## Found on 2026-11-03 (10 bots, warm)
Before: mean tick 10.9-12.9 ms, p90 19.4, p99 72, 56 of 2182 ticks over 50 ms; tasks 3.58 ms a tick, of which the first tick of each second ran 31.5 ms against 0.4-5 ms in the others.
- Skript starts every `every X:` in the same tick. **TaskSpread.java** moves each to the quietest tick of its period (5 s after a start, or `/dphone spread`; a `/sk reload` bunches that script's blocks again until then, harmless).
- traps.sk's 2-tick loop ran for every armed heist with nobody near (0.94 ms a tick, the biggest): now only heists with a robber or a player within `trap::near-range` 64 (0.19). Fuses and blinking catch up from the clock.
- hud.sk's boss bar: every 10 ticks, not 5.
- `gamerule random_tick_speed 0` (a built map needs none; DEPLOY.md).
- A restart reset and opened every heist at once (ticks of 200-700 ms for 7 s, just as Minehut wakes for the first player): now `heist::steps-per-second` 2.

After: p50 6.8, p90 14.6, p99 45.8, 14 of 2037 ticks over 50 ms; tasks 2.88 ms a tick, the busiest tick of the second 7.4 ms (8 NPCs); mean 9.1 with 14 NPCs.

Every bot scenario touching these still passes (PLAYTEST 286).

With 1 GB, like Minehut's heap but on this PC's CPU (14 NPCs, warm): mean 9.4, p50 7.5, p90 14.6, p99 39.9, 8 of 1826 ticks over 50 ms, heap 733 of 1024 MB, no out-of-memory errors: no worse than 2 GB.

Left: most remaining ticks over 50 ms have almost no task cost, so they look like GC pauses and world work rather than scripts (not traced tick by tick).

## Tried, no gain
- `simulation-distance` 6 instead of 10: same numbers (with random ticks off and no mobs chunks cost little), put back.
- Splitting DonatingPhone into several plugins (checked again 2026-11-04, not built): no runtime gain (its main repeating task about 0.13 ms of a 10 ms tick, about 1 s of a 149 s start, against Skript's 72 s), and PhonePlugin and the features use each other in circles, which Bukkit's `depend` can't express. Break big classes up inside the one plugin instead.

## Rules for repeating scripts
- Exit early when nobody qualifies; keep per-heist or per-spot work to where a player is.
- Use the slowest interval play can't notice. Check a new block's cost with `/dphone prof`.

## Forced chunks and memory (2026-11-05)
A forced chunk keeps every once-loaded chunk within 13 chunks in memory. POI stands pinned about 5,900 chunks: 250 MB of the 1 GB, a full GC every few seconds. POIs are packets now (docs/gps.md). 10 bots on 1 GB: p99 245 -> 18 ms, ticks over 50 ms about 120 -> 4 of 10,000. 20 bots on 1 GB was still poor before the change and isn't deployable anyway (Minehut has 10 slots).

### View distance on Minehut (2026-11-10; owner: "default for minehut is 6 and goes up to 16. check to see if 10 is good")
- Measured locally at 1 GB (Minehut's free plan), 10 bots spread over the map (no shared chunks), each moved 64 blocks back and forth twice, chunks already generated; live heap after a full GC: view 10: 890 of 1,024 MB (87%), ticks ~5 ms, one 300 ms spike; view 8: 847 MB (83%), ~4 ms, worst 58 ms. Idle the server holds ~600 MB. Each player at view v keeps (2v + 1)² chunks: 441 at 10, 289 at 8, 169 at 6.
- Recommendation: 8 (realistic: 10 fits but leaves ~130 MB for heists, cops and cars with 10 players); 6 is the cautious option. Simulation distance 6-8 (only ticking, little memory). The local server stays at 10. Scratch test: viewload.js (not a bot scenario).
