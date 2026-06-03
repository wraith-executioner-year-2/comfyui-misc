/**
 * LiteGraph 型互換（ComfyUI 非依存）
 */

import { isPrimitivesLinkType } from "../utils/constants.js"

const WILDCARD_TYPE = "*"

/**
 * @param {string|undefined|null} typeA
 * @param {string|undefined|null} typeB
 * @returns {boolean}
 */
export function miscSlotTypesConnect(typeA, typeB) {
  const a = typeA == null ? "" : String(typeA)
  const b = typeB == null ? "" : String(typeB)
  if (!a || !b) {
    return true
  }
  if (a === b) {
    return true
  }
  if (a === WILDCARD_TYPE || b === WILDCARD_TYPE) {
    return true
  }
  if (isPrimitivesLinkType(a) && b === WILDCARD_TYPE) {
    return true
  }
  if (isPrimitivesLinkType(b) && a === WILDCARD_TYPE) {
    return true
  }
  return false
}
