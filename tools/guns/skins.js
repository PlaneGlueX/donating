// Gun skins (2026-10-06; the owner: "revamp the gun skin system to have different skin variants of specific guns"):
// each a look of one gun, painted by pg.js paintSkin from the gun's own tiles with a theme (palette: key -> color, pat:
// key -> pattern, ink: the outline, frames/frametime: animated). make-item-art.js writes each one's item definition
// (assets/donating/items/gunskin_<gun>_<look>.json: the gun's states and frames on the skin's models); core.sk's
// cos::<id>::model names it, and DonatingPhone's GunFx puts it on the player's guns as their item_model.
// Rules: a released look is never renamed or removed (retire it in core.sk); the keys aimed through (the flash, the
// lens, the beam, the bore, the AK-48's scope tube) are never recolored (pg.js refuses); a skin never changes geometry.
module.exports = [
  // ---------- Classic Pistol (gs50) ----------
  // Safety Orange (daily): blaze orange, a black frame and grip.
  { gun: 'gs50', look: 'safety', theme: { palette: { chrome: [255, 128, 24], chromeDark: [204, 86, 12], frame: [30, 30, 34], frameLight: [70, 70, 78], leather: [34, 34, 38], leatherDark: [18, 18, 20] } } },
  // Bubblegum (uncommon): a pink frame, a mint slide, a white grip.
  { gun: 'gs50', look: 'bubblegum', theme: { palette: { chrome: [160, 240, 206], chromeDark: [96, 190, 152], frame: [238, 120, 178], frameLight: [255, 172, 212], leather: [240, 240, 240], leatherDark: [196, 196, 206] } } },
  // Glitch (hacked, in the Zero Day set): dark, with magenta and cyan bands jumping (4 frames).
  { gun: 'gs50', look: 'glitch', theme: { palette: { chrome: [34, 34, 46], chromeDark: [22, 22, 30], frame: [22, 22, 30], frameLight: [52, 52, 66], leather: [44, 14, 54], leatherDark: [26, 8, 32] }, pat: { chrome: 'glitch', frame: 'glitch' }, frames: 4, frametime: 2 } },
  // Mastermind (level 100, earned): matte black with gold trim (the sights keep their color, like every skin's).
  { gun: 'gs50', look: 'mastermind', theme: { palette: { chrome: [42, 42, 46], chromeDark: [28, 28, 32], frame: [22, 22, 24], frameLight: [212, 170, 60], leather: [26, 26, 28], leatherDark: [14, 14, 16], steel: [200, 160, 60] } } },

  // ---------- Machine Gun (uzi) ----------
  // Desert (common): tan and coyote brown.
  { gun: 'uzi', look: 'desert', theme: { palette: { body: [196, 170, 120], bodyLight: [220, 196, 148], bodyHi: [236, 216, 172], dark: [110, 86, 56], grip: [120, 94, 62], stock: [150, 120, 80], mag: [170, 146, 100], magHi: [210, 186, 140], magDark: [120, 98, 66] } } },
  // Woodland Camo (rare): green, brown and black blotches.
  { gun: 'uzi', look: 'woodland', theme: { palette: { body: [74, 92, 52], bodyLight: [104, 122, 76], bodyHi: [130, 146, 98], stock: [70, 86, 48], mag: [80, 96, 58], grip: [44, 48, 32] }, pat: { body: 'camo', stock: 'camo', mag: 'camo' }, camo: [[54, 42, 28], [112, 122, 72], [26, 30, 22]] } },
  // Carbon (epic): carbon weave with lime bands.
  { gun: 'uzi', look: 'carbon', theme: { palette: { body: [36, 38, 42], bodyLight: [64, 68, 74], bodyHi: [150, 255, 60], stock: [32, 34, 38], mag: [32, 34, 38], magHi: [150, 255, 60], red: [150, 255, 60], redHi: [200, 255, 140] }, pat: { body: 'carbon', stock: 'carbon', mag: 'carbon' } } },

  // ---------- Shotgun (r90) ----------
  // Urban Camo (uncommon): grey, white and charcoal blocks.
  { gun: 'r90', look: 'urban', theme: { palette: { silver: [150, 150, 156], silverMid: [120, 120, 126], wood: [84, 84, 90], woodLight: [110, 110, 116], woodDark: [60, 60, 66], grip: [72, 72, 78], gripDark: [50, 50, 56] }, pat: { silver: 'camo', silverMid: 'camo', wood: 'camo' }, camo: [[230, 230, 232], [58, 58, 62], [108, 108, 114]] } },
  // Tiger (epic): orange with black diagonal stripes, a cream stock and pump.
  { gun: 'r90', look: 'tiger', theme: { palette: { silverHi: [255, 184, 84], silver: [240, 140, 30], silverMid: [210, 110, 20], silverDark: [150, 70, 10], wood: [240, 226, 190], woodLight: [255, 244, 214], woodDark: [200, 184, 148], grip: [240, 226, 190], gripDark: [200, 184, 148] }, pat: { silver: 'stripe', silverMid: 'stripe' }, stripe: [22, 18, 16] } },
  // Molten (legendary): obsidian with glowing lava cracks that pulse (8 frames).
  { gun: 'r90', look: 'molten', theme: { palette: { silverHi: [62, 42, 72], silver: [32, 22, 38], silverMid: [26, 18, 32], silverDark: [16, 10, 20], wood: [42, 26, 22], woodLight: [62, 36, 28], woodDark: [24, 14, 12], grip: [32, 20, 18], gripDark: [20, 12, 10] }, pat: { silver: 'lava', silverMid: 'lava', wood: 'lava', grip: 'lava' }, frames: 8, frametime: 3 } },

  // ---------- AK-48 (ak47) ----------
  // Crimson (rare): crimson with black stripes and silver bands.
  { gun: 'ak47', look: 'crimson', theme: { palette: { recv: [150, 20, 30], recvT: [190, 40, 50], gm: [200, 205, 215], gmL: [235, 238, 245], red: [22, 22, 24], redB: [52, 52, 58], white: [200, 205, 215], magG: [150, 20, 30], magK: [100, 14, 20], gripP: [120, 16, 24] } } },
  // Golden (legendary, announced): gold all over; the scope's tube stays dark.
  { gun: 'ak47', look: 'golden', theme: { palette: { recv: [196, 148, 40], recvT: [240, 200, 90], gm: [228, 178, 58], gmD: [150, 100, 20], gmL: [255, 230, 140], edge: [255, 240, 180], red: [255, 222, 120], redB: [255, 240, 190], white: [250, 230, 160], gl: [220, 170, 60], magG: [210, 160, 50], magW: [250, 230, 160], magK: [160, 110, 30], gripP: [200, 150, 40] }, pat: { recv: 'gold', gm: 'gold', magG: 'gold' } } },
  // H4CK3R (hacked, in the H4CK3R set): matte black with falling green code (8 frames).
  { gun: 'ak47', look: 'h4ck3r', theme: { palette: { recv: [14, 16, 14], recvT: [26, 30, 26], gm: [20, 24, 20], gmL: [60, 200, 90], edge: [80, 255, 120], red: [40, 200, 70], redB: [120, 255, 150], white: [40, 200, 70], magG: [20, 22, 20], magW: [40, 200, 70], magK: [10, 12, 10], gripP: [24, 26, 24] }, pat: { recv: 'code', gm: 'code', magG: 'code' }, frames: 8, frametime: 2 } },
  // Kingpin (level 150, earned): black, deep-red furniture, gold trim.
  { gun: 'ak47', look: 'kingpin', theme: { palette: { recv: [18, 18, 20], recvT: [34, 34, 38], gm: [110, 16, 24], gmD: [70, 10, 16], gmL: [160, 30, 40], edge: [220, 180, 70], red: [220, 180, 70], redB: [255, 220, 120], white: [110, 16, 24], magG: [24, 24, 26], magW: [220, 180, 70], gripP: [90, 14, 20] } } },

  // ---------- The guns added 2026-10-06 ----------
  // Gilded Old Revolver (epic): a gold frame and cylinder, a black grip.
  { gun: 'rev', look: 'gilded', theme: { palette: { chrome: [236, 196, 80], chromeDark: [180, 138, 40], frame: [226, 180, 64], frameDark: [160, 118, 34], cyl: [240, 206, 96], cylDark: [170, 128, 40], cylEnd: [210, 166, 60], wood: [28, 28, 30], woodDark: [14, 14, 16] }, pat: { chrome: 'gold', frame: 'gold', cyl: 'gold' } } },
  // Army Combat Rifle (rare): forest camo furniture (the black metal stays).
  { gun: 'm16', look: 'army', theme: { palette: { camo: [86, 104, 62], camoT: [110, 128, 80], camoD: [48, 58, 34], camoB: [70, 86, 48], camoS: [96, 110, 74], camoW: [130, 140, 100] }, pat: { camo: 'camo', camoT: 'camo' }, camo: [[58, 46, 30], [120, 128, 80], [30, 34, 24]] } },
  // Neon Brave Patriot (legendary): dark blue and red with cyan neon edges.
  { gun: 'tommy', look: 'neon', theme: { palette: { metal: [30, 34, 70], metalL: [60, 220, 255], metalD: [20, 22, 48], dark: [14, 14, 30], wood: [200, 30, 60], woodD: [130, 16, 40], woodL: [255, 90, 130], drum: [30, 34, 70], drumD: [14, 14, 30], brass: [60, 220, 255], brassD: [30, 150, 200] } } },
  // Arctic Sniper Rifle (epic): white and grey camo.
  { gun: 'sniper', look: 'arctic', theme: { palette: { wood: [220, 226, 232], woodL: [240, 244, 248], woodD: [180, 188, 196], woodDD: [150, 158, 168], gun: [200, 206, 214], gunL: [232, 236, 242], gunD: [150, 156, 166] }, pat: { wood: 'camo', gun: 'camo' }, camo: [[150, 160, 170], [245, 248, 250], [110, 120, 132]] } }
]
