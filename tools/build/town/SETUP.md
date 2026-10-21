# Mountainside: the setup commands

Written 2026-10-21 for the town south of the prison (PLAN.md). **Nothing on this page has been run.** Nothing of the town is pasted, and the server hasn't been touched.

Most lines come from the modules' `setup` exports, printed by:

```
tools/node/node.exe --max-old-space-size=6000 tools/build/town.js setup --world jailbreak   (now)
tools/node/node.exe --max-old-space-size=6000 tools/build/town.js setup --world world       (at launch)
```

If a module changes, print them again rather than trusting this page.

**What's built:** all 14 town modules: approach, streets, land, gunshop, donut, garage, gas and shops (pasted locally by the local session), and dealer, houses, safehouse, scrapyard, pawnshop and poolhall (built 2026-10-21 by a cloud session, checked offline with `town.js check --seal --registry`, never pasted). The prison has a sixth module, the bike shop (`tools/build/jail/bikeshop.js`). Part C has what's new; `town.js setup` prints the lines of every module.

**Tags on each line:**
- **(G)**: type it in game, standing in that world.
- **(C)**: run it from the console: the Minehut console panel, locally `tools\rcon.ps1 "<line>"`, or `/console <line>` in game.

**Coordinates:**
- Players stand at y 65.
- Yaw: 0 south, 90 west, 180 north, -90 east.
- A coordinate written as a whole number means the block's centre.

## 0. First: the paste (needs the owner's OK; never while another workflow tests on the server)

```
tools/node/node.exe --max-old-space-size=6000 tools/build/town.js check --seal       must end "all checks passed"
tools/node/node.exe --max-old-space-size=6000 tools/build/town.js paste              1,286,099 blocks, 468 pieces of 48x48 (243 + 225 in mcstruct's second pass for hung blocks)
tools/node/node.exe tools/build/town.js labels                                        170 text displays (tag town_label)
tools/node/node.exe tools/build/town.js displays                                      168 item displays (tag town_display)
tools/node/node.exe tools/build/town.js biomes --apply                                188 fillbiome boxes (the river's colour)
```

- The paste writes only inside the town box: x 120..770, z 471..1300, y 55..148.
- Nothing goes into the prison's box (x -40..480, z -30..470). The road joins the prison's road at z 470/471.
- About 215,000 of the blocks are air: the river, the lake and the tunnel's bore.
- `paste --box x1,z1,x2,z2[;...]` pastes only part of the town. `TOWN_ONLY=donut,gas` pastes only those modules.

Then (C), because the hollow hills spawn mobs in the dark (PLAN Q16):

```
execute in minecraft:jailbreak run gamerule spawn_mobs false
```

## A. Works in the jailbreak world now

### A1. Regions (6)

(G) in the jailbreak world, then (C) for the flags. `/dheist create` (A2) sets the store regions' passthrough and explosion flags again; that's harmless.

```
(G) //pos1 472,63,774
(G) //pos2 547,95,833
(G) /rg define safe_gunshop
(C) rg flag -w jailbreak safe_gunshop passthrough allow
(C) rg flag -w jailbreak safe_gunshop weapon-shoot deny
(G) //pos1 515,64,787
(G) //pos2 544,76,820
(G) /rg define safe_gunrange
(C) rg flag -w jailbreak safe_gunrange passthrough allow
(C) rg flag -w jailbreak safe_gunrange weapon-shoot allow
(C) rg setpriority -w jailbreak safe_gunrange 10
(G) //pos1 401,63,782
(G) //pos2 430,76,827
(G) /rg define heist_donut
(C) rg flag -w jailbreak heist_donut passthrough allow
(G) //pos1 328,63,785
(G) //pos2 385,90,842
(G) /rg define safe_garage_town
(C) rg flag -w jailbreak safe_garage_town passthrough allow
(C) rg flag -w jailbreak safe_garage_town weapon-shoot deny
(G) //pos1 370,63,885
(G) //pos2 391,75,930
(G) /rg define heist_gas
(C) rg flag -w jailbreak heist_gas passthrough allow
(G) //pos1 467,63,870
(G) //pos2 499,100,966
(G) /rg define safe_shops
(C) rg flag -w jailbreak safe_shops passthrough allow
(C) rg flag -w jailbreak safe_shops weapon-shoot deny
```

What each region is:
- **safe_gunshop**: the shop, the range and the front lawn.
- **safe_gunrange**: the booths and lanes. Shooting is allowed there and PvP stays off, because its id starts with "safe".
- **safe_garage_town**: the garage, its apron and the cut onto 1st Street, the lot's only way in.
- **safe_shops**: the Gear Shop and the Bag Shop, not their rear lot.
- **heist_donut** and **heist_gas**: the two stores.

### A2. Stores (difficulty 0)

Type `/dheist create` in game: it finds `heist_<id>` in the world you stand in. Run the rest from the console: the commands use the heist's own world.

```
(G) /dheist create donut 0
(C) dheist set donut name Donut Shop
(C) dheist exit donut 435.5 65 804.5 -90
(C) dloot add donut pile 412 65 800 412 65 802 value=1800-3000 style=register piece=125 name=Front_register
(C) dloot check donut
(C) dheist snapshot donut        (the front doors 430 65 804..805 closed)
(C) dheist holo donut 431.5 67.5 811.5
(C) dheist enable donut

(G) /dheist create gas 0
(C) dheist set gas name Gas Station
(C) dheist exit gas 397.5 65 907.5 -90
(C) dloot add gas pile 386 65 914 386 65 915 value=1500-2400 style=register name=Register
(C) dloot add gas pile 380 65 890 380 65 890 value=300-600 style=register name=Lottery_till
(C) dloot check gas
(C) dheist snapshot gas          (the front doors 391 65 907..908 and the staff door 380 65 885 closed)
(C) dheist holo gas 392.5 69.6 907.5
(C) dheist enable gas
```

- Each store is $1,800-3,000 a run, inside the store pool of $3,000.
- `dheist holo` with x y z puts the hologram exactly there. The donut's floats over the apron, clear of the doorway. The gas station's sits under the sign band.
- `dheist enable` resets the room from the snapshot, then opens the store.

### A3. Shopkeepers (G)

Each shopkeeper stands where you stand and faces your way, so tp there first, then add it:

```
/minecraft:tp @s 496.5 65 803.5 90 0     then   /dshopkeeper add gun      (behind the long counter, facing the door)
/minecraft:tp @s 487.5 65 880.5 90 0     then   /dshopkeeper add gear
/minecraft:tp @s 487.5 65 891.5 90 0     then   /dshopkeeper add tools
/minecraft:tp @s 486.5 65 927.5 90 0     then   /dshopkeeper add bag      (behind the red counter)
```

`town.js check` checked that all four stand in a safe zone with room to stand.

The garage attendant waits for launch (B2): garage sites only work in the main world.

### A4. GPS paths for the new roads (C)

- Run every line of `tools/jail-gps-paths.txt` first. Its first line, `dphone path clear jailbreak confirm`, clears the whole world's graph.
- Then run every line of `tools/build/town/town-gps-paths.txt`. That file is written by `town.js gps`, and the lines below are the same.
- After any later reload of the prison's file, run the town's file again.
- The spine starts at the prison's node 187 (LOT_EXIT, outside the front gate). From there it runs along the highway, down the N-S road, through the tunnel and over the bridge, then down Main Street.
- There's a loop round the town, 2nd Street, Birch Court, every shop door, and the water tower's stairs.
- The doors of the dealer (1046), the Safehouse (1047) and the Scrap Yard (1048) are already in: their buildings aren't built yet, so a pin there just leads to an empty plot.
- Ids 1001..1053 don't collide with the prison's 1..197 or the tests' 9001..9008.

The file starts with `dphone path remove 1001` ... `remove 1053`, so a second run is safe. The rest is:

```
dphone path addat jailbreak 260.5 65 426.5 id=1001 nolink HIGHWAY_GATE
dphone path addat jailbreak 448.5 65 426.5 id=1002 nolink JUNCTION
dphone path addat jailbreak 448.5 65 490.5 id=1003 nolink APPROACH
dphone path addat jailbreak 448.5 65 502.5 id=1050 nolink CLIMB
dphone path addat jailbreak 448.5 71 550.5 id=1004 nolink TUNNEL_N
dphone path addat jailbreak 448.5 71 614.5 id=1005 nolink TUNNEL_S
dphone path addat jailbreak 448.5 65 688.5 id=1006 nolink BRIDGE_N
dphone path addat jailbreak 448.5 65 730.5 id=1007 nolink MAIN_N
dphone path addat jailbreak 448.5 65 790.5 id=1008 nolink MAIN_SHOPS
dphone path addat jailbreak 448.5 65 853.5 id=1009 nolink MAIN_1ST
dphone path addat jailbreak 448.5 65 925.5 id=1010 nolink MAIN_GAS
dphone path addat jailbreak 448.5 65 997.5 id=1011 nolink MAIN_2ND
dphone path addat jailbreak 448.5 65 1055.5 id=1012 nolink MAIN_DEALER
dphone path addat jailbreak 448.5 65 1117.5 id=1013 nolink MAIN_HILL
dphone path addat jailbreak 360.5 65 853.5 id=1014 nolink
dphone path addat jailbreak 520.5 65 853.5 id=1015 nolink
dphone path addat jailbreak 295 65 861 id=1016 nolink NW_CORNER
dphone path addat jailbreak 561 65 861 id=1017 nolink NE_CORNER
dphone path addat jailbreak 288 65 911.5 id=1018 nolink ELM_SAFEHOUSE
dphone path addat jailbreak 288 65 997.5 id=1019 nolink ELM_2ND
dphone path addat jailbreak 288 65 1060.5 id=1020 nolink
dphone path addat jailbreak 295 65 1111 id=1021 nolink SW_CORNER
dphone path addat jailbreak 337.5 65 1117.5 id=1022 nolink HILL_BIRCH
dphone path addat jailbreak 520.5 65 1117.5 id=1023 nolink
dphone path addat jailbreak 561 65 1111 id=1024 nolink SE_CORNER
dphone path addat jailbreak 568 65 925.5 id=1025 nolink
dphone path addat jailbreak 568 65 997.5 id=1026 nolink EAST_2ND
dphone path addat jailbreak 568 65 1053.5 id=1027 nolink EAST_SCRAP
dphone path addat jailbreak 360.5 65 997.5 id=1028 nolink
dphone path addat jailbreak 520.5 65 997.5 id=1029 nolink
dphone path addat jailbreak 337.5 65 1160.5 id=1030 nolink
dphone path addat jailbreak 337.5 65 1176.5 id=1031 nolink BIRCH_CIRCLE
dphone path addat jailbreak 476.5 65 802.5 id=1040 nolink GUN_SHOP
dphone path addat jailbreak 431.5 65 804.5 id=1041 nolink DONUT
dphone path addat jailbreak 352.5 65 830.5 id=1042 nolink GARAGE
dphone path addat jailbreak 392.5 65 907.5 id=1043 nolink GAS
dphone path addat jailbreak 468.5 65 885.5 id=1044 nolink GEAR_SHOP
dphone path addat jailbreak 468.5 65 926.5 id=1045 nolink BAG_SHOP
dphone path addat jailbreak 501.5 65 1072.5 id=1046 nolink DEALER
dphone path addat jailbreak 267.5 65 911.5 id=1047 nolink SAFEHOUSE
dphone path addat jailbreak 584.5 65 1053.5 id=1048 nolink SCRAP_YARD
dphone path addat jailbreak 402.5 65 953.5 id=1049 nolink GAS_FORECOURT
dphone path addat jailbreak 499.5 65 1117.5 id=1051 nolink HILL_STAIRS
dphone path addat jailbreak 499.5 65 1128.5 id=1052 nolink STAIRS_FOOT
dphone path addat jailbreak 499.5 85 1176.5 id=1053 nolink WATER_TOWER
dphone path link 187 1001
dphone path link 1001 1002
dphone path link 1002 1003
dphone path link 1003 1050
dphone path link 1050 1004
dphone path link 1004 1005
dphone path link 1005 1006
dphone path link 1006 1007
dphone path link 1007 1008
dphone path link 1008 1009
dphone path link 1009 1010
dphone path link 1010 1011
dphone path link 1011 1012
dphone path link 1012 1013
dphone path link 1009 1014
dphone path link 1014 1016
dphone path link 1016 1018
dphone path link 1018 1019
dphone path link 1019 1020
dphone path link 1020 1021
dphone path link 1021 1022
dphone path link 1022 1013
dphone path link 1023 1024
dphone path link 1024 1027
dphone path link 1027 1026
dphone path link 1026 1025
dphone path link 1025 1017
dphone path link 1017 1015
dphone path link 1015 1009
dphone path link 1011 1028
dphone path link 1028 1019
dphone path link 1011 1029
dphone path link 1029 1026
dphone path link 1022 1030
dphone path link 1030 1031
dphone path link 1040 1008
dphone path link 1041 1008
dphone path link 1042 1014
dphone path link 1043 1049
dphone path link 1049 1010
dphone path link 1044 1010
dphone path link 1045 1010
dphone path link 1046 1012
dphone path link 1047 1018
dphone path link 1048 1027
dphone path link 1013 1051
dphone path link 1051 1023
dphone path link 1051 1052
dphone path link 1052 1053
```

What was checked:
- `town.js check`: every link is clear at head height over the town's blocks.
- A separate check over the prison's build: the three links on the prison's road (187-1001, 1001-1002, 1002-1003) run over asphalt with nothing in the way.
- All 43 nodes in the town have a floor under them and room to stand.

### A5. The phone's map of the jailbreak world (C)

```
dphone city scan -40 -30 770 1300 0 jailbreak
```

- This replaces the prison-only scan (`-40 -30 480 470 0 jailbreak`) with the prison and the town together.
- At scale 0 (1 block a pixel) it's 811 x 1331 pixels, under the 2,048 limit.
- It reads about 4,400 chunks, which takes about 4-5 minutes at 15-20 chunks a second. It pauses while ticks run over 40 ms.
- Check it with `dphone city info` (`others=jailbreak`) and `dphone city pixel 448 900 jailbreak`.
- The map is drawn from above, so the hills show their tops and the tunnel doesn't show.

### A6. Checks afterwards

- `/dheist info donut` and `/dheist info gas`: both open, with their exits set.
- `/dloot check donut` and `/dloot check gas`.
- `/dshopkeeper list`.
- `dphone path info`, then pin the Gun Shop from the phone in the prison's lot: the route should follow the road through the tunnel.
- In the client: rob both registers, buy at all four keepers, and shoot in the range (PLAN 12).

## B. After the jailbreak map becomes the main world (`world`)

Everything in part A records the world name `jailbreak`:
- heists and their exits;
- the shopkeepers' spots;
- the regions' file, `plugins/WorldGuard/worlds/jailbreak/`;
- `paths.yml`;
- `cities/jailbreak.bin`.

So on the launch server (Minehut, a fresh setup), run the whole list again for `world` rather than moving those records. Before the first start, follow CLAUDE.md's "Importing the city world locally" (pool.yml, city.yml, roads.bin, walls.yml).

### B1. Everything in A again, for `world`

Print the list with `town.js setup --world world`. The lines are the same, with `-w world`.

### B2. The City Garage site "town" (C), and its attendant (G)

Garage sites (citygarage.sk) only work in the main world. List the bays first, in this order, so bay 1 is the west one, under the painted "BAY 1".

```
(C) dgaragesite bayat town 337.5 65 800.5 0
(C) dgaragesite bayat town 352.5 65 800.5 0
(C) dgaragesite exitat town 337.5 65 824.5 0
(C) dgaragesite exitat town 352.5 65 824.5 0
(C) dgaragesite returnat town 381.5 65 834.5 180
(C) dgaragesite holo town
(G) /minecraft:tp @s 344.5 65 806.5 0 0   then   /dshopkeeper add garage      (behind the office counter, facing the door)
```

Checked offline: every exit has a clear 3x3 spot, 2 high, on solid ground.

### B3. Points of interest (G)

`/dpoi add` only works in the main world (Q12 in PLAN 13 asks to allow `prison::world` now).

```
/minecraft:tp @s 476.5 65 802.5 0 0    then   /dpoi add shop Gun Shop
/minecraft:tp @s 468.5 65 885.5 0 0    then   /dpoi add shop Gear Shop
/minecraft:tp @s 468.5 65 926.5 0 0    then   /dpoi add shop Bag Shop
/minecraft:tp @s 352.5 65 830.5 0 0    then   /dpoi add garage Town Garage
/minecraft:tp @s 500.5 85 1176.5 0 0   then   /dpoi add landmark Water Tower
```

Mara's GPS finds shops by "Gun", "Bag", "Gear" or "Car" in the POI's name, so keep those words in the names.

### B4. The district

```
(G) //pos1 120,40,686
(G) //pos2 770,160,1300
(G) /rg define district_mountainside
(C) rg flag -w world district_mountainside passthrough allow
(C) ddistrict name mountainside Mountainside
```

### B5. GPS paths, the main city and the road grid

1. Rewrite the prison's paths for `world` (PowerShell), then run that file and the town's:
   ```
   (Get-Content tools\jail-gps-paths.txt) -replace ' jailbreak ', ' world ' | Set-Content -Encoding utf8 tools\build\town\jail-gps-paths-world.txt
   tools\node\node.exe --max-old-space-size=6000 tools\build\town.js gps --world world --out tools\build\town\town-gps-paths-world.txt
   ```
2. In DonatingPhone's `config.yml` under `gps:`, add the approach's slope blocks to `road-blocks`, so the climb and the descent read as road:
   `road-blocks: [black_concrete, gray_concrete, black_concrete_powder, gray_concrete_powder, white_concrete, yellow_concrete, blackstone, polished_blackstone, blackstone_slab, polished_blackstone_slab, smooth_quartz_slab, bamboo_slab]`.
   Then set `street-y-min: 62` and `street-y-max: 71`: the town is at y 64 and the tunnel's road at y 70. Run `dphone reload` after.
3. Draw the main city and the road grid (C):
   ```
   dphone city scan -40 -30 770 1300 0
   dphone city use scan
   dphone roads scan
   ```
4. What the grid still gets wrong whatever the band:
   - the hollow hills read as open flat land;
   - the tunnel reads as blocked if the band stops below y 70.

   The town's GPS paths cover every street within 24 blocks, so the grid only matters off the streets.
5. Run `/dsetup` and fix every ✘ it lists.

## C. The new parts (2026-10-21: the cloud session's builds, the fuel pumps, the bike shop)

None of this has been pasted or run. `town.js setup` prints every line below except the bike spots (a prison module).

### C0. The paste and the pack first
1. Paste the six new town modules (with the owner's OK): `TOWN_ONLY=dealer,houses,safehouse,scrapyard,pawnshop,poolhall` and `town.js paste`, then `town.js labels` and `town.js displays` (the showroom cars, the safehouse's map and papers, the scrap yard's displays). The Pawn Shop and the Pool Hall clear the old land the first paste put in their boxes (each module carries the old land's blocks as air).
2. Paste the prison's bike shop: `jail.js paste --box 304,398,347,415;316,416,321,418` (the module and the dropped curb across the sidewalk; it clears its box first: the first paste put an oak and a cypress there), then `jail.js labels`.
3. The stolen bikes' look: `tools\node\node.exe tools\make-car-wraps.js` (it adds the Scrapper wrap's variants to vehicles.yml and carwraps.sk, keeping every existing variant), `tools\node\node.exe tools\build-pack.js`, a restart (MTVehicles reads vehicles.yml at start). Until then `/dsetup fuel` says the bikes have no look and none are parked.
4. `tools\build-plugin.ps1` (DonatingPhone's `/dphone carfuel`), with the server stopped.

### C1. Regions (G and C)
`town.js setup` section 1: `safe_garage_dealer`, `safe_base_safehouse`, `safe_scrapyard`, `safe_pawnshop`, `safe_poolhall`, each with `passthrough allow` and `weapon-shoot deny`. The safehouse's id starts with `safe_base`: loot sells as you walk in. Crate stands only open in a safe zone, so define the regions before placing the stands.

### C2. Shopkeepers, quest givers, crate stands (G, C)
```
(G) /minecraft:tp @s 516.5 65 1081.5 90 0   then   /dshopkeeper add cars
(C) dquest addatw story jailbreak 250.5 65 911.5 -90 Safehouse          (at launch: dquest addat story ...)
(C) dquest addatw contracts jailbreak 595.5 65 1028.5 0 Scrap Yard
(C) dquest addatw fence jailbreak 600.5 65 962.5 90 Pawn Shop
(C) dquest addatw hits jailbreak 448.5 65.5 1161.5 180 Pool Hall       (the Broker stands on the hall's raised platform)
(G) crate stands, looking at each block: 508 65 1064 supercar, 508 65 1100 hypercar (the dealer);
    260 65 899 daily, 260 65 903 common, 260 65 907 uncommon, 260 65 915 rare,
    265 65 901 epic, 265 65 905 legendary, 265 65 909 hacked, 265 65 913 season (the safehouse porch)   (/dcrate place <crate>)
```
The `rare` stand moved from 260 911 (PLAN 8.2) to 260 915: at 260 911 it stood right in front of the safehouse's doorway.

### C3. Fuel pumps (C)
The gas station's 12 pumps (`town.js setup` section 6b, `dfuel pumpat <W> 414 65 <z> 415 67 <z> <n>` for z 877, 882, 888, 893, 899, 904, 910, 915, 921, 926, 932, 937). Then `/dfuel list`. A car parked in a lane (x 413 or 416) is within the hose's 6 blocks.

### C4. The bike shop's spots (C)
```
(C) dbike spotat jailbreak 310.5 65 406.5 0
(C) dbike spotat jailbreak 315.5 65 406.5 0
(C) dbike spotat jailbreak 320.5 65 406.5 0
(C) dbike spotat jailbreak 325.5 65 406.5 0
(C) the GPS: the new lines of tools/jail-gps-paths.txt (nodes 198 and 199: LOT_EXIT -> BIKE_SHOP)
```

### C5. At launch (L)
- The City Garage site "dealer": its bays, exits and return, and its attendant (`town.js setup --world world` section 4 and 3).
- POIs: shop "Car Dealer", garage "Dealer Garage", base "Safehouse", landmark "Gas Station" (section 5).
- The safehouse's wall map: `dphone wall create base 3 2 world 250 66 896 south`; its leaderboards: `/dseason holo earners|heisters|wheelmen` at 242.5 / 252.5 / 262.5 65 885.5.
- Car jobs (the main world only: `dcontract`'s addat and dump lines assume it): the 12 house driveways (`/dcontract spot add` at each `CARSPOT_H<n>`, facing the street) and the Scrap Yard's chop bay (`/dcontract chop add` at 632.5 65 1068.5).
- The quest givers again with `dquest addat` (no world).

### C6. Checks afterwards
`/dsetup` (its new `fuel` section: pumps, bike spots, the bike look), then the bot scenarios `fuel` and `bikes` (written in the cloud, never run), then in the client: the wiki pictures against each building (PLAN 6.6-6.9, 7, 15.3-15.5).

## D. Not covered here

- **Hit contracts** need street nodes (`/dhit node ...`). None are planned for the town yet.
- **The volcano's site** is kept free; nothing is built there.
