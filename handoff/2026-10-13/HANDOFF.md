# Hand-off for the next session (2026-10-13)

Give a new local session this file. It continues where the last local session (2026-10-12) and the cloud session
after it stopped. **Read CLAUDE.md whole first.** It is the source of truth, and this file only adds what's in flight.

## 1. Where things stand

| Where | What | State |
|---|---|---|
| `main` (c83cc1b + docs) | The nine guns remade at Pixel Gun 3D's Photon Shotgun detail level, with their 18 skins; the Claude Code add-ons | Merged, pushed. Tested: wm-ammo 66, gunskins 31, gunfx 17, wm-damage 15, shop 50. Checked in the owner's 26.3 client |
| `claude/minigun` (21934a9, pushed) | The **Hand Minigun** (level 125, spin-up) + **both hands in every gun's first-person frames**, the **bag hidden while reloading**, the **Shotgun's shell-by-shell reload**, **skin-ready guns** (a lint) | Built by a local workflow, then finished by the cloud. **Nothing on it has been compiled against Paper, built into the pack, or run on the server.** NOT merged |
| Local checkout | `main` | The server may still be running from main (started 2026-10-12). Check with `Playtest.bat status` |

The cloud's own notes on the branch:
- `handoff/2026-10-12/README.md` ("What only the local session can do")
- CLAUDE.md on the branch: its Status, "The Hand Minigun", "Hands in the gun frames"
- PLAYTEST 184 (the minigun) and 185 (the hands)
- `handoff/2026-10-12/hands/PLAN.md` (the hands design)
- `handoff/2026-10-12/minigun/*.md` (every builder's, critic's and fixer's report; `review-gunspin.md`)

## 2. The job, in order

This all needs the PC: the server, the Windows tools, the bots and the client.

1. **Switch to the branch.**
   - Stop the server: `Playtest.bat stop`, or `powershell -NoProfile -ExecutionPolicy Bypass -File tools\stop-server.ps1`.
   - Run `git checkout claude/minigun` and `git pull`.
2. **Compile the plugin:** `powershell -NoProfile -ExecutionPolicy Bypass -File tools\build-plugin.ps1`.
   - The cloud compiled `BagHide.java` (new) and the `GunSpin.java` changes only against API stubs. Expect javac errors and fix them.
   - GunSpin's WeaponMechanics calls were read against WeaponMechanics 4.3.1's source (`review-gunspin.md`).
   - Never rebuild the jar while the server runs.
3. **Build the sounds and the pack, in this order** (the release order is in `fix-data.md` MUST 1 and DEPLOY.md):
   1. `tools\node\node.exe tools\sounds\make-gun-sounds.js` (run `npm install` in `tools\sounds` first if `node_modules` is missing). It rewrites every OGG with new stream serials: `git checkout` the non-minigun OGGs afterwards so the diff stays clean.
   2. `tools\node\node.exe tools\make-item-art.js`
   3. `tools\node\node.exe tools\build-pack.js`. It fails if any of the 42 gun numbers (10 guns × 4 states, plus the knife and the Stim) is missing, or if a resource name has a capital letter (that broke every gun once: "flashX").
   - Also run the cloud's checks: `node tools\guns\dev\hands.js`, `skinlint.js`, `lint.js`.
4. **Start the server** (`Playtest.bat start`, or `tools\start-server.ps1`). Read its start report: Skript errors show as "Line N: (file.sk)", and the plugin must load with GunSpin and BagHide.
5. **Run the tests.**
   - `tools\node\node.exe bots\run-all.js wm-ammo wm-damage gunfx shop levels menus crates tabcomplete story inventory-lock death gunskins`. Use run-all.js, not run.js: only run-all writes bots\results.
   - The expected numbers are in `handoff/2026-10-12/minigun/fix-data.md`.
   - Fix failures, then run the full suite (`bots\run-all.js` with no names; about 1-2 hours, 1,545+ checks).
6. **Write the missing bag test.** There's no bot scenario for BagHide yet. Write one: during a reload the server inventory never changes (offhand still the bag), the holder gets the look-alike, and other players see nothing different.
   - Mineflayer bots join as 1.21.11 through ViaBackwards, so they can't see 26.x item models. Check the packets and the server state.
7. **Check in the owner's client** (computer use; the owner allows using the PC until they stop it).
   - **The minigun:** the spin-up whine and the first round at about 0.4 s, full spin, the coast down, a short tap, aiming through the red dot, the reload, F5 (others see the barrels turn), walking slower.
   - **Every gun's hands:** at the hip, sprinting, drawing, and reloading with the left hand. No hands while aiming. The sights stay on the crosshair.
   - **The bag:** it slides out and back in during a reload. Check the Shotgun's chain of shells and that the bag never sticks hidden.
   - **The skins** still cover the remade parts.
8. **Review.** Use a workflow: lenses on GunSpin, BagHide, the kit's hands and the minigun model, with a skeptic per finding. Fix what it confirms.
9. **Docs, then merge.**
   - Update CLAUDE.md: Status, "The Hand Minigun", "Hands in the gun frames"; verified facts replace "untested".
   - Update the PLAYTEST 184 and 185 results, and DEPLOY.md (the jar and the pack go live together).
   - Merge `claude/minigun` into `main` and push.
10. **Bring the owner's open questions** in one short message with a recommendation each:
    - **PLAYTEST 184 (minigun):** rifle-shaped or M134; 16 or 18 a second; spin times; rifle ammo 400 or 300; $1.5M at level 125; the sight; the 3 s coast; the shared spin-sound stop; the spin-up loudness; the shot weight.
    - **PLAYTEST 185 (hands):** the hands at rest (hip poses, or a PG3D-like peek); a glove holding the bag; the Shotgun's cant and pump; the sniper's bolt by hand; the look-alike slide vs. the cooldown dip; the glove and sleeve colors; no hands while aiming.

## 3. The owner and how to work

- **Owner:** Explosde (Java name), playing on the 26.3 client. Keep answers short with one clear recommendation, give a cautious and a realistic option on key decisions, use a short analogy for new ideas, and write math as equations. Text colors: never `&8` for readable text.
- **Ultracode is on:** use workflows for substantive work (builder, critic, fixer; reviews with lenses and a skeptic), and verify before claiming.
- **PC use:** once told to use the PC, keep using it. The owner stops it themselves.
- **Never:** type passwords or sign in, enter API keys or secrets, port-forward RCON, copy local-only settings to Minehut, upload `zz-*.sk` helpers, put "Pixel Gun" in player-facing names, extract files from Pixel Gun 3D, let Skript set or reset `item_model` on a player's real guns, or run `jcmd -l` or read javaw's command line (the login token).
- **Add-ons** (installed 2026-10-12, in CLAUDE.md's Local setup):
  - **Agent Skills:** Addy Osmani's four planning skills, in `.claude/skills/`, run only by the owner as `/interview-me` etc.
  - **Ponytail:** a "write the least code" plugin, now in **full** mode by default. It loads in sessions started after a Claude app restart. CLAUDE.md wins where they differ (tests, reviews, notes).
  - Node is on the user PATH (`%LOCALAPPDATA%\Programs\node`) for Ponytail's hooks.

## 4. Gotchas from the last sessions

- **Resource names:** only `[a-z0-9_.-/]`. One capital letter in an item definition breaks the whole file in the client, and the bots can't see it.
- **Shell edits:** Bash heredocs and `node -e "..."` eat backslashes and turn `\n` into newlines. Write docs with Windows paths through the Write/Edit tools or a script file.
- **Git:** stage files by name. Once `git commit -a` swept up unrelated pack files. `.git/worktrees/review-jobs: Permission denied` warnings are harmless. An untracked `logs/` folder at the repo root isn't ours.
- **Computer use in Minecraft:**
  - Open the launcher with open_application "Minecraft Launcher" (taskbar clicks are blocked).
  - Restore and focus the game window with PowerShell ShowWindow(3) + SetForegroundWindow on the `javaw` whose title starts with "Minecraft".
  - Join through Multiplayer → Direct Connection → `127.0.0.1`.
  - Give guns with `wm give Explosde <title> 1 {slot:0-4}`: 50_GS, 357_Magnum, Uzi, STG44, R9_0, M4A1, AK_47, AX_50, MG34, FN_FAL. Clear a slot first with `minecraft:item replace entity Explosde hotbar.N with air`. Add ammo with `zzammo Explosde light|shells|rifle <n>`.
  - In game: left-click aims, right-click fires, Q reloads, F5 cycles the view.
  - The owner's account wears the Kingpin AK-48 and Molten Shotgun skins (`/dphone gunskin Explosde` prints them).
  - `zzpack Explosde` resends the pack.
  - Click to Do or TextInputHost can steal focus (CLAUDE.md's tips).
- **Previews:** `tools/guns/dev/preview.js <module> <key> <out> --kit tools/guns/pg.js --views gui,side,fp,fpads,fpreload,tp`, plus `lint.js`, `hands.js`, `skinlint.js`; `tools/render-item.js` renders any frame (`--cooldown`, `--fire`, `--flag`, `--def`). Contact sheets: render to PNGs and tile them with PowerShell System.Drawing.
- **Watch for in the client:** the minigun spins in third person through flags (other viewers don't get the holder's cooldown). BagHide sends the holder a look-alike through `Player#sendEquipmentChange` to themselves. Whether the 26.3 client applies that to its own offhand is the first thing to confirm. If not, set `gunfx.bag-hide: cooldown`, which shows a white sweep on the offhand slot.

## 5. After this

CLAUDE.md's "Waiting on the owner" and the older PLAYTEST questions still stand: the money numbers, Tebex, crate odds, MOTD, Minehut setup. Then the Minehut deploy (DEPLOY.md lists every file and command).
