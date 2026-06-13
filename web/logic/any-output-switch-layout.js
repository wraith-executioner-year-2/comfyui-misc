/**
 * Any Output Switch (misc) — Python any_output_switch._compute_output_layout と同等の純粋ロジック。
 * ComfyUI 非依存。単体テスト用。
 */

export const MIN_DATA_OUTPUTS = 1

/** web/any_output_switch.js stabilize が最後の接続 data の次に確保する空きスロット数 */
export const STABILIZE_TRAILING_EMPTY_DATA_SLOTS = 1

/**
 * @param {number[]} linkedSlots
 * @returns {number[]}
 */
function normalizeLinkedSlots(linkedSlots) {
  return [...new Set(linkedSlots.map((s) => Number(s)))].sort((a, b) => a - b)
}

/**
 * @param {number[]} sortedSlots
 * @param {number} minDataOutputs
 */
function isIndexOnlyConnection(sortedSlots, minDataOutputs) {
  return sortedSlots.length === 1 && sortedSlots[0] === minDataOutputs
}

/**
 * @param {number} numData
 * @param {number} maxSlot
 * @returns {number}
 */
export function padNumDataForStabilize(numData, maxSlot) {
  return Math.max(numData, maxSlot + STABILIZE_TRAILING_EMPTY_DATA_SLOTS + 1)
}

/**
 * @param {number[]} sortedSlots
 * @param {number} minDataOutputs
 * @returns {{ dataSlots: number[], numData: number, maxSlot: number }}
 */
function layoutFromLinkedSlots(sortedSlots, minDataOutputs) {
  const maxSlot = sortedSlots[sortedSlots.length - 1]
  const contiguousFromZero = sortedSlots.every((slot, i) => slot === i)

  if (contiguousFromZero) {
    return {
      dataSlots: sortedSlots,
      numData: Math.max(minDataOutputs, maxSlot + 1),
      maxSlot,
    }
  }

  const numData = Math.max(minDataOutputs, maxSlot)
  return {
    dataSlots: sortedSlots.filter((s) => s < numData),
    numData,
    maxSlot,
  }
}

/**
 * @param {number[]} linkedSlots - このノード出力への接続スロット番号
 * @param {number} [minDataOutputs=1]
 * @returns {{ dataSlots: number[], numData: number, indexSlot: number }}
 */
export function computeOutputLayout(linkedSlots, minDataOutputs = MIN_DATA_OUTPUTS) {
  if (!linkedSlots?.length) {
    const numData = minDataOutputs
    return { dataSlots: [], numData, indexSlot: numData }
  }

  const sortedSlots = normalizeLinkedSlots(linkedSlots)

  if (isIndexOnlyConnection(sortedSlots, minDataOutputs)) {
    const numData = minDataOutputs
    return { dataSlots: [], numData, indexSlot: numData }
  }

  const { dataSlots, numData, maxSlot } = layoutFromLinkedSlots(sortedSlots, minDataOutputs)
  const paddedNumData = padNumDataForStabilize(numData, maxSlot)
  return { dataSlots, numData: paddedNumData, indexSlot: paddedNumData }
}

/**
 * 実行結果タプルを組み立てる（ExecutionBlocker は null で表現）。
 *
 * @param {*} input
 * @param {number} selectIndex
 * @param {number[]} linkedSlots
 * @param {number} [minDataOutputs]
 * @returns {{ values: unknown[], selectedIndex: number, indexSlot: number }}
 */
export function buildSwitchOutputValues(input, selectIndex, linkedSlots, minDataOutputs = MIN_DATA_OUTPUTS) {
  const { dataSlots, numData, indexSlot } = computeOutputLayout(linkedSlots, minDataOutputs)

  let selectedIndex
  let finalNumData = numData

  if (selectIndex != null && selectIndex >= 0) {
    selectedIndex = selectIndex
    finalNumData = Math.max(numData, selectedIndex + 1, minDataOutputs)
  } else {
    selectedIndex = dataSlots.length > 0 ? Math.min(...dataSlots) : -1
  }

  const values = []
  for (let i = 0; i < finalNumData; i++) {
    values.push(i === selectedIndex ? input : null)
  }
  values.push(selectedIndex)

  return { values, selectedIndex, indexSlot }
}
