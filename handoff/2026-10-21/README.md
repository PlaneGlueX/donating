# Handoff 2026-10-21: the town's last buildings, fuel, stolen bikes (cloud → local)

A cloud session did the other session's list (the owner: "plans, scripts, builds, then local checks in the end"):

| Asked | Done here | Left for the local session |
|---|---|---|
| Wire up the 8 built parts (SETUP.md: shopkeepers, safe zones, GPS paths, stores) | nothing (it needs the server) | SETUP.md parts A and B, as written |
| The bike shop in front of the prison, bikes stolen with a quick-time event | `tools/build/jail/bikeshop.js`, `bikes.sk`, `bots/scenarios/bikes.js` | the paste, the wrap, the tests, the client |
| The 6 missing buildings | `dealer.js`, `houses.js`, `safehouse.js`, `scrapyard.js`, `pawnshop.js`, `poolhall.js` | the paste, the client against the wiki |
| The gas station (the owner: keep it as built; fuel for cars like a real pump: grab it, fill, wait until full, pay, tanks per car) | `fuel.sk`, DonatingPhone `/dphone carfuel`, MTVehicles' fuel on, the garage's Refuel, `bots/scenarios/fuel.js` | the plugin build, the tests, the client |

**Nothing here has run on a server or in a client.** The Skript files have never been parsed by Skript; the Java was only
compiled on its own (CarStats.java) and run against MTVehicles-shaped stubs. Expect a first round of fixes.

What did run (offline): `town.js check --seal --registry` (all 14 town modules: every block state in the 26.1.2 registry,
no overlaps, regions, crate stands, car spots, GPS links, sealed hills), `jail.js check` (every escape check, with the bike
shop in), `make-jail-gps-paths.js` (2 new nodes, nothing renumbered), `jail.js points` (5 new points), renders of every
building. The wikis (jailbreak.fandom.com, gta.fandom.com, static.wikia.nocookie.net) were blocked here, so the looks come
from the plan and text descriptions; compare them with the pictures in the client.

## The order on the PC

1. **Merge** this branch (draft PR into `claude/jailbreak-map`) or check it out. With the server stopped:
2. **The Scrapper wrap**: `tools\node\node.exe tools\make-car-wraps.js` (adds the wrap's variants to
   `server\plugins\MTVehicles\vehicles.yml`, `carwraps.sk` and the pack's models; every existing variant keeps its damage
   and uuid, by name). Then `tools\node\node.exe tools\build-pack.js`.
3. **The plugin**: `tools\build-plugin.ps1` (CarStats' fuel and `/dphone carfuel`; PhonePlugin.java was edited by hand
   and not compiled: the carfuel block, the `Locale` import, the tab list and help line).
4. **Start** (`Playtest.bat start`) and read the report: the scripts never parsed are `fuel.sk`, `bikes.sk`, and the edits
   in `core.sk` (fuel, tanks, bike settings, the Scrapper wrap retired), `garage.sk` (Refuel button, screen "options",
   carAction "fill"), `carcam.sk` (⛽ on the line), `help.sk`, `tabcomplete.sk` (/dfuel, /dbike, /dsetup fuel), `setup.sk`
   (setupFuel), `zz-testkit.sk` (/zzfuel, /zzbikelook, /zzbike). Fix until all load clean.
5. **Bots**: `bots\run.js fuel` (14 checks) and `bots\run.js bikes` (10; it uses `/zzbikelook set` if the wrap isn't
   there), then the ones the edits touch: `garage`, `cars`, `carcam`, `citygarage`, `menus`, `setup`, `tabcomplete`,
   `contracts` (fuel.sk's enter handler runs before contracts.sk's), `gpspaths` and the `prison-*` scenarios (outdoors.js
   changed near the gate).
6. **Wire the 8 built parts**: SETUP.md parts A (now) and B (at launch), unchanged from the local session's version.
7. **Paste the new parts** (with the owner's OK): SETUP.md part C0-C4: `TOWN_ONLY=dealer,houses,safehouse,scrapyard,pawnshop,poolhall`
   then `town.js paste`, `town.js labels`, `town.js displays`; `jail.js paste --box 304,398,347,415;316,416,321,418` and
   `jail.js labels`; the setup lines (`town.js setup --world jailbreak`: regions, the Car Dealer, the four quest givers,
   the crate stands, the 12 pumps) and the four `dbike spotat` lines; the new lines of `tools/jail-gps-paths.txt`.
   `/dsetup` (its `fuel` section) afterwards.
8. **The client** (computer use, with the wiki pictures): PLAYTEST 224-229. Each building against its pictures
   (`dealership_1m`, `houses`, `modern_town_home`, `rentable_house`, `town_birdseye`), the stairs in the dealership
   (headroom on both flights), the showroom cars' size on the floor, the safehouse's porch stands and holograms, the
   Pool Hall's 8-ball and neon, the bike shop next to tower T11. Then fill a car at the gas station and steal a bike.

## Things to look at first (the cloud's own doubts)

- **fuel.sk's two event handlers**: the pump click (`on right click with priority low`, cancelled) must beat phone.sk and
  WeaponMechanics; the nozzle on a car (`on mtv vehicle enter with priority lowest`, cancelled) must keep garage.sk's and
  contracts.sk's handlers from running. If Skript doesn't take a priority on MTVehicles' event, the nozzle click gets you in
  the car instead.
- **The nozzle** is a plain stick (custom model data `donating:nozzle`, no art in the pack yet).
- **`/dphone carfuel`** runs from the console every second per driver and per filler (`quiet`: no console line). If that
  turns out noisy or slow, a metadata read per tick in Java would replace it.
- **Bikes**: the parked bike is the car icon (a diamond hoe of the Scrapper motorbike's damage) at the garage bays' lift and
  scale; check its size and height against a real bike. The bike is put on with MTVehicles' mount effect (no enter event);
  if the thief isn't seated, the action bar says "Right-click the bike to get on".
- **The dealership's switchback stairs**: worked out on paper (heights and the cut in the slab above flight B); walk them.
- **Houses**: a kit from PLAN 7's table; H5's periwinkle is light blue concrete (the powder would fall over a window).
- **The Scrap Yard** may look sparse next to the wiki's style of the town; add wrecks if so.

## Commits

- `0f0c8ab` the dealer, the Pawn Shop, the Pool Hall; town.js addat at launch
- `af2190a` the houses, the safehouse, the scrap yard
- `131491c` the bike shop (prison module), outdoors.js, the GPS route, jailpoints.sk
- `6d85d65` fuel.sk, bikes.sk, CarStats/PhonePlugin, MTVehicles configs, the Scrapper wrap, scenarios
- the docs commit: SETUP.md part C, PLAN.md as-built notes, DEPLOY.md, PLAYTEST 224-229, CLAUDE.md, this file

## Text sources used (no pictures could be fetched)

Search results (snippets only) from these pages informed the looks; nothing was copied:
- https://jailbreak.fandom.com/wiki/1M_Dealership
- https://jailbreak.fandom.com/wiki/Locations
- vintageisthenewold.com (a Jailbreak FAQ), sportskeeda.com (Jailbreak's bikes), a breezewiki mirror of the Jailbreak wiki
