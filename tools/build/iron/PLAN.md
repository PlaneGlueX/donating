# Ironvale: the build plan, building by building

The site plan is `tools/build/expand/PLAN.md` section 1.2. This file holds each module's detailed plan, written before its module (the owner, 2026-10-29: "go one by one plan the layout first then build everything building by building"). COMMON (the frame every module shares) is `iron/plan-layout.js`; `CITY_SET=iron tools/node/node.exe tools/build/city.js check` builds every module present and checks it.

Order: the streets, the Power Plant, the Police HQ, the Mansion.

The ground is flat grass at y 64 over the whole area (checked over RCON at six spots, 2026-10-29), like the rest of the map.

## 0. The frame (COMMON)

- **Area:** x 830..1500, z 150..800, y 44..140. x 830..940 is Rising City's: Ironvale owns only Main Avenue East's first stretch there (z 416..444), from the roundabout's east sidewalk to x 940. Nothing above the ground stands there in the city's build (checked: no lamp or light near the ring's east side).
- **Boxes** (each module owns every column inside):
  - `power` x 950..1120, z 270..415 (the plant, its yard and cooling towers; its gate on the avenue's north walk);
  - `police` x 950..1070, z 445..555 (the HQ, its front on the avenue's south walk);
  - `mansion` x 1160..1340, z 560..740 (Mansion Hill and the house on top), less Hill Drive's strip.
- **Regions** are placeholders until each building's plan sets its own.
- Changed from the site plan: Main Avenue East ends at x 1280 (not 1300: nothing stands past Hill Drive, so a short stub and an end curb), and Hill Drive tops out at z 600 with the plateau from z 601 (the house moves north to fit; the Mansion's plan sets it).

## 1. Streets (`iron/streets.js`)

- **Main Avenue East**, x 830..1280, z 416..444, the avenue's profile: road z 419..441 (asphalt mix), white edge lines z 420 and 440, the yellow dash z 430 where x % 6 < 3, curbs z 418 / 442 (smooth stone with a slab on top), walks z 416..417 and 443..444. No parking bays. At x 830..833 it cuts through the roundabout's sidewalk into the ring road (the mirror of the west avenue's end at x 789). At x 1281 an end curb across it (z 416..444, a slab on top) and shrubs behind.
- **Hill Drive**, x 1240..1251, z 445..600: road x 1242..1249, the yellow dash x 1245..1246 where z % 6 < 3, walks x 1241 and 1250, retaining walls x 1240 and 1251 (stone bricks from the ground to the road, a stone brick wall on top as the parapet). The road's surface block is y 64 + floor((z − 444) / 6): flat to z 449, then one block up every 6 (like the city's ramp, 1 in 8), y 90 at z 600. The embankment under it is stone. Where it meets the avenue the south walk and curb are cut (x 1241..1250, z 442..444 road).
- **Lamps**: the city's `streetLamp` every 24 blocks on both avenue walks (x 842, 866, ...), the arm over the road; none on Hill Drive's junction (x 1230..1261) or within 2 of an ATM. On Hill Drive, on both walks every 24 blocks from z 462, standing on the walk's surface.
- **ATMs** (three barriers under the furniture display, like North's): the avenue's north walk at (1000, 65, 416) and (1180, 65, 416), the screen facing south. Setup: `datm add 1000 65 416`, `datm add 1180 65 416`.
- **GPS** (ids from 6001): 6001 the avenue's west end (840.5, 65, 430.5), 6002 (1010.5, 65, 430.5) between the Power Plant and the Police HQ, 6003 Hill Drive's foot (1245.5, 65, 430.5), 6004 the avenue's east end (1276.5, 65, 430.5), 6005 Hill Drive's top (1245.5, 91, 600.5). Links 3008 (the roundabout's east node) - 6001 - 6002 - 6003 - 6004, 6003 - 6005. The buildings add their own nodes from 6010 / 6020 / 6030.
- **District**: `district_ironvale` x 941..1500, z 150..800, y 0..200, named "Ironvale".
- Budget 400,000 blocks.
- **Built 2026-10-29**: 40,673 blocks, 48 lamps, pasted with `CITY_SET=iron tools/node/node.exe tools/build/city.js paste --world overworld` (backup-2026-10-29-0222 before); the ATM displays placed; `district_ironvale` made (passthrough allow), ATMs 11 and 12, GPS 6001-6005 loaded from `tools/build/iron/iron-gps-paths.txt` (run after the city's file) and linked to 3008. Checked with a bot: the sidebar's area says "Ironvale" past x 941 and "Rising City" at x 900; a pin on Hill Drive's top routes `way=path` via 6003 with a right turn at the foot. `city.js`'s iron set joins the city's graph at 3008 (was 3012/3013, the casino plaza, before the plan put the avenue on the roundabout). The placeholder heist regions are small boxes until each building sets its own (`city.js check` refuses a region over 100,000 blocks).
