# Critique fixes (2026-10-28)

The fix step for the critic's findings on `tools/build/city/PLAN.md` and `plan-layout.js`. Each finding was checked against the code. All 23 were real and fixed. Where a fix differs from the suggestion, PLAN.md's "Critique log" says why.

| # | Where | Finding | Outcome |
|---|---|---|---|
| 1 | 7.4 T16-T20 mantrap; 7.3 M1 bay | 5 phased beams always 3-4 on, stacked hits can kill | fixed: 3 beams (57.4/58.0/58.65), damage=1, on/off 1.5, offsets 0/0.5/1.0 (0.5 s dark), T20 dropped; M1 bay the same (T20-T24) |
| 2 | 7.4 deposit room | 3 beams overlap, 10.5 hearts | fixed: damage=1 (now T19-T21) |
| 3 | 7.2 obby 2, 7.3 T9-T10 | vertical lasers are poles | fixed: full-floor horizontal blinking beams between pillar pairs (max 2 a line); bank T9/T10 low + duck at z 302.5, offsets 0/2 |
| 4 | casino and bank cop spots | round-robin spots that can't reach B2 / too far | fixed: casino C1-C3 at 925.5 65 349.5/353.5/358.5; bank 660.5 65 296.5/305.5; test 2.9d spelled out |
| 5 | 7.2 T27 office turret | it shoots the robber at the keypad | fixed: 615.5 90.0 401.5 yaw 180 pitch 35 angle 25 range 5 every 1.0 (the suggested spot still saw the keypad) |
| 6 | 7.3 T2 | G2 inside the cone | fixed: yaw 70, angle 20, range 9 (G2 41° off axis, 10.9 away); watches the stair top |
| 7 | 7.1 //pos1 | space-separated | fixed: comma vectors, one command a line |
| 8 | 9.1 / 9.3 pile air | 2..3 air rule fails most piles | fixed: pile block solid + next 2 blocks air, higher air or a lid fine |
| 9 | 4.2 roof | the roof bypasses both laser floors | fixed: roof exit-only (fire escape 4 up, vent ladder 3 up, deck ladder 4 up); G1 the only way in |
| 10 | plan-layout.js | still the museum | fixed: regenerated from PLAN section 8 (COMMON identical), casino footprints, spots, colors; re-rendered |
| 11 | 5.3, 6.3, 7.4 tools | 1 Drill, 3 Safe Kits | fixed: Box 167 and the deposit shutter are crew objectives; solo kit use stated |
| 12 | 6.3 / 7.4 bikes | a bike doubles the chase radius | fixed: stated; on foot past x 781, by bike to x ≤ 669 on Vault Street (GPS path exists) |
| 13 | 7.4 L1 | gap above the bars | fixed: ceiling y 71 solid over z 338..340, hole z 341..344 only (bars kept at 66..70) |
| 14 | 5.2 bollards | polished_andesite_wall doesn't exist | fixed in PLAN (andesite_wall); decision.md not in this step's files |
| 15 | MIX.walk | missing | fixed: walk: light_gray_concrete in COMMON (both files) |
| 16 | 7.3 L2, L4, L5 | lockdown fills the pylon / could box the stair | fixed: L2 to z 315, L4 to x 624, mezzanine stair given (x 608..613, z 289..290), outside L5 |
| 17 | 5.2 manhole | 2x2 open hole | fixed: 1x1 shaft at 575, 300, ladder on its west wall, iron-bar ring with a gap at the ladder |
| 18 | text inconsistencies | various | fixed: laser heights, LEG z2 339, 9.4 reference, deck, workshop/G9/P13, vent entry, back stair feet, gate materials, renamed to Vault Street (VAULT_ST), bikes on .5, setup strips `#` notes, pool/advanced lines added |
| 19 | 7.2 obby 1 | north strip free, all beams jumpable | fixed: z beams 377..404, T9/T11/T13 duck beams (74.65) |
| 20 | 7.2 T22/T23 | duck beams on stairs | fixed: flights listed step by step, beams over flat landings at feet 90 |
| 21 | 7.4 Diamonds plates | grabbed from 2 blocks away | fixed differently: a ceiling turret over the plinth (sneak to take), because reach 4.5 also beats a 5x5 ring |
| 22 | T4, T10 turrets | 0.5 s fire rate too deadly | fixed: every=1.0 (also the new T27, T22) |
| 23 | casino floor | casino.sk doesn't exist | fixed: planned separately (the owner's 2026-10-28 request), static-prop launch fallback in 6.2 |
