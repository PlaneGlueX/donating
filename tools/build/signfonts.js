// The text-display signs' fonts (owner, 2026-10-21: "big text in different fonts/styles, not one font everywhere (pack
// fonts on text displays)"): six OFL fonts in pack/assets/donating/font (each with its licence in licenses/), as pack
// fonts donating:sign_<style> (a TrueType provider, then the default font for anything they lack: ·, →, ↓).
//   stencil  Black Ops One: the prison's signs (GATEHOUSE, POLICE, SECURITY...)
//   tall     Bebas Neue: shop fronts and town names (GUN SHOP, CAR DEALER, MOUNTAINSIDE...)
//   script   Pacifico: the donut shop, welcomes, "Don't Punch!"
//   street   Anton: street names, STOP
//   block    Bungee: the pool hall, the mart, fuel, bays
//   western  Rye: the pawn shop, WANTED
//   plain    the default font: numbers, prices lined up with spaces, small plaques and lists
// A label's own `font` (a style above, or a full font id) wins; else the rule for its words (fontFor). `bold`, `italic`
// on a label set those styles.
'use strict'
const FONTS = {
  stencil: 'donating:sign_stencil',
  tall: 'donating:sign_tall',
  script: 'donating:sign_script',
  street: 'donating:sign_street',
  block: 'donating:sign_block',
  western: 'donating:sign_western',
  plain: ''
}

// place: "jail" (the prison's modules) or "town".
function fontFor (l, place) {
  if (l.font !== undefined) return FONTS[l.font] !== undefined ? FONTS[l.font] : l.font
  const t = l.text
  if (place === 'jail') {
    if (/^Z$|^\d/.test(t)) return FONTS.plain
    if (/Punch/.test(t)) return FONTS.script
    if (/BIKES|REPAIRS/.test(t)) return FONTS.tall
    return FONTS.stencil
  }
  if (/DONUTS|FRESH|DAILY|WELCOME|COME BACK/.test(t)) return FONTS.script
  if (/PAWN|GOLD|REFUNDS|WANTED|HITS/.test(t)) return FONTS.western
  if (/\b(Street|Road|Court|Avenue|Lane)\b|^STOP$|^SOS$/.test(t)) return FONTS.street
  if (/POOL HALL|^8$|CHOP|MART|FUEL|^GAS$|^BAY \d|^ATM$|^OPEN$/.test(t)) return FONTS.block
  if (/^\d+$/.test(t) || /\n/.test(t) || /\d\.\d\d/.test(t) || l.scale < 0.8) return FONTS.plain
  return FONTS.tall
}

// The label's text component as SNBT (snbt: the caller's text escaper).
function textNbt (l, place, snbt) {
  const font = fontFor(l, place)
  return `{text:"${snbt(l.text)}",color:"${l.color}"${font ? `,font:"${font}"` : ''}${l.bold ? ',bold:1b' : ''}${l.italic ? ',italic:1b' : ''}}`
}

module.exports = { FONTS, fontFor, textNbt }
