/**
 * Any Switch 入力順序（ComfyUI 非依存）
 */

export const SELECT_INDEX_INPUT_NAME = "select_index";

/**
 * @param {Array<{ name?: string }>} inputs
 * @returns {number}
 */
export function countAnyInputsInList(inputs) {
  return (inputs ?? []).filter((inp) => inp.name?.startsWith("any_")).length;
}

/**
 * コピペ復元直後: required の select_index が any_* より前に並ぶことがある。
 *
 * @param {Array<{ name?: string }>} inputs
 * @returns {boolean}
 */
export function isAnySwitchPasteOrderMismatch(inputs) {
  const selectIdx = (inputs ?? []).findIndex((inp) => inp.name === SELECT_INDEX_INPUT_NAME);
  const firstAnyIdx = (inputs ?? []).findIndex((inp) => inp.name?.startsWith("any_"));
  if (selectIdx < 0 || firstAnyIdx < 0) {
    return false;
  }
  return selectIdx < firstAnyIdx;
}

/**
 * 保存時の target_slot（any_01=0, any_02=1, …, select_index=anyCount）を現在の inputs 配列 index に変換。
 *
 * @param {number} serializedSlot
 * @param {Array<{ name?: string }>} inputs
 * @returns {number}
 */
export function remapSerializedTargetSlotToInputIndex(serializedSlot, inputs) {
  const anyCount = countAnyInputsInList(inputs);
  if (serializedSlot >= 0 && serializedSlot < anyCount) {
    const name = `any_${String(serializedSlot + 1).padStart(2, "0")}`;
    const idx = inputs.findIndex((inp) => inp.name === name);
    return idx >= 0 ? idx : serializedSlot;
  }
  if (serializedSlot === anyCount) {
    const idx = inputs.findIndex((inp) => inp.name === SELECT_INDEX_INPUT_NAME);
    return idx >= 0 ? idx : serializedSlot;
  }
  return serializedSlot;
}

/**
 * ペースト直後のリンク target_slot をスロット名基準で付け直す。
 *
 * @param {Array<{ name?: string }>} inputs
 * @param {Array<{ target_id?: number, target_slot?: number }>} linksToNode
 * @param {number} nodeId
 */
export function remapPastedLinksToNamedInputs(inputs, linksToNode, nodeId) {
  for (const link of linksToNode) {
    if (link.target_id !== nodeId) {
      continue;
    }
    if (link.target_slot == null) {
      continue;
    }
    link.target_slot = remapSerializedTargetSlotToInputIndex(link.target_slot, inputs);
  }
}
