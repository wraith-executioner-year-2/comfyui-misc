/**
 * 動的入出力ノードのキャンバス上サイズを内容に合わせる。
 */

/**
 * 出力スロットのカスタム座標を外し、配列順と描画位置のずれを防ぐ。
 *
 * @param {object} node
 */
export function normalizeOutputSlotLayout(node) {
  for (const output of node.outputs ?? []) {
    delete output.pos
    if (output.hidden) {
      output.hidden = false
    }
  }
}

/**
 * computeSize() の結果でノード枠を更新（出力増減後に接続点が枠外へ出るのを防ぐ）。
 *
 * @param {object} node
 */
export function syncNodeSizeToContent(node) {
  if (node.removed || typeof node.computeSize !== "function") {
    return
  }

  normalizeOutputSlotLayout(node)

  const size = node.computeSize()
  if (!size?.length) {
    return
  }

  const current = node.size ?? [0, 0]
  const nextW = size[0]
  const nextH = size[1]
  if (current[0] !== nextW || current[1] !== nextH) {
    node.setSize([nextW, nextH])
    node.graph?.setDirtyCanvas?.(true, false)
  }
}
