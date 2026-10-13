<!-- wf_7a4941fe-721 draft:model: an agent's final report, kept for the cloud session -->

The Hand Minigun model is built and installed as `tools\guns\minigun.js`, its only repo file. All my checks pass. I didn't build the pack, start the server, run bots or commit. The real pack (make-item-art, build-pack) and the in-client check are still to do.

I followed the Google engineer's agent-skills plugin (addyosmani/agent-skills) as far as it can be followed here. Its skills only run when the owner types them, so I couldn't invoke them. Instead I read `planning-and-task-breakdown` and followed its method by hand. The plan is in my work folder (`plan.md`), not in `tasks/` or the repo, because this track owns only `minigun.js`.

**What's in it**
- **Shape:** it returns exactly 6 / 1006 / 2006 / 3006. The parts are body, spin, mag, stock, flash and flash2, all lowercase. The detail level matches the remade guns (68 elements, 512² texture).
- **Spin:** the cluster turns about AY 8.6, AZ 8.0. The sweep check, ported to `build\model\sweep.js`, runs on every build.
- **Camo:** the cyan plates are real thin boxes 0.05 proud. They're painted with a seeded camo of 2x2-texel blocks in the plate's own cyan tones, so a future skin recolours them. Each has a black circuit trace.
- **Palette:** the base keys are recv, barrel, steel, cyan, magG, magL and grip. org and red are in `keep`. The derived keys (recvT, steelD, cyanD, groove) follow their base colour in a skin.
- **Spin frames:** the full spin flickers 6 poses on fire + flag 0. With the key up (flag 0 still on) the barrels keep spinning, with no flash. Spin-up is flag 3 (360p²), spin-down flag 4 (450(2p−p²)).
- **Draw (flag 2, 40 ticks):** up from below, a sag, a turn across the screen and a half-turn test spin of the barrels.
- **Reload (90 ticks):** the gun comes up with its belly toward you, so the box swap is on screen. The two ratchet quarter turns line up with the sound delays 13, 54, 67 and 74.
- **Third person, ground, item frames:** a display_context select reads flags 0, 3 and 4 only, never the cooldown or the held key. The inventory icon is the still model.
- **Scope:** the reflex hood with a cyan rim, the stock hidden, and the small X flash showing either side of the cluster under the dot.
- **Hip view:** 13.2% of the screen with the muzzle at (496,332), against the Veteran's 13.0% at about (487,322).

**Checks run (all passing)**

| Check | Result |
|---|---|
| Sweep | 28 spin boxes, max r 3.58, smallest clearance 0.17, 0 collisions |
| `check.js` | outside first person, no cooldown or keybind_down reads; flash at the muzzle in all 68 composites with a flash; every model exists; biggest turn per tick: spin-up 15°, spin-down 14°, draw 24.9°, reload 25.5° |
| Lint | 3 of 58 big faces are empty (all hidden) |
| `dot.js` (aimed, lens removed) | dot within 0.5 px of the crosshair in both hands; 56% of the centre open |
| Repo copy | builds byte-identical to the draft |
| Tests track's wm-ammo checks | the structures they look for were read and match (flag gating, flags on the clock, third-person flags, still icon, plain-mirror aimed models, sweep); those checks themselves still need a pack build to run |

**Things that don't match the spec exactly**
- **Spin curves are only drawn where they're slow.** GunSpin starts a shorter clock when the barrels are still turning, and the model can't see that. Drawing the full curve would then turn the cluster 45°+ a tick, which looks like it's spinning backward. So spin-up is drawn as angles up to p 0.55 and spin-down from p 0.5; the fast part is the full spin's blur. A quick re-press still shows a brief slow restart. The exact fix would need GunSpin to put the spool value on the item, which is outside the agreed interface.
- **Draw test spin is 180°, not 300°.** 300 isn't a multiple of 90, so the cluster would end 30° off its rest pose and jump.
- **Lint lists 31 boxes off the 1/4 grid.** These are the spin boxes (symmetric about y 8.6, which can't land on the grid) and the 0.05-proud camo plates the spec asked for.
- **The icon is darker than lint's guideline.** Its ink + deep share is 64% against the 30-55% guideline; it's a black gun like the reference. Lint only flags too little black.
- **The definition is big.** It's 319 KB minified with 440 composites, about 2.4× the Veteran's. Any future skin copies the whole tree again.
- **Left hand:** the reload rolls the belly away rather than toward you, the same as the AK-48. The box stays on screen.

**Open questions**
- Owner, spec §10.6: keep the reflex hood that shows the barrels under the dot (built), or the tall tube that hides them?
- Lead: if the brief slow-down on a quick re-press bothers anyone in the client, the exact fix needs GunSpin to put the spool value on the item, outside the agreed interface. Worth doing?

Files are in `C:\Users\matti\AppData\Local\Temp\claude\C--Users-matti-OneDrive-Desktop-Donating-Test-Server\0780fadd-412f-469c-beee-bc8b53ea6313\scratchpad\remake\work\minigun\build\model\`:
- final-sheet.png
- plan.md
- minigun.js
- prev.js
- sweep.js
- check.js
- measure.js
- dot.js
- r\

Repo file installed:
- C:\Users\matti\OneDrive\Desktop\Donating Test Server\tools\guns\minigun.js
