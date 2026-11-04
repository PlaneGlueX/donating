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

Left: most remaining ticks over 50 ms have almost no task cost, so they look like GC pauses and world work rather than scripts (not traced tick by tick).

## Tried, no gain
- `simulation-distance` 6 instead of 10: same numbers (with random ticks off and no mobs chunks cost little), put back.
- Splitting DonatingPhone into several plugins: no runtime gain.

## Rules for repeating scripts
- Exit early when nobody qualifies; keep per-heist or per-spot work to where a player is.
- Use the slowest interval play can't notice. Check a new block's cost with `/dphone prof`.
