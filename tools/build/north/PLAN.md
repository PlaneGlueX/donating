# Rising City North: the build plan, building by building

The site plan is `tools/build/expand/PLAN.md` section 1.1. This file holds each module's detailed plan, written before its module (the owner, 2026-10-29: "go one by one plan the layout first then build everything building by building"). COMMON (the frame every module shares) is `north/plan-layout.js`; `CITY_SET=north tools/node/node.exe tools/build/city.js check` builds every module present and checks it.

Order: the streets, the Federal Reserve, the Art Gallery, the Nightclub, Lucky Pawn, the Car Wash.

## 1. Streets (`north/streets.js`)

- **Bank Street North**, x 640..663, z 0..229: road x 643..660 (asphalt mix), the yellow dash x 651..652 where z % 6 < 3, curbs x 642 / 661 (smooth stone with a slab on top), walks x 640..641 and 662..663. It meets the built Bank Street at z 230.
- **Gallery Row**, x 481..930, z 110..125: road z 113..122, the dash z 117..118 where x % 6 < 3, curbs z 112 / 123, walks z 110..111 and 124..125. The crossing (x 640..663) is plain asphalt.
- **Curb cuts** (no slab): the Car Wash's bays on Gallery Row (x 500..509 north and south, x 520..529 south) and the Reserve's armored-truck gate on Bank Street North (x 661, z 205..214).
- **Lamps**: the city's `streetLamp` every 24 blocks on both walks, arm over the road; none at the crossing (Bank Street z 104..131, Gallery Row x 634..669) or next to an ATM.
- **ATMs** built by this module (iron block, polished blackstone, a slab cap): Gallery Row's north walk (700, 65, 110) and beside Bank Street North's west walk (639, 65, 60). The third, at the Reserve's frontage (666, 65, 180), comes with the Reserve. Setup: `datm add 700 65 110`, `datm add 639 65 60`.
- **GPS**: 5001 Bank Street North at z 200, 5002 the crossing, 5003 its north end, 5004 / 5005 Gallery Row's ends; links 3017-5001-5002, 5002-5003, 5002-5004, 5002-5005.
- **District**: `district_rising_city` widened to x 481..940, z 0..470.
- Budget 120,000 blocks (it uses ~14,400).
- **Built 2026-10-29**: 14,362 blocks, 52 lamps, pasted with `CITY_SET=north tools/node/node.exe tools/build/city.js paste --world overworld` (`--world` is the DIMENSION for the paste: `world` fails as "Unknown dimension 'minecraft:world'"; setup and gps lines keep the world name). ATMs 4 and 5, district widened, GPS 5001-5005 loaded and linked to 3017 (the city's own paths, `tools/city-gps-paths.txt`, weren't loaded before: loaded the same day, 30 nodes).
