import { miscSlotTypesConnect } from "../logic/litegraph-type-compat.js"

const PATCH_KEY = "__miscLiteGraphTypeCompat"

/**
 * PRIMITIVES ↔ * など、ComfyUI 標準の isValidConnection で落ちる組み合わせを許可する。
 */
export function installLiteGraphTypeCompatibility() {
  const LiteGraphRef = globalThis.LiteGraph
  if (!LiteGraphRef?.isValidConnection || LiteGraphRef[PATCH_KEY]) {
    return
  }

  const previous = LiteGraphRef.isValidConnection.bind(LiteGraphRef)
  LiteGraphRef.isValidConnection = function patchedIsValidConnection(typeA, typeB) {
    if (miscSlotTypesConnect(typeA, typeB)) {
      return true
    }
    return previous(typeA, typeB)
  }
  LiteGraphRef[PATCH_KEY] = true
}
