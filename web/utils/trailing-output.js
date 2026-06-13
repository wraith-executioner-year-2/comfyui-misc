/**
 * 最後尾に固定メタ出力（index / length など）を持つノード用ヘルパ。
 *
 * @param {string} metaName - 末尾スロット名
 * @param {string} [metaType="INT"]
 */
export function createTrailingOutputHelpers(metaName, metaType = "INT") {
  const isMetaSlot = (node) => node.outputs[node.outputs.length - 1]?.name === metaName

  const countDataSlots = (node) => {
    if (!node.outputs?.length) {
      return 0
    }
    return isMetaSlot(node) ? node.outputs.length - 1 : node.outputs.length
  }

  const ensureMeta = (node) => {
    if (!isMetaSlot(node)) {
      node.addOutput(metaName, metaType)
    }
  }

  const getMetaIndex = (node) => {
    ensureMeta(node)
    return node.outputs.length - 1
  }

  return { isMetaSlot, countDataSlots, ensureMeta, getMetaIndex, metaName, metaType }
}
