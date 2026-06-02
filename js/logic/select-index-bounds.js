/**
 * Any Switch / Any Output Switch の select_index 上限計算。
 * 末尾の空スロットを選べないように (動的本数 - 2) を返す。
 */

/**
 * @param {number} dynamicSlotCount - any_* または data 出力の本数
 * @returns {number}
 */
export function computeSelectIndexMax(dynamicSlotCount) {
    return Math.max(-1, dynamicSlotCount - 2);
}
