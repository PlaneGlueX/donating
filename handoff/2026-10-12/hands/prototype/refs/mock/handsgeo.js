// The proposed first-person hands, as kit boxes (tools\guns\pg.js style 'pg'), authored in their own small spaces and
// placed by the item definition's per-model transformation (so the model files stay inside -16..32 whatever the
// gun). A MOCK for the choreography document (CHOREO.md): the real build gives them their own texture (#h) so gun
// skins never repaint them.
//   handR: the right hand on a pistol grip, mostly BEHIND it (its right side and the back strap), so the grip's art
//          stays in view: from first person only the thumb along the frame, the fingertips round the front strap
//          and the wrist show. Origin = the grip's top centre; -y down the grip, -x forward, +z the gun's left.
//   handL: the left hand, a gloved grab. Origin = the palm's centre; the palm faces -z (what it holds), the fingers
//          curl under it (-y, toward -z), the thumb over the top (+y), the wrist at +x.
//   armR / armL: a jacket sleeve. Origin = the wrist; +x up the forearm toward the elbow.
// Palette keys (a glove cosmetic recolors these, never a gun skin): glove, gloveK (knuckle pads), stitch, cuff,
// sleeve, trim (the stripe round the sleeve's end).
const palette = {
  glove: [92, 94, 104], gloveK: [150, 154, 166], stitch: [196, 196, 204], cuff: [52, 54, 62],
  sleeve: [62, 80, 118], trim: [214, 170, 72]
}
const mats = { glove: 'paint', gloveK: 'paint', stitch: 'flat', cuff: 'dark', sleeve: 'paint', trim: 'paint' }
// a right hand for a grip from x f (front) to b (back) round the origin, half thickness hz
const handR = ({ f = -1.6, b = 1.6, hz = 1.25 } = {}) => [
  // the back of the hand on the grip's right side (-z), the knuckle pads along it
  { from: [f - 0.5, -4.0, -hz - 1.0], to: [b + 0.5, 0.5, -hz], c: 'glove', split: { x: [(f + b) / 2] }, deco: [{ k: 'rivets', face: 'north', at: [f - 0.25, -0.25], to: [b, -0.75], n: 4, c: 'gloveK' }] },
  // the heel of the hand over the back strap
  { from: [b, -4.0, -hz - 1.0], to: [b + 1.0, 0.75, hz], c: 'glove' },
  // the fingers round the front strap (tips: a row of ridges on the left side)
  { from: [f - 0.75, -4.0, -hz - 1.0], to: [f, -0.75, hz + 0.25], c: 'glove', split: { y: [-3.25, -2.5, -1.75] } },
  ...[-3.6, -2.85, -2.1, -1.35].map(y => ({ from: [f, y, hz], to: [f + 0.75, y + 0.5, hz + 0.25], c: 'gloveK', outline: false })),
  // the thumb along the frame's left side above the grip, pointing forward
  { from: [f - 0.5, 0.0, hz], to: [b + 0.5, 0.75, hz + 0.75], c: 'glove', deco: [{ k: 'band', face: 'south', at: [f - 0.25, 0.75], to: [f + 0.25, 0.0], c: 'gloveK' }] },
  // the cuff at the wrist (stitched)
  { from: [b + 1.0, -4.25, -hz - 1.25], to: [b + 2.75, 1.0, hz + 0.25], c: 'cuff', deco: [{ k: 'band', face: 'sides', at: [b + 1.75, 1.0], to: [b + 2.0, -4.25], c: 'stitch' }] }
]
const WRIST_R = ({ b = 1.6 } = {}) => [b + 2.75, -1.6, -0.5]
const arm = len => [
  { from: [0, -2.0, -2.0], to: [len, 2.0, 2.0], c: 'sleeve', split: { x: [len * 0.55] }, deco: [{ k: 'band', face: 'sides', at: [0.75, 2.0], to: [1.5, -2.0], c: 'trim' }, { k: 'band', face: 'flats', at: [0.75, -2.0], to: [1.5, 2.0], c: 'trim' }] }
]
const handL = [
  // the back of the hand (+z) with a knuckle pad, and the palm
  { from: [-1.75, -1.75, -0.75], to: [1.75, 1.75, 0.75], c: 'glove', deco: [{ k: 'band', face: 'south', at: [-1.5, 1.5], to: [0.75, 0.75], c: 'gloveK' }] },
  // four fingers curled under (toward -z), split across
  { from: [-1.75, -2.75, -2.25], to: [1.75, -1.75, 0.75], c: 'glove', split: { x: [-0.875, 0, 0.875] } },
  // the thumb over the top
  { from: [-2.5, 0.5, -1.75], to: [-1.5, 2.25, 0.25], c: 'glove' },
  // the cuff
  { from: [1.75, -2.0, -1.0], to: [3.25, 2.0, 1.0], c: 'cuff', deco: [{ k: 'band', face: 'sides', at: [2.25, 2.0], to: [2.5, -2.0], c: 'stitch' }] }
]
const WRIST_L = [3.25, 0, 0]
module.exports = { palette, mats, handR, WRIST_R, handL, WRIST_L, arm }
