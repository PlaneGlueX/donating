export const meta = {
  name: 'city-heists-plan',
  description: 'Write, critique and fix the city heists build plan (tools/build/city/PLAN.md) from the saved design in tools/build/city/design/',
  whenToUse: 'Resume the city heists plan: args.from = plan | critique | fix (tools/build/city/README.md says which)',
  phases: [
    { title: 'Plan', detail: 'tools/build/city/PLAN.md with exact numbers' },
    { title: 'Critique', detail: 'check the plan against the real mechanics; saved to design/critique.md' },
    { title: 'Fix', detail: 'apply confirmed findings; saved to design/fixes.md' },
  ],
}

// Every step reads and writes files in the repo, so a session that ends mid-way loses at most the step it was on:
// from 'plan' (no PLAN.md yet), 'critique' (PLAN.md written), 'fix' (design/critique.md written).
const A = args || {}
const ROOT = A.root || 'C:/Users/matti/OneDrive/Desktop/Donating Test Server'
const SP = A.sp || ROOT + '/tools/build/city/design'
const FROM = A.from || 'plan'
const CONTEXT = `
PROJECT: Donating, a Minecraft (Paper 26.1.2) heist server built with Skript + a few plugins. Repo: ${ROOT}. Read CLAUDE.md there
first if you need the game's rules: the sections "Heists (heists.sk)", "Traps (traps.sk)", "Loot (loot.sk)", "Cops (cops.sk)",
"Store clerks and the police assaults", "Stores (heists.sk difficulty 0)", "The story: Mara's missions", "Vic the Fence",
"The Jailbreak map and the prison", "The town's last buildings" and "Builds are practical, not roleplay" matter most.

THE OWNER'S REQUEST (2026-10-26): build the city's core heists next, the biggest gap before launch: Jailbreak's
Jewelry Store, Bank and Museum, "but maybe change up the heist themes a little bit, maybe find some ideas from gta or payday 2
to add to some of the jailbreak heists". Keep each recognisably the Jailbreak heist, with GTA / Payday 2 twists mixed in.

THE MAP (Multiverse world "jailbreak", 1 Roblox stud = 1 block, detailed Minecraft style):
- The world is a custom flat: grass_block at y 64, dirt y 61..63, stone y <= 60, air above. Street surfaces are at y 64.
- The prison occupies x -40..480, z -30..470 (tools/build/jail.js, modules in tools/build/jail/). Its east-west highway runs
  x -40..480 at z 419..441 (asphalt y 64: black_concrete mixes; a yellow dashed centre line at z 430; white edge lines at z 420
  and 440), sidewalks light_gray_concrete y 64 at z 416..418 and 442..444, smooth_stone_slab curbs at y 65 on z 418 and 442.
  Its north-south road (x 431..466) goes south into the town. The highway's east end at x 480 was left free for "the city".
- The town (Mountainside, tools/build/town/, PLAN.md there) is south of the prison: its approach module owns z 471..728,
  x 120..770, a ridge whose north foot starts at z ~482 (ridgeFoot in tools/build/town/approach.js; RIDGE domes up to y ~108
  reaching x ~770); the town proper is z >= 729.
- FREE LAND for the city: x >= 481 (north of the town's ridge: keep z <= 470 for x <= 775), and anything east of x 775.
  The city continues the highway east from x 481. Leave room for more city later (Jailbreak's city also has a casino,
  power plant, etc.: not now).
- The phone's city scan currently covers x -40..770, z -30..1300 (it will be rescanned to include the city).

DONATING'S HEIST MECHANICS THAT EXIST (use these; see CLAUDE.md for the exact rules and limits):
- A heist = a WorldGuard cuboid region heist_<id> (basement to roof, under 100,000 blocks, regions never overlap, room reset
  from a snapshot one 32^3 section a second) + /dheist data: difficulty 0-4 (0 = store), name, escape clock (default 4/6/8/10
  min for d1-4), cooldown (6/10/15/30 min), loot pool, robber level needed (defaults d1 0, d2 5, d3 20, d4 45), advanced
  (alarm + cops; default only d4), pvp, police; exit spot 5-15 blocks outside the door (not in a heist or a safe zone);
  hologram spot; lockdown boxes over windows (advanced: they shut when the alarm trips); cop spots outside (street corners).
- Loot (/dloot): piles (pieces lying on <= 12 cells of one layer, styles cash $100/0.8s, jewel $250/1.0s, gold $500/1.5s,
  goods $200/1.0s, art $2,000/3.0s, register; at most 24 pieces a pile; value rolled per opening in a min-max range); gates:
  smash (glass, hold 1.5 s, <= 27 blocks), safe (a 4-digit code keypad, needs a Safe Kit, the opener gets a head start on
  the piles behind it), drill (a vault door: mount a Drill, it drills 60 s with timing-minigame jams, trips the alarm in
  advanced heists, the last fixer gets the head start); piles can sit behind a gate (behind=<gate n>).
- Traps (/dtrap): lasers (static or blinking, any angle; jump under 1.27, duck 1.49-1.78), pressure plates, collapsing floors
  over a pit >= 2 deep (pit inside the region), cameras (view cone; trip the alarm in advanced heists, or turrets that shoot).
  Traps hurt, never kill outright; keep traps >= 2 blocks inside the region edge.
- The alarm (advanced heists): 20 s warning, then cop assaults in waves (Citizens + Sentinel NPCs at the heist's cop spots,
  stronger per difficulty), windows lock down, the robbers are WANTED until they get out of the chase radius; a getaway
  (losing the cops with the run's loot) is a progress event.
- Stores (difficulty 0) have a clerk you hit to open the register; the town's Donut Shop and Gas Station are stores already.
- The escape clock starts at the first robbery; everything emptied halves the time left; 0:00 loses that run's loot.
- Prison-only mechanics that exist and could be borrowed by NEW Skript work: keycards and keycard readers that open doors,
  C4 planted on a gate (a timed breach that opens blocks for a while), a punch box, hold-right-click search spots, NPC guards
  with view cones (jailcops.sk), handcuffs. A design MAY propose up to 3 new mechanics (e.g. a keycard taken from a
  manager, a laser grid you switch off at a fuse box, thermite on a door, a hackable panel, a vault timer), each with a short
  exact spec, but every heist MUST work at launch with the existing mechanics alone (a new mechanic is a bonus layer).

WHAT THE STORY NEEDS FROM HEISTS (core.sk story::*::needs, checked at the level a mission starts):
- Mara chapter 1 "rob a heist" (any heist the player can enter); chapter 2 at level 5: crack a SAFE (so a difficulty-2 heist,
  level 5, needs a safe); chapter 3 at level 20: DRILL a vault (a d3 heist, level 20, needs a vault door) and rob 3 different
  heists; chapter 4 at level 45: a getaway from an ADVANCED heist and sales from a D4 heist; chapter 5 the FINALE: a safe, a
  vault and a getaway in ONE run of a difficulty-4 advanced heist.
- Vic the Fence: sales from d2+ heists, a safe in a d3+ heist, a vault drilled and the cops lost in one run (advanced + drill).
- So: Jewelry Store = difficulty 2 with at least one safe; Bank = difficulty 3 with a vault door (and safes); Museum =
  difficulty 4, advanced, with a safe AND a vault door and a real getaway route (the finale). (A designer may argue for
  different numbers but must keep every need covered.)

BUILD RULES (from the town's PLAN.md sections 10-11 and CLAUDE.md):
- Builds are written in code: modules that fill a Build (tools/build/mcstruct.js: set(x,y,z,state), fill, box) with block-state
  strings, previewed with tools/build/render.js, pasted later. Block states must exist in 26.1.2.
- Practical, not roleplay: build for how players use a place (walking in to rob it, running out); good design welcome.
- Never on open-sky surfaces at street height: black/gray/white/yellow concrete and black/gray concrete powder (the GPS road
  scan reads them as streets); use smooth_quartz, calcite, gray_terracotta, polished_deepslate for roofs.
- Keep out of players' reach: containers, beds, anything with a menu, cakes, candles, banners, decorated pots, chiseled
  bookshelves, shelves, item frames, paintings, armor stands. Loot is item displays spawned by loot.sk, not blocks.
- A loot pile's cells need 2..3 air above them; collapsing-floor pits >= 2 deep inside the region; heist regions < 100k blocks.
- Heists must not touch safe zones; exits outside every heist and safe zone; cop spots outside heists and safe zones.

HARD RULES FOR YOU (the server is busy running bot tests):
- Never send RCON commands, never run bots, never edit Skript files or anything outside the files your task names, never commit.
- Write only the files your task names. Reading anything is fine. Web research is fine (WebSearch / WebFetch via ToolSearch).
- Copyright: describe and summarise, never copy long text from websites.
`

phase('Plan')
const plan = FROM !== 'plan' ? 'skipped: PLAN.md was written before' : await agent(CONTEXT + `

YOUR TASK: write the city's build plan, ${ROOT}/tools/build/city/PLAN.md, from ${SP}/decision.md, the way
tools/build/town/PLAN.md is written for the town (read it, especially sections 8-11, and how town.js and a module like
tools/build/town/donut.js work). The plan is what parallel builders follow, so the numbers in its tables are the truth:
- 0. The city in one paragraph; why here.
- 1. Frame: the city box (x, z bounds), ground y 64, how it meets the prison's highway at x 480 (match its z 416..444 layout:
  sidewalks, curbs, lines) and stays clear of the town's ridge (ridgeFoot, RIDGE in tools/build/town/approach.js) and the
  prison box.
- 2. A map sketch.
- 3. Streets (module streets): exact cells, surfaces, lines, sidewalks, lamps, crossings; plus land (grass, trees) if needed.
- 4.-6. One section per heist building (modules jewelry, bank, museum): exact box, floors and their y, every room with its
  coordinates, materials and look (detailed Minecraft style like the prison's and the town's; follow the decision's look),
  entrances, windows, roof, back exits; the props (practical, no props nobody uses).
- 7. Gameplay: regions (heist_<id> cuboids, < 100k blocks each, not overlapping), every /dheist setting, every /dloot gate and
  pile with exact block coordinates and settings, every /dtrap with exact coordinates and settings, lockdown boxes, cop spots,
  exit spots, hologram spots, POIs, and the setup order as commands (like the town's section 8.3); GPS path nodes for the
  streets (ids from 3001) linked to the prison's graph near the highway's east end (read tools/jail-gps-paths.txt for the
  nearest prison node on the highway, or say how to link).
- 8. COMMON for city modules (shared helpers, the frame, each module's box, ownFor) to copy verbatim, like the town's section 9.
- 9. Modules for parallel builders: the split (streets, jewelry, bank, museum; one more only if needed), block budgets,
  the module file pattern (same as the town's 10.2 with labels/displays/points/setup/gps exports), tools/build/city.js
  (a mirror of tools/build/town.js: build, check, setup, gps, paste, labels, displays) and its checks (the town's list adapted:
  blocks in own columns, loot cells 2..3 air above, traps >= 2 inside the region, pits inside the region, regions < 100k,
  exits/cops outside heists and safe zones, no road blocks on open-sky surfaces, block states against the registry via
  --registry <blocks.json>).
- 10. New mechanics (if the decision kept any): exact Skript specs (which script, commands, data, settings in core.sk,
  tests), marked as a later step after the buildings.
- 11. Checks every builder runs (offline): node tools/build/city.js check --registry ${SP}/blocks-26.1.json, render.js
  previews (top, plan at each floor, iso) into ${SP}/render/<module>.
- 12. Open questions for the owner, each with the default built.
Write PLAN.md section by section as you go (create it early, then add to it), so a run cut off by a usage limit leaves a partial plan.
If ${ROOT}/tools/build/city/PLAN.md already exists without its section 12 (an interrupted run), continue it instead of starting over.
A plan-layout.js from an interrupted run (2026-10-27) may exist: check it against your plan, then fix or rewrite it.
Write ONLY ${ROOT}/tools/build/city/PLAN.md (and optionally ${ROOT}/tools/build/city/plan-layout.js, a build module that
draws the plan's footprints for render.js like tools/build/town/plan-layout.js). Return a 15-line summary.`, { label: 'planner', phase: 'Plan' })

phase('Critique')
const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          where: { type: 'string' },
          problem: { type: 'string' },
          evidence: { type: 'string' },
          fix: { type: 'string' },
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
        },
        required: ['where', 'problem', 'evidence', 'fix', 'severity'],
      },
    },
  },
  required: ['findings'],
}
const crit = FROM === 'fix' ? null : await agent(CONTEXT + `

YOUR TASK: critique ${ROOT}/tools/build/city/PLAN.md hard, as the person who must make it work on the server. Check against the
REAL code, not the plan's claims:
- heists.sk / loot.sk / traps.sk / cops.sk refusals: every /dloot gate and pile (cells per pile, layers, 2..3 air above, gates
  all solid and <= 27 blocks, behind=, style names, value ranges with whole pieces, <= 24 pieces), every /dtrap (inside the
  region by >= 2, pit depth and inside the region, laser heights vs the jump/duck table, camera range/angle), every region
  (< 100k blocks, no overlap, exits 5-15 blocks outside and not in a heist/safe zone, cop spots outside), command syntax.
- The story's needs (Mara c2 safe at level 5, c3 drill at level 20 and heist3, c4 adv/d4 at 45, c5 finale safe+vault+getaway
  in one d4 run; Vic) are really covered at the right levels.
- Geometry: the city box clear of the prison (x <= 480) and the town (approach z 471..728 x 120..770 with its ridge), the
  highway joint matching z 416..444, coordinates consistent across sections and tables, rooms that fit their buildings,
  stairs that climb, doors that connect, a walkable route in and out.
- Balance: clear time vs the escape clock, pools vs core.sk defaults.
- Buildability: block budgets, module boxes not overlapping, the open-sky road-block rule, keep-out blocks, states that exist.
Before returning, write every finding to ${SP}/critique.md (where, severity, problem, evidence, fix), so a later session can run only the fix.
Return every finding with evidence (file:line or the exact number) and a concrete fix.`, { label: 'critic', phase: 'Critique', schema: FINDINGS })

const keep = (crit && crit.findings ? crit.findings : []).filter(f => f.severity !== 'minor' || true)
log('Critic findings: ' + keep.length)

phase('Fix')
const fixed = (keep.length || FROM === 'fix') ? await agent(CONTEXT + `

YOUR TASK: fix ${ROOT}/tools/build/city/PLAN.md (and plan-layout.js if it exists) for these critic findings. Check each against
the code first; fix the real ones, and for any you reject write one line why in a "Critique log" section at the end of the plan.
Keep the plan internally consistent (every table and section agreeing).
FINDINGS:
${keep.length ? JSON.stringify(keep, null, 1) : 'Read them from ' + SP + '/critique.md.'}
Write that list to ${SP}/fixes.md too (the sign the fix step finished).
Return a list: each finding -> fixed / rejected (why).`, { label: 'fixer', phase: 'Fix' }) : 'no findings'

return { plan, findings: keep.length, fixed }
