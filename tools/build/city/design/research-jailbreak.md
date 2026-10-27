# Roblox Jailbreak: Jewelry Store, Bank and Museum (research, 2026-10-26)

Scope: the three classic Rising City heists as they are in late 2026, for Donating's city build
(1 stud = 1 block). Facts come from the Jailbreak Fandom wiki (pulled through its API; the HTML
pages are bot-walled), Badimo's Discord changelogs as quoted on the wiki's update log, and wiki
screenshots I looked at myself. The wiki gives no sizes, so every stud figure is my **estimate**
from screenshots and the 2026 minimap. The method and confidence are in section 9.

---

## 0. Key takeaways

- **Jewelry Store** (revamped 2025-11-21 "The Jewel Update", plus a floor added 2025-12-05).
  A black-framed, blue-glass corner building of about 50x55 studs, with a basement, ground floor,
  2 randomized obstacle-course ("obby") floors, a short final floor and a roof. You get in by
  crawling through a slot that a laser cutter burns in the street-level glass. You punch glass
  cases (55 in total) on the ground floor and in the basement, climb two laser or spotlight
  floors, and leave by the **roof**: 3 stair-hut doors, a zipline to the Criminal Base, a
  parachute or a plank to the next roof. Late joiners can come down a vent shaft on a rope.
- **Bank** (rebuilt 2026-01-16 "Rising Bank Update", with more floors added 2026-01-23 and
  2026-06-13). A tall green-glass tower of about 50-65 x 70-90 studs and roughly 120+ studs tall,
  with a vertical brick pylon reading "BANK", a neon trim that lights up when the bank is open,
  and a helipad. Entry needs a **keycard** (door or gate). Each opening randomly picks one of
  **8 vault floors**: Classic, Underwater, The Mint, Corridor, Upper Management (the only one
  that goes up), Deductions V2, Presidential Vault and Basement. Each floor is a laser course,
  then a **vault door that dynamite blows**, then you **stand inside to tick cash in**. Every
  floor also has an **alternate exit you blow with dynamite** (10 s fuse), leading to a ladder
  and a trapdoor outside. If a cop walks into the vault alive, everyone inside is arrested
  (**Bank Bust**).
- **Museum** (revamped 2022-01-07). A tan sandstone-brick neoclassical building of about
  150x90 studs and 2 storeys, with a portico, 4 columns and a Triceratops pediment. It sits alone
  on a cliff-sided hilltop east of the city, beside the Radio Tower, reached by a spiral road.
  It is a **2-player** heist. Two players each plant dynamite on the roof to blast a hole, and
  you drop into a T-Rex hall full of moving security spotlights. You solve a **pipe puzzle** and
  a **jewel-rotation puzzle** to reach two lever rooms, shoot glass to reach the upstairs
  showcase, and fill a **weight-limited bag** (5 kg). Both levers must be pulled within 3 s to
  disable security and unlock the doors, and then you drive the bag to the Volcano base.
- **City layout.** The Bank and Jewelry Store stand a few blocks apart on the same straight
  street in Rising City's grid. The Criminal Base is a zipline ride from the Jewelry Store roof,
  and the Museum sits on its own hill about 700 studs east of the grid. The Prison is far away,
  roughly 2,000-2,500 studs north-west across a lake, joined to the city by highways. Donating's
  layout (city right next to the prison highway) is more compact than Jailbreak's.

---

## 1. Timeline: what is "current" (Oct 2026)

| Date | Change |
|---|---|
| 2025-05 / 06 | Jewelry Store floor lasers raised; lasers no longer hurt players standing on platforms. |
| 2025-08-29 | Jewelry Store gets 50% more glass cases. |
| 2025-11-08 | **Dynamic Robbery System**: at most 4 big robberies open at once, each with its own reopen timer, plus a queue. This replaced Robbery Groups (Bank, Jewelry and Museum had been "Group A"). |
| 2025-11-21 | **The Jewel Update**: Jewelry Store rebuilt from scratch, basement back (cases 31 -> 55), obby cut from 3 floors to 2, floors randomized per floor, crawl-in entry, roof vent entry, **ziplines** added, police entry announced. Museum hill terrain changed for better lines of sight. |
| 2025-12-05 | New Jewelry Store floor "Button Lasers, featuring Oreo" (the cat easter egg). Roof door open time cut from 1.5 s to 0.8 s. |
| 2026-01-03 | Museum roof entry fully opened up; Museum puzzle click exploit fixed. |
| 2026-01-16 | **Rising Bank Update**: new exterior and lobby; Classic, Underwater, Mint, Corridor and Upper Management rebuilt; less dynamite needed per vault; cash collection about 25% faster; escape doors stay open longer. |
| 2026-01-23 | **Deductions V2** with revolving escape doors; Presidential vault made bigger; Basement made harder to glide through; Bank Truck revamped. |
| 2026-01-30 | Jewelry Store roof doors stay open for less time. |
| 2026-02-06 | Delivery waypoints added for the Jewelry Store and Museum. |
| 2026-06-13 | **2026 Live Event / Chapter 4**: Crater City is destroyed, and its Bank floors (Basement, Presidential, Deductions) move to the Rising City Bank. Rising City is revamped with flatter buildings, and the Control Tower and Toy Store are removed. |
| 2026-10 | The wiki says a "2026 Fall Map" is due around Oct 23-30, so the map may shift again. |

---

## 2. Where they are: Rising City, the Museum hill and the Prison

```
                N
      lake      |      dunes / desert
  (Prison is ~2,000-2,500 studs NW, across the lake; highways run in)
        +---------------------------+
        |  [BANK] green tower,      |
        |   helipad                 |
        |     |   (same N-S street, |       ring road
        |     |    ~400-600 studs)  |      /-------\
        |     v                     |     |  MUSEUM | <- hilltop mesa, cliff sides,
        |  [JEWELRY] black/blue,    |     |  + Radio |    spiral road up;
        |   corner of main avenue   |      \-------/     City Police Station below
        |      \ zipline            |   ~700 studs E of the Jewelry Store
        | [Criminal Base] SW of     |
        |  the grid, by train tunnel|
        +---------------------------+
```

- **Rising City** is at the south end of the main island. Its street grid has roughly 150-210
  stud blocks and wide 4-lane avenues with medians. "All the roads in front of the Prison lead
  to Rising City", so escaped prisoners pass through it.
- **Jewelry Store**: on a corner of a main east-west avenue, with a green verge strip on its
  side street. Its neighbours are a red vertical-striped tower, an orange tower and a tower crane
  with a wrecking ball (the crane used to link the next building to the now-removed Police HQ
  as a getaway path). The Eclaire supercar spawns beside it. The **Rising City Criminal Base**
  (the cash drop for the Jewelry Store) is close by: there is a zipline straight to it from the
  roof, and you can also parachute there.
- **Bank**: on the same long straight north-south street as the Jewelry Store. From the bank's
  corner you can see the Jewelry Store's cyan diamond a few blocks down. A La Matador spawns at
  the kerb, a Little Bird on the roof helipad, and the **Bank Truck** sits in a garage inside the
  building.
- **Museum**: "on a hill near Rising City and the Rising City Police Station". On the 2026
  minimap it is about 700 studs east of the Jewelry Store, on a flat-topped hill with cliffs. A
  ring road circles the summit and a spiral road climbs to it; the Radio Tower (the tallest
  structure in the game) stands next to it. There is a parking lot in front, a ramp behind and a
  soccer goal. Vehicles that spawn there: a Boxer on one side and a Badger/Jammer on the other.
  Police spawn right below at the City Police Station. The bag goes to the **Volcano Criminal
  Base** (moved closer to the map centre in June 2026).
- **Prison**: inland to the north-west, between the Gas Station and Mountainside Town. It is the
  far end of the highway network from the city, roughly 2,000-2,500 studs by minimap (estimate).

---

## 3. Jewelry Store

### 3.1 Outside
- **Look**: a black or very dark navy structural frame (corner piers and floor bands) with
  full-height blue-tinted glass curtain walls on two street faces. A large cyan diamond logo sits
  on the top corner and a smaller one over the (decorative, non-opening) glass double door. The
  top band has horizontal grey louvres or shutters. Street-level glass is blue, and two red **"X"
  marks** are painted on the pavement by the windows. At night the floors glow blue and pink. An
  older version (2023) had a dark-brick pylon with a tall white light strip.
- **Size (est.)**: footprint about **50 x 55 studs**. About 5 levels: basement, a tall ground
  floor (about 14 studs), two obby floors (about 12 each), a low final floor (about 8) and a flat
  roof. That makes roughly 50-55 studs from street to roof, plus 8-stud stair huts.
- **Roof**: grey ribbed metal deck with a parapet. Two light-grey **stair huts** joined in an L
  shape have 3 exit doors in total (with small one-way windows for scouting) plus a door-sized
  panel. There is a louvred vent box, the **vent hatch** with a vertical rope down to the ground
  floor, and **2 ziplines** to the Criminal Base. Wooden planks lead to the neighbouring roof,
  and a ladder runs down one side.

### 3.2 Floors, bottom to top
| Level | What is there |
|---|---|
| Basement | Long room about 20 wide by 40 deep, below street level, with dark curtained walls. Glass case counters line both sides, plus a central island case and a back wall with a diamond logo. A glowing light ceiling. Orange **floor-laser bars** run across the room between the case rows. Reached by stairs from the ground floor. |
| Ground floor | Entry level. Dark square pillars, a blue carpet with a faceted-gem pattern, a light-box ceiling and 6-8 low glass display islands (each a dark plinth holding about 6-8 ring boxes under glass). Glowing orange **floor lasers** run between the islands and along the walls. The front door is fake; you enter through laser-cut window slots. A **security gate** shutter drops when the robbery starts. The vent hatch in the ceiling is the rope drop from the roof. |
| Obby floor A | Randomly picked per floor. Pool: **Layered Laser** (a floor of crossing red lasers with raised blue-topped blocks to hop between), **Moving Lasers** (vertical yellow/orange laser bars sweeping between pillars, red gems lying around, purple fog), **Gem Floor** (horizontal lasers with loose gems everywhere), **Button/Classic Laser** (translucent lasers you reveal by pressing a big red button at the entrance; Oreo the cat is on the exit door). The current pool is 4 types, with "more to come". |
| Obby floor B | Another floor from the same pool. Each obby floor ends in a glowing door frame and stairs up. Loose gems on these floors top up bags that are not full. |
| Final floor | Very low and short, with 2 flights of stairs switching direction. The top-floor windows have shutters so cops cannot see which roof door you will use. A glass cut-out escape near the top ramp has been a side exit since 2023. |
| Roof | See 3.1. Police camp here. |

### 3.3 Robbery flow
1. A notification says the store is open. Walk to one of the two **X marks**: a laser cutter
   burns a low slot in the glass in about 2 s and you **crawl** in. If one window is already
   cut, the other cannot be.
2. Punch a case to start (it flickers, with smoke and an impact sound). Each case pays **$500**
   (loose gems pay the same). The bag cap is **$2,750** by default ($3,300 with VIP, up to $6,600
   with VIP plus the biggest bag gamepass), so about 5-6 cases fill a basic bag. Cases slowly
   repair themselves. There are 55 cases across the basement and ground floor.
3. Climb the 2 obby floors. Lasers, spotlights and cameras each take a chunk of health (20% on
   older floors) and never kill outright; you heal with donuts or a forcefield. You can see
   which floors spawned by looking through the windows beforehand.
4. Final floor, then the roof: pick a door (check the minimap for cops), then zipline,
   parachute, jump to the neighbouring roof, take the ladder or fly.
5. Deliver to the Rising City Criminal Base (closest) or the Volcano base. "The police have
   entered the building!" is announced when cops enter. Roughly **5 min** of robbable time, with
   an on-screen timer in the last minute. Bounty $1,000. A no-vehicle zone stops anyone driving
   out.

### 3.4 What makes it memorable
- A **vertical smash-and-grab**: a quick greedy grab downstairs, then a skill climb under time
  pressure, then a tense rooftop exit where cops guess your door.
- **Randomized floors** keep repeat runs fresh, and peeking through the windows rewards
  planning.
- **Multiple exits plus a zipline** turn the getaway into a choice. The vent shaft lets
  latecomers join, and also lets cops in when criminals open doors.
- Small touches: a cat easter egg, a hidden basement (in a 2020 version, it opened only if you
  broke exactly one case), one-way scouting windows and music.

---

## 4. Rising City Bank

### 4.1 Outside (Jan 2026 rebuild)
- **Look**: a **green-glass curtain-wall tower** in a dark navy frame. Its corner is a dark
  **brick pylon** carrying "B A N K" in big white letters stacked vertically. One floor band has
  blue windows. A lower annex wing runs along the side street. The ground-floor lobby is
  double-height green glass, and a **neon blue light line** runs around the base when the bank is
  open. The main door is a white panel door with a red "Closed" LED sign. The side has a keycard
  door, a ladder to the roof, a **helipad** (Little Bird) and a US flag. A metal **trapdoor
  hatch** (the alternate-exit outlet) is set in the ground behind or beside the building,
  ringed by 4 bollards, with no vehicles allowed. There is a garage for the Bank Truck with a
  "closed" sign and an "arrests required" counter.
- **Size (est.)**: tower about **50-65 x 70-90 studs**, about 14 window rows, roughly
  **120-130 studs** to the roof, lobby about 16-20 studs high.

### 4.2 Lobby
A green floor with a pale-grey walled hall. It has a **teller booth** (green-framed with blue
glass windows), 2 **ATMs**, wall **keycard readers** (green light), a keycard **gate**, and a
metal door to the stairs. The vault floor is reached by stairs down (most floors), stairs up
(Upper Management), or by dropping or **ziplining** down a shaft (Corridor, Presidential).

### 4.3 What every floor has
1. A **laser course** between the entrance and the vault.
2. A **vault door**: a big octagonal steel door with an X pattern and a star-shaped handwheel,
   about 10-14 studs across. Walk up to it and dynamite is placed automatically. Once it blows
   (stand back, because the blast throws you), stand inside the vault: **cash ticks in at $50
   per 0.5 s** (25% faster since Jan 2026) until the bag is full. The vault holds stacked gold
   bars, money sacks and a yellow "collect here" floor patch.
3. An **alternate exit**: a metal blast door. Place dynamite, wait **10 s**, and it stays open
   for about a minute (longer since Jan 2026). A corridor (usually with more lasers) leads to a
   ladder up to the trapdoor hatch outside. Players often blow it early so they can escape fast
   later.
4. A **Bank Bust**: a living cop entering the open vault arrests every criminal in the bank and
   closes it.

### 4.4 The 8 vault floors (one is picked at random per opening)
| Floor | Layout and obstacles | Max default cash |
|---|---|---|
| **Classic** | A near 1:1 copy of the 2017 original. Stairs down to a dark diamond-plate corridor (sign "CLASSIC"), a red-floored laser parkour bay with lasers to jump, and the vault at the end of the hall. The alternate exit is visible from the vault, with a short lasered corridor to the ladder. | $2,750 |
| **Financing: Underwater** | A flooded hall with pedestals and lasers over the water. Swimming was removed in 2026, so it now uses stairs and an extended room. Blowing the alternate exit also reveals a hidden shortcut door at the entrance, and there is a secret logo room. Easiest to bust. | $3,000 |
| **The Mint** | A wide hall. Through windows you see **cash riding conveyor belts**. A green-lit main room has a **checkerboard grid of floor lasers** before the vault. The **double** escape door opens onto an escape room with fast cash conveyors and moving lasers. A hidden tunnel leads from a money sack in the vault to the conveyor room. Hardest to bust because of the long defendable hall. | $3,000 |
| **Corridor** | The whole floor is one long hallway (with an optional zipline entry). You either weave through side rooms (computer room, shelf room) for cover, or blow the central **"Jail Gate"** for a shortcut. The escape hatch sits in an alcove between two gates. There is a laser ditch (gliders skip it). | $3,000 |
| **Upper Management** | Goes **up**. A lasered stairway leads to a grand dark stone hall with columns, a gold ring chandelier and big green steps with floor lasers up to the vault. The alternate exit is a tall ladder to the **penthouse**: press a button to open the shutters, cut the window and parachute out, or use the roof door to the helipad. | $2,750 |
| **Deductions V2** | A split path from the stair landing. To the right is the blast door plus a window onto **money burning in a fire pit**. Blowing it reveals both the hatch and the vault room, but a second door shuts the vault room after **5 s**. If you miss that window, the blocked left path (moving lasers) opens instead. Since Jan 2026, **revolving escape doors** change how you rob and leave. | $3,100 |
| **Presidential Vault** | Ziplining or dropping down a collapsed elevator shaft leads to a wide **red stone corridor** with a solid **translucent laser wall that sweeps the corridor and shoves you**. Duck into wall pockets as it passes, 1-2 times. The vault is a hall of glowing gold-bar shelves with floor lasers and **two moving vertical-laser walls** (half speed since 2026). You can leave up a spiral stair in the shaft, or through the alternate exit opposite the vault. | **$3,750** (top) |
| **Basement** | An elevated walkway leads to stairs down, then a long room of **repeating floor lasers** to jump, with glass walls. The vault has its own hallway and stairwell inside. The alternate exit is hidden under the entry walkway. Hardest to bust because criminals see cops coming down the walkway. | $3,000 |

(Floor: Blue was removed in Jan 2026. Bank floors have their own laser colours.)

### 4.5 Flow, timers, payout
Get a keycard (from a cop, or another player lets you in), enter, and run the floor's lasers.
Then blow the vault, defend it while it opens, collect, and leave by the front, the side or the
alternate exit. About **5 min** of robbable time; anyone still inside at time-out is kicked and
loses the run's cash. Bounty $1,500 and 200 XP. Default caps range from $2,750 to $3,750, up to
$9,000 with gamepasses. Music plays inside.

### 4.6 What makes it memorable
- **A new vault each opening**, and each floor has its own gimmick (conveyors, flooded hall,
  burning money, a sweeping laser wall, going up instead of down).
- **A defend-the-vault standoff**: the dynamite wait plus cash ticking in creates greed against
  time, and the Bank Bust makes the vault doorway a choke point that both sides fight over.
- **Planning the escape**: blow the alternate exit early (it costs time) or risk the front
  doors. The penthouse and helipad give a spectacular way out on the Upper Management floor.
- Keycards gate entry and are taken from cops, so the heist starts before you reach the door.

---

## 5. Museum

### 5.1 Outside
- **Look**: a two-storey **tan/sandstone brick** neoclassical building with pale salmon trim.
  The centre block has a **pediment carrying a dark Triceratops silhouette** over a portico of
  **4 round columns**, wide front steps and a small double door. A big arched window above the
  door shows the T-Rex inside, flanked by red banners and grid windows that reveal the
  staircases. Long wings stretch left and right with simple square windows and red banners on
  the sides. The flat roof is tan. A side door sits in each wing (the lever-room exits).
- **Plan (est.)**: a cross shape about **150 studs wide**. The centre block is about 75 wide by
  85 deep (front portico and rear projection), and the 2 wings are about 38 wide by 46 deep each.
  It stands about 34 studs to the eaves and about 46 to the pediment apex.
- **Setting**: a parking lot in front (9-stud bays), the ring road, a **ladder up each side**
  to the roof, a gate-control/ticket booth (brought back in 2024), the **Radio Tower** beside it
  and cliffs all round.

### 5.2 Inside
| Area | Contents |
|---|---|
| Roof | 2 **dynamite plungers** on detonation wires, each needing a different player. They blast a hole into the central hall. |
| Central hall (double height, ~30 studs) | A T-Rex skeleton ("Mr Bones") on a red octagonal pedestal, hanging **planets**, a big ring chandelier, beige tile floor and brick walls with columns. **Balconies** run round the upper level, with **two staircases** up. Moving **security spotlights** sweep the floor; there are 12 in the whole museum. You land on the left balcony or stair after the drop (you can ragdoll). Loot: dino bones, planets, a dino leg and a dino egg (behind the T-Rex), and the mask and tomb lantern under the stairs. The main double door is the exit once security is off. |
| Left ground room | A Pharaoh **mask** on a pedestal and a **pipe puzzle** wall (rotate pipe tiles to join the corners). Solving it slides a **brick door** open. Taking the mask **trips the alarm**. |
| Left lever room | A small security office with the **mummy** in a glass case (5 kg), a **lever** and a sign reading "Both switches must be pulled at the same time to continue", a panel with "Switch Room One / Two" lights, and an exit door. |
| Right ground room | A big **blue jewel** on a pedestal and a **jewel-alignment puzzle**: rotate 5 gems until their laser lines all line up red. That opens a brick door. Taking the jewel **trips the alarm**. |
| Right lever room | A lever and an exit door. |
| Upstairs: Showcase Room (over the left rooms) | A red carpet with a dino-footprint pattern. Glass display cases hold a giant donut, a traffic cone, gold bars and spinner/hypno rims. You must **shoot the middle glass panel** with a gun to get in. 2 spotlights; you can hop on a hanging light to dodge them. |
| Upstairs: Art Gallery (over the right rooms) | Parody paintings in gold frames (Starry Night with a helicopter, The Scream, Mona Lisa with a Roblox head, a crash-report car photo, developer portraits), each 4 kg. 2 spotlights. |

### 5.3 Robbery flow
1. **2 players**: climb the side ladders and each plant one roof dynamite. The roof blows and
   you drop in.
2. Loot by **weight**: 1 kg (bones, planets, cone), 2 kg (mask, spinner rims), 3 kg (gold bars),
   4 kg (paintings, giant donut), 5 kg (mummy, blue jewel). The bag holds **5 kg** (10 kg with
   the gamepass) at **$700/kg**, so the default max is $3,500. The museum holds 65 kg in total.
   While you hold the bag you **cannot use items or weapons**. You can drop it (Backspace) to
   fight; it is still yours, but it despawns if left too long.
3. **Alarm** (spotlights turn red and speed up, police are notified once) if you step in a
   spotlight, take the jewel or mask, or pull one lever without the other.
4. **Escape**: one player in each lever room pulls the levers within **3 s** of each other. That
   disables security (lights turn white and slow but still hurt) and unlocks the main and side
   doors. Cops usually wait outside, and the hill has one road.
5. Drive to the **Volcano Criminal Base** collector. A driver who carries a bag-holder earns 10%
   of the bag's value as an "assist". About **4 min** robbable time; bounty $1,250. On private
   servers it closes after 5 min with only 1 player. Music plays. A no-vehicle zone and a no-jetpack
   zone cover the entrance.

### 5.4 What makes it memorable
- **Forced co-op**: two plungers, two puzzles, two levers within 3 s, and a driver bonus. It is
  the social heist.
- **Puzzle rooms** break up the action, and the loot is **weighty and characterful**: you choose
  between the mummy, a painting or a handful of bones to fill 5 kg.
- **Greed trips the alarm**: the two best items set it off.
- **Being vulnerable with the bag** (no weapons) plus a **hilltop with one winding road** makes
  for a real getaway chase to a far drop-off.
- A huge readable centrepiece (the T-Rex) and in-jokes in the artefacts.

---

## 6. Related Jailbreak vault mechanics (Crown Jewel, ex-Casino; useful for safes)
- A **keypad door** whose **4-digit code is hidden somewhere in the lobby**, in a different
  place each opening (behind the counter, under wall crowns, on a screen, by the door).
- A **security floor**: dodge spotlights and lasers to **hack computers**. That starts a 3:30
  countdown and drops the collision lasers that block the vault floor.
- The vault floor has a reception room with up-and-down lasers and **breakable windows**. The
  **vault dial is cracked** by reversing the rotation when the indicator lights turn white,
  otherwise progress resets. Side mini-vaults open the same way.
- Exits are by roof (parachute, or a **zipline** to a mesa) or the ground floor. At time-out
  everyone is teleported out but keeps their cash.

---

## 7. Design patterns common to all three
- **Entry is a small puzzle**: a laser-cut crawl slot (Jewelry), a keycard (Bank), two
  plungers (Museum).
- **The loot is capped by the bag, not by the building**, so a run is about choosing what to
  take and getting out, not emptying the place. Overflow loot (spare gems, extra cases) lets
  late joiners share a run.
- **Hazards hurt but rarely kill**: floor lasers to jump, mid-height lasers to duck, moving
  vertical bars, sweeping walls and spotlight cones that trip alarms. Healing items matter.
- **Randomized interiors**: per-floor obby picks (Jewelry) and per-opening vault floors (Bank).
- **Every heist offers 2-4 exits**, each with a cost: a blast door that wastes time, roof doors
  cops camp, the main door. The getaway is its own phase with a drop-off point.
- **Police play is designed in**: announcements, one-way scouting windows, bust rules,
  campers on the roof or at the doors, and short open windows (about 4-5 min) on a reopen timer.
- **Strong silhouettes from the street**: a diamond logo, the vertical BANK pylon, the dinosaur
  pediment. Each heist is readable from blocks away.

## 8. Mapping to Donating's existing mechanics (my interpretation, for the designer)
| Jailbreak feature | Closest existing Donating mechanic |
|---|---|
| Glass jewel cases, punch to break | **smash** gate (glass, hold 1.5 s) with **jewel** piles behind |
| Loose gems on obby floors | small jewel piles (<= 12 cells) on the obby floors |
| Floor, mid-height and moving lasers, sweeping walls | /dtrap lasers (static or blinking; jump < 1.27, duck 1.49-1.78) |
| Security spotlights and alarm | cameras (view cone, trip the alarm when advanced) |
| Bank vault blown with dynamite and cash ticking in | **drill** gate on a vault door (60 s, jams), then **cash/gold** piles |
| Crown Jewel keypad code / dial crack | **safe** gate (4-digit keypad, Safe Kit) |
| Bank Bust / police entering | advanced alarm: cop waves at the cop spots, lockdown boxes on windows |
| Museum heavy artefacts | **art** piles ($2,000 / 3.0 s) and **gold** piles |
| Jewelry Store roof exits and zipline | the exit spot 5-15 blocks outside a roof or rear door (zipline would be new work) |
| Blast-open alternate exit; 2-lever, 2-player disarm; keycard door | prison-only C4, keycard readers and punch box could be borrowed (counts toward the 3-new-mechanics budget) |

## 9. Measurement method and confidence
- **Building sizes**: I scaled them from wiki screenshots using door widths (about 6-8 studs),
  parking bays (about 9 studs) and 2-lane road widths (about 18 studs). The museum came to about
  150 studs wide both from its top-down shot and from the minimap. Confidence: about +/-25% for
  footprints, lower for heights.
- **Distances**: measured on the wiki's 7,168-px "Spring 2026" minimap
  (JBSpringUpdate2026Map.png), which works out to about 1 stud per pixel when checked against the
  museum and road widths. The Jewelry Store and Museum positions are fairly solid (crane, green
  verge, cross-shaped tan building, ring road, Radio Tower). The Bank's exact block is
  **uncertain**: screenshots put it on the same long north-south street as the Jewelry Store a
  few blocks north. Chapter 4 (June 2026) redrew the map, but the relative layout (city in the
  south, prison north-west across a lake, museum hill east of the city) is the same on the
  "Chapter 4" map.
- Floor counts, mechanics, payouts and dates come straight from the wiki and Badimo changelogs
  (high confidence). The wiki itself flags the Bank and Jewelry pages as needing new
  screenshots.

## 10. Sources
Jailbreak Fandom wiki (wikitext via api.php, retrieved 2026-10-26):
- Jewelry Store: https://jailbreak.fandom.com/wiki/Jewelry_Store
- Template:JewelryStoreFloorsList (current, 3rd-revamp and original floors)
- Rising City Bank: https://jailbreak.fandom.com/wiki/Rising_City_Bank (redirect from "Bank")
- Template:BankFloorsList; Template:CraterBankFloorsList; Crater City Bank: https://jailbreak.fandom.com/wiki/Crater_City_Bank
- Museum: https://jailbreak.fandom.com/wiki/Museum ; Template:MuseumFloorsList
- Crown Jewel: https://jailbreak.fandom.com/wiki/Crown_Jewel
- Rising City: https://jailbreak.fandom.com/wiki/Rising_City ; Radio Tower ; Rising City Criminal Base ; Ziplines ; Prison ; Locations (Map)
- Robberies & Heists: https://jailbreak.fandom.com/wiki/Robberies_%26_Heists
- Update Log, Template:UpdatePageList and Template:MiscellaneousUpdatePageList (these quote Badimo's Discord changelogs: The Jewel Update 2025-11-21, Bionic Update 2025-12-05, Rising Bank Update 2026-01-16, Bank Truck Update 2026-01-23, Crime Card Update 2026-01-30, Return of the Forcefield 2026-02-06, 2026 Live Event & Chapter 4 2026-06-13)
- Screenshots looked at (wiki File: pages): Fifth_Jewelry_Store_Revamp_.jpg, JewelryStoreRevampInterior(2).jpeg, JStoreBasement2025.png, JewelryStoreRevampLaserFloor.jpeg, JewelryStoreRevampMovingLasersFloor.jpeg, JStoreButtonBefore.png, JStoreFinal1.png, JStoreHatch.png, JStoreRoof2025.png, JStoreZiplinesandVent.png, Jewelrytobank2023.png, BankRevamp2025.jpeg, BankRevampFront2026.jpeg, RisingCityBankRevampTeaser.jpeg, RisingCityBankRevampInteriorTeaser.jpeg, ClassicFloor.png, ClassicVault.png, 26TMMain.png, 26UMMain.png, PresidentialVaultCorridor.png, PresidentialVaultView1.png, DeductionsV2Teaser(2).jpeg, Latest_Museum.png, 2022MuseumFrontView/TopView/Interior/SideRoomOne/SideRoomTwo/ShowcaseRoom/ArtGallery/LeverRoomOne/Dynamite/SurroundingArea2.png, MsmRevampInside.jpg, JBSpringUpdate2026Map.png, JBChapter4Map.jpeg, RisingCityMap2026.png, 2026RisingCity.png, CitySouthEastSideView2022.png
Secondary (older guides, only used to cross-check entry and exit steps):
- GamesKeys, "How To Rob The Museum in Roblox Jailbreak": https://gameskeys.net/how-to-rob-the-museum-in-roblox-jailbreak/
- StealthyGaming, Jewelry Store guide: https://stealthygaming.com/rob-jewelry-store-jailbreak/
- Sportskeeda, Jailbreak version 1374 (Casino renamed Crown Jewel, vaults): https://sportskeeda.com/roblox-news/news-jailbreak-update-version-1374-casino-changes-crown-jewel-vaults
- Pro Game Guides, best locations to rob: https://progameguides.com/roblox/best-locations-to-rob-in-roblox-jailbreak/
Local copies of the wikitext and images are in scratchpad/city/web/ (and web/img/).
