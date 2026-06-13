import {
  IoDirection,
  isGenericPrimitiveUnionType,
  MISC_PRIMITIVE_SLOT_TYPES_KEY,
  PRIMITIVE_SLOT_TYPE,
} from "./constants.js"
import { followConnectionUntilType, isConcretePrimitiveSlotType } from "./connection-type.js"

function serializePrimitiveSlotType(type) {
  if (Array.isArray(type)) {
    return { kind: "COMBO", options: type }
  }
  return { kind: "SCALAR", value: String(type) }
}

function deserializePrimitiveSlotType(data) {
  if (!data || typeof data !== "object") {
    return PRIMITIVE_SLOT_TYPE
  }
  if (data.kind === "COMBO" && Array.isArray(data.options)) {
    return data.options
  }
  if (data.kind === "SCALAR" && data.value != null) {
    return data.value
  }
  return PRIMITIVE_SLOT_TYPE
}

export function getStoredPrimitiveSlotTypes(combineNode) {
  const raw = combineNode?.properties?.[MISC_PRIMITIVE_SLOT_TYPES_KEY]
  if (!raw) {
    return null
  }
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
    if (!Array.isArray(parsed)) {
      return null
    }
    return parsed.map((entry) => ({
      name: entry.name,
      type: deserializePrimitiveSlotType(entry.type),
    }))
  } catch {
    return null
  }
}

export function storePrimitiveSlotTypes(combineNode, slots) {
  combineNode.properties = combineNode.properties ?? {}
  combineNode.properties[MISC_PRIMITIVE_SLOT_TYPES_KEY] = JSON.stringify(
    slots.map((slot) => ({
      name: slot.name,
      type: serializePrimitiveSlotType(slot.type),
    })),
  )
}

export function isNumericPrimitiveType(type) {
  if (Array.isArray(type)) {
    return false
  }
  const text = String(type)
  return text === "INT" || text === "FLOAT" || text === "FLOAT,INT" || text === "INT,FLOAT"
}

export function primitiveSlotTypesEqual(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i])
  }
  return a === b
}

export function primitiveTypesCompatible(fromType, toType) {
  if (primitiveSlotTypesEqual(fromType, toType)) {
    return true
  }
  if (isGenericPrimitiveUnionType(fromType) || isGenericPrimitiveUnionType(toType)) {
    return true
  }
  if (Array.isArray(fromType) && Array.isArray(toType)) {
    return false
  }
  if (Array.isArray(fromType) || Array.isArray(toType)) {
    return false
  }
  const a = String(fromType)
  const b = String(toType)
  if (a === b) {
    return true
  }
  const toParts = (text) => new Set(text.split(",").map((part) => part.trim()))
  const partsA = toParts(a)
  const partsB = toParts(b)
  if (partsA.size > 1 && partsB.size > 1) {
    return [...partsA].some((part) => partsB.has(part))
  }
  if (partsA.size > 1) {
    return partsA.has(b)
  }
  if (partsB.size > 1) {
    return partsB.has(a)
  }
  if (isNumericPrimitiveType(a) && isNumericPrimitiveType(b)) {
    return true
  }
  return false
}

export function reconcilePrimitiveSlotType(existing, resolved) {
  if (resolved == null) {
    return existing ?? PRIMITIVE_SLOT_TYPE
  }
  if (existing == null || isGenericPrimitiveUnionType(existing)) {
    return resolved
  }
  if (isGenericPrimitiveUnionType(resolved)) {
    return existing
  }
  if (primitiveSlotTypesEqual(existing, resolved)) {
    return existing
  }
  if (isNumericPrimitiveType(existing) && isNumericPrimitiveType(resolved)) {
    if (existing === "FLOAT" || resolved === "FLOAT") {
      return "FLOAT"
    }
    return existing
  }
  if (primitiveTypesCompatible(existing, resolved)) {
    return existing
  }
  return resolved
}

/**
 * 接続・保存・スロット型から実効プリミティブ型を決める（接続を最優先）。
 * Combine の入力ソケットは別途 PRIMITIVE_SLOT_TYPE のままにし、保存/Split 同期に使う。
 *
 * @param {{ connectionType?: string|Array, storedType?: string|Array, slotType?: string|Array }} params
 */
export function pickResolvedPrimitiveSlotType({ connectionType, storedType, slotType }) {
  if (isConcretePrimitiveSlotType(connectionType)) {
    return connectionType
  }
  if (isConcretePrimitiveSlotType(storedType)) {
    return storedType
  }
  if (isConcretePrimitiveSlotType(slotType)) {
    return slotType
  }
  return PRIMITIVE_SLOT_TYPE
}

export function resolvePrimitiveSlotType(node, slotIndex, input) {
  const slot = input ?? node.inputs?.[slotIndex]
  const storedEntry = getStoredPrimitiveSlotTypes(node)?.find((entry) => entry.name === slot?.name)
  const resolved = followConnectionUntilType(node, IoDirection.INPUT, slotIndex, true)
  return pickResolvedPrimitiveSlotType({
    connectionType: resolved?.type,
    storedType: storedEntry?.type,
    slotType: slot?.type,
  })
}
