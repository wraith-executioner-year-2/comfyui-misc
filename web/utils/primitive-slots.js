import { PRIMITIVE_SLOT_TYPE, LENGTH_OUTPUT_NAME } from "./constants.js"
import { createTrailingOutputHelpers } from "./trailing-output.js"

const lengthTrailing = createTrailingOutputHelpers(LENGTH_OUTPUT_NAME)

export const isLengthOutputSlot = lengthTrailing.isMetaSlot
export const countPrimitiveDataOutputs = lengthTrailing.countDataSlots
export const ensureLengthOutput = lengthTrailing.ensureMeta

/**
 * Combine Primitives (misc) 用: primitive_* 入力スロットを動的に増やす。
 *
 * Split Primitives 側は、出力同期ロジックを split_primitives.js にローカル実装したため
 * Split 専用ヘルパ（desired計算/切断/同期）はここから削除しました。
 */
export function addPrimitiveInputs(node, num = 1, slotType = PRIMITIVE_SLOT_TYPE) {
  const primitiveInputs = node.inputs.filter((inp) => inp.name?.startsWith("primitive_"))
  let nextIndex = primitiveInputs.length + 1

  for (let i = 0; i < num; i++) {
    node.addInput(`primitive_${String(nextIndex).padStart(2, "0")}`, slotType)
    nextIndex += 1
  }
}
