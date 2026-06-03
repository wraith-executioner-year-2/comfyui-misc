/**
 * Any Output Switch — コピペ / ワークフロー復元（ComfyUI 非依存）
 */

export const INDEX_OUTPUT_NAME = "index"

/**
 * @param {Array<{ name?: string }>} outputs
 * @returns {number}
 */
function findTrailingIndexPos(outputs) {
  for (let i = (outputs ?? []).length - 1; i >= 0; i--) {
    if (outputs[i]?.name === INDEX_OUTPUT_NAME) {
      return i
    }
  }
  return -1
}

/**
 * data 出力スロットの配列 index（末尾 index のみ除外。途中に index があるコピペずれにも対応）。
 *
 * @param {Array<{ name?: string }>} outputs
 * @returns {number[]}
 */
export function listDataOutputSlotIndices(outputs) {
  const list = outputs ?? []
  const len = list.length
  const lastIsIndex = len > 0 && list[len - 1]?.name === INDEX_OUTPUT_NAME
  const end = lastIsIndex ? len - 1 : len
  const indices = []
  for (let i = 0; i < end; i++) {
    if (list[i]?.name !== INDEX_OUTPUT_NAME) {
      indices.push(i)
    }
  }
  return indices
}

/**
 * 保存時の data スロット番号（0=1本目, …, dataCount=index）を現在の outputs 配列 index に変換。
 *
 * @param {number} serializedSlot
 * @param {Array<{ name?: string }>} outputs
 * @returns {number}
 */
export function remapSerializedOriginSlotToOutputIndex(serializedSlot, outputs) {
  const dataIndices = listDataOutputSlotIndices(outputs)
  const trailingIndexPos = findTrailingIndexPos(outputs)

  if (serializedSlot >= 0 && serializedSlot < dataIndices.length) {
    return dataIndices[serializedSlot]
  }
  if (trailingIndexPos >= 0 && serializedSlot === dataIndices.length) {
    return trailingIndexPos
  }
  return serializedSlot
}

/**
 * index が末尾でない、または data 領域に index 名が混ざっているとき true。
 *
 * @param {Array<{ name?: string }>} outputs
 * @returns {boolean}
 */
export function isAnyOutputPasteLayoutMismatch(outputs) {
  if (!outputs?.length) {
    return false
  }
  const indexPos = outputs.findIndex((o) => o?.name === INDEX_OUTPUT_NAME)
  if (indexPos >= 0 && indexPos !== outputs.length - 1) {
    return true
  }
  for (let i = 0; i < outputs.length - 1; i++) {
    if (outputs[i]?.name === INDEX_OUTPUT_NAME) {
      return true
    }
  }
  return false
}

/**
 * 復元中は未接続の data 出力を削除しない（リンク復元前に slot が消えるのを防ぐ）。
 *
 * @param {boolean} restoring
 * @param {boolean} outputHasLinks
 * @returns {boolean}
 */
export function shouldSkipAnyOutputDataRemoval(restoring, outputHasLinks = false) {
  if (restoring) {
    return true
  }
  return outputHasLinks
}

/**
 * 復元中に確保すべき data 出力の最小本数。
 *
 * @param {object} params
 * @param {number} [params.minDefault=1]
 * @param {number} [params.cachedDataCount]
 * @param {number[]} [params.linkedDataOriginSlots] - このノード起点の data 側 origin_slot
 */
export function minDataOutputsForRestore({
  minDefault = 1,
  cachedDataCount = 0,
  linkedDataOriginSlots = [],
}) {
  const fromLinks = linkedDataOriginSlots.length ? Math.max(...linkedDataOriginSlots) + 1 : 0
  return Math.max(minDefault, cachedDataCount, fromLinks)
}

/**
 * ペースト直後: origin_slot をスロット名基準で付け直す。
 *
 * @param {Array<{ name?: string }>} outputs
 * @param {Array<{ origin_id?: number, origin_slot?: number }>} linksFromNode
 * @param {number} nodeId
 */
export function remapPastedLinksToNamedOutputs(outputs, linksFromNode, nodeId) {
  for (const link of linksFromNode) {
    if (link.origin_id !== nodeId) {
      continue
    }
    if (link.origin_slot == null) {
      continue
    }
    link.origin_slot = remapSerializedOriginSlotToOutputIndex(link.origin_slot, outputs)
  }
}
