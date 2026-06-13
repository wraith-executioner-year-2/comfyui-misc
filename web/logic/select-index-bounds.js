/**
 * Any Switch / Any Output Switch の select_index 上限計算。
 */

/**
 * @param {number} dynamicSlotCount - any_* または data 出力の本数
 * @returns {number}
 */
export function computeSelectIndexMax(dynamicSlotCount) {
  return Math.max(-1, dynamicSlotCount - 2)
}

/**
 * @param {Array<{ links?: unknown[] }>} outputs
 * @param {number} dataOutputCount
 * @returns {boolean}
 */
export function nodeHasTrailingEmptyDataOutput(outputs, dataOutputCount) {
  const lastDataIndex = dataOutputCount - 1
  if (lastDataIndex < 0) {
    return false
  }
  return !outputs?.[lastDataIndex]?.links?.length
}

/**
 * Any Output Switch の select_index 上限。
 * 末尾に空き data スロットがあるときだけ 1 つ分を選べないようにする。
 *
 * @param {number} dataOutputCount
 * @param {boolean} [hasTrailingEmpty=true]
 * @returns {number}
 */
export function computeAnyOutputSelectIndexMax(dataOutputCount, hasTrailingEmpty = true) {
  const reservedSlots = hasTrailingEmpty ? 2 : 1
  return Math.max(-1, dataOutputCount - reservedSlots)
}
