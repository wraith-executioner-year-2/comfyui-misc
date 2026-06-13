/**
 * 入力スロットを配列内で移動したときの target_slot 再マップ（ComfyUI 非依存）。
 *
 * @param {number} fromIndex - 移動元
 * @param {number} newIndex - 移動先
 * @param {number} targetSlot - リンクが指していた入力番号
 * @returns {number}
 */
export function remapInputTargetSlot(fromIndex, newIndex, targetSlot) {
  if (targetSlot === fromIndex) {
    return newIndex
  }
  if (targetSlot > fromIndex && targetSlot <= newIndex) {
    return targetSlot - 1
  }
  return targetSlot
}
