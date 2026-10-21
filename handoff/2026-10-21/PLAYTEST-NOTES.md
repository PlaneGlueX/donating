# Handoff 2026-10-21 (night): the owner's 10/20 prison playtest notes and the city items (cloud → PC)

The owner's 14 notes, built by a cloud session on `claude/dreamy-mendel-ouutfb` (PR #4 into `claude/jailbreak-map`).
**Nothing here has run on a server or in a client.** The Skript edits were never parsed by Skript, and the Java was only
parsed (javac stopped at the parse step: no Paper classpath here). Expect a first round of fixes.

| # | The note | Done here | PLAYTEST |
|---|---|---|---|
| 1 | Guards 20, 30 while more than 3 are in | 20 new routes in the build (all walk in the escape checker), core.sk rosters, jailcops.sk busy tier | 232 |
| 2 | Owned guns inside; any weapon held = contraband; a gun seen: stronger guards and backup | shop.sk, prison.sk, jailcops.sk (ARMED) | 233 |
| 3 | Guards see through gates, fences, bars | jailcops.sk jcopClearView | 234 |
| 4 | No HIGH VOLTAGE plates; a shock on contact | outdoors.js, jail.js (fence cells), prison.sk | 235 |
| 5 | The parkour gate as wide as the gap, sliding; the box to its right | outdoors.js, buildings.js, zones.js, jailescape.sk | 236 |
| 6 | A dugout under a lot fence | outdoors.js, zones.js, the checker's step 14, jailescape.sk, the GPS paths | 237 |
| 7a/b | The tutorial: skip owned items; a quiet chat | jailcourse.sk, chat-extras.sk, join-quit.sk, core.sk | 238 |
| 7c/d | Lefty: pick the way; the head-start checklist | core.sk, story.sk, jailjobs.sk, progress.sk, prison.sk | 239 |
| 8 | A compact sidebar | TAB config.yml, placeholders.sk | 241 |
| 9 | A GPS path wand and menu | DonatingPhone PathWand.java, Paths.java | 242 |
| 10 | Cars: smoother entry, F locks, the map while driving | CarCam.java, PhonePlugin.java, garage.sk, phone.sk, carcam.sk, filled_map.json | 243 |
| 11 | Messages: delete | messages.sk, the bin icon | 244 |
| 12 | No maximum level on robberies | heists.sk, bag.sk, ranks.sk, gps.sk, pvp.sk, setup.sk, core.sk | 245 |
| 13 | Signs in fonts | six OFL fonts in the pack, tools/build/signfonts.js, jail.js and town.js labels | 246 |
| 14 | Fuel 2-4x slower; a Fuel Tank upgrade | core.sk, fuel.sk, garage.sk (in-game money: not in MONETIZATION.md) | 247 |

Ran offline: `jail.js check` (all 14 steps, ~4 min), `jail.js points` (299 points, 30 routes, 58 zones, 677 fence cells,
4 breaches), `make-jail-gps-paths.js` (203 nodes, 210 links; it now keeps a spot's old id: LOT_EXIT is still 187, which
the town's GPS file links to), `make-phone-ui.js` (the bin icon), every edited bot scenario loads in Node.

## The order on the PC

1. **Merge** this branch into `claude/jailbreak-map` (PR #4) or check it out. `Playtest.bat stop`.
2. **The plugin**: `tools\build-plugin.ps1`. New: `PathWand.java` (registered in PhonePlugin's onEnable). Changed:
   `CarCam.java` (the chase view pauses while the big map is open, `paused`; the key picked at the camera's spawn),
   `Paths.java` (the wand's operations, `move|name|select|wand`, the selected node's ring), `PhonePlugin.java` (the
   strip "R: map  F: lock", the usage line). Watch for API slips: `Block#getCollisionShape()`,
   `Player#sendActionBar(Component)`, `ItemMeta#setEnchantmentGlintOverride`.
3. **The pack**: `tools\node\node.exe tools\make-phone-ui.js` (committed already: a rerun changes nothing), then
   `tools\node\node.exe tools\build-pack.js` (the six fonts under `donating/font`, `filled_map.json`'s
   `hand_animation_on_swap: false`). build-pack.js checks resource names: the font files are lower case.
4. **Start**: `Playtest.bat start`. core.sk loads fresh, so the prison switch is off: `/console zzcfgbool prison::enabled
   true` (or the tests' own switch) when testing the prison. Fix the report until clean. Scripts edited here: `core.sk`,
   `jailcops.sk`, `jailescape.sk`, `jailcourse.sk`, `jailjobs.sk`, `jailpoints.sk` (regenerated), `prison.sk`,
   `story.sk`, `progress.sk`, `shop.sk`, `chat-extras.sk`, `join-quit.sk`, `placeholders.sk`, `heists.sk`, `bag.sk`,
   `ranks.sk`, `gps.sk`, `pvp.sk`, `setup.sk`, `garage.sk`, `fuel.sk`, `bikes.sk`, `messages.sk`, `phone.sk`,
   `carcam.sk`, `help.sk`, `zz-testkit.sk` (/zzjailbusy, /zzshopact, /zzjailsees fence=). TAB: `/tab reload` for the
   sidebar (or the restart).
5. **The prison's build** (with the owner's OK; server running):
   ```
   tools\node\node.exe --max-old-space-size=6000 tools\build\jail.js paste --box "326,236,341,290;102,356,116,366;380,350,382,393;114,395,244,397;300,395,377,397;109,296,111,392;338,236,340,350;339,348,377,350"
   tools\node\node.exe tools\build\jail.js labels
   tools\node\node.exe tools\build\town.js labels
   ```
   The boxes: the parkour gap, the old and new punch box and the police apron; the dugout; every fence that had HIGH
   VOLTAGE plates (F1, F2 west and east, F3, F7, the annex's south fence). `labels` replaces the text displays (the
   HIGH VOLTAGE ones go; every sign gets its font once the pack is live). If unsure, a full `jail.js paste` covers it.
6. **The GPS**: run every line of `tools\jail-gps-paths.txt` (its first line clears the jailbreak world's graph), then
   every line of `tools\build\town\town-gps-paths.txt`; then `tools\node\node.exe tools\make-jail-gps-paths.js --check`
   (every node against the pasted world). Old ids are kept (LOT_EXIT 187, BIKE_SHOP 199); new: PUNCH_STAND 200,
   PUNCH_IN 201, the dugout 203-208.
7. **Bots** (each prison one on its own, the prison switched on for it; they put it back):
   `prison-cops` (+9 checks: 20, busy 30, back to 20, a 10 roster; a knife and a gun held out; ARMED, the buff, 3 extras,
   calm again; bars and stone in the lot), `prison-rules` (+7: the fence shock and its floor, no plate; a gun taken out,
   one magazine a stay, the refusals), `prison-escape` (+8: the box's new spot, the slide open and shut, the dugout
   closed, the prompt, dug, escaped, caving in, the cooldown, the plug in the closed-prison walk), `prison-course` (+2:
   the keycard skip, the quiet chat), `prison-missions` (rewritten Lefty flow: the way menu, a change of way, the head
   start, l_c4 and l_c4lot to the escape; Sparks' crafting as a head start), `prison-respawn`, `prison-exits`; then
   `boards` (+1 the sidebar wrap), `messages` (+4), `garage` (F, the map while driving), `carcam` (F, the map pausing the
   view), `gpspaths` (+4 the wand), `fuel` (+2 the Fuel Tank, the Sedan's new usage), `bikes`, `store`, `abuse`,
   `menus`, `tabcomplete`, `story`, `shop`, `setup`, `cars`, `citygarage`. `hits` with nobody else online.
8. **The 1 GB load test with 30 guards**: `Playtest.bat stop`, `Playtest.bat start 1G`, the prison on, then run
   `bots\run.js prison-cops`: its "busy: 30 cops known" step holds 30 guards with bots inside. Meanwhile read the tick and
   the heap the way the 2026-09-27 load test did (spark's tick numbers in latest.log; the heap of the java.exe using the
   most memory after a full GC; never `jcmd -l`). Write the numbers into CLAUDE.md's Local setup and PLAYTEST 232.
9. **The client** (yours): PLAYTEST 232-248: the gate's slide and the box's spot, the dugout, the fence shock, a gun
   inside and the ARMED backup, Lefty's menu, the sidebar at your GUI scale, the sign fonts in the town and the prison,
   the wand, getting into a car with a gun out, the big map while driving, deleting a text.

## Notes

- Lefty's old lessons `l_craft`, `l_donut` and `l_shop` are retired (story.sk passes over them): a player mid-chain moves
  on to `l_way` and picks a way. The donut, Sparks' weapon and the Gun Shop visit count on the head-start checklist.
- New Lefty lines have no voice takes: the dugout line in "Meet Lefty" ("Or skip the gate: there's a hole by the lot's
  west fence. Dig under it."), the `l_way` brief and the four pick lines, the new lessons' briefs.
- `zzjailroster` now clears the busy roster too; prison-cops ends with `/zzcfgreload` (core.sk's 20 and the busy 10).
- The chase view pauses for the big map (first person while it's open). If the owner wants the map without leaving the
  chase view, that's a client limit to research (a two-handed map faces the camera only at a steep pitch).
