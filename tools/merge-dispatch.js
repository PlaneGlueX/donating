// Joins two item definitions that are both a range_dispatch on custom_model_data (index 0), e.g.
// WeaponMechanics' items/feather.json (every WeaponMechanics gun's skin numbers) and ours (only the
// numbers we redraw): WeaponMechanics' entries plus ours, ours winning on the same threshold, sorted by
// threshold (the client picks the last entry whose threshold <= the value), the base's fallback kept.
// The top-level fields (hand_animation_on_swap) are ours. Used by build-pack.js and render-item.js.
const isDispatch = j => j && j.model && /(^|:)range_dispatch$/.test(j.model.type) &&
  /(^|:)custom_model_data$/.test(j.model.property) && (j.model.index || 0) === 0 &&
  (j.model.scale === undefined || j.model.scale === 1) && Array.isArray(j.model.entries)

const mergeRangeDispatch = (base, ours, name = 'item definition') => {
  if (!isDispatch(base)) throw new Error(`${name}: the other pack's isn't a range_dispatch on custom_model_data index 0`)
  if (!isDispatch(ours)) throw new Error(`${name}: ours isn't a range_dispatch on custom_model_data index 0`)
  const byThreshold = new Map(base.model.entries.map(e => [e.threshold, e]))
  const replaced = []
  const added = []
  for (const e of ours.model.entries) {
    (byThreshold.has(e.threshold) ? replaced : added).push(e.threshold)
    byThreshold.set(e.threshold, e)
  }
  const entries = [...byThreshold.values()].sort((a, b) => a.threshold - b.threshold)
  const fallback = base.model.fallback || ours.model.fallback || { type: 'minecraft:model', model: 'minecraft:item/feather' }
  return { json: { ...base, ...ours, model: { ...base.model, entries, fallback } }, replaced, added }
}

module.exports = { mergeRangeDispatch, isDispatch }
