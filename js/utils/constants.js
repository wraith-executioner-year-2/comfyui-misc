export const IoDirection = {
  INPUT: 0,
  OUTPUT: 1,
}

export const INDEX_OUTPUT_NAME = "index"
export const LENGTH_OUTPUT_NAME = "length"

export const PRIMITIVE_SLOT_TYPE = "INT,FLOAT,STRING,BOOLEAN,COMBO"

const GENERIC_PRIMITIVE_UNIONS = new Set([PRIMITIVE_SLOT_TYPE, "STRING,FLOAT,INT,BOOLEAN", "FLOAT,INT"])

export const PRIMITIVE_TYPE_NAMES = new Set(["INT", "FLOAT", "STRING", "BOOLEAN", "COMBO", "BOOL"])

/** Combine ``combined`` 出力 / Split ``combined`` 入力のリンク型（Python ``CombinedPrimitivesType`` と一致） */
export const PRIMITIVES_TYPE = "PRIMITIVES"

/** 旧ワークフロー・誤設定時の互換エイリアス */
export const PRIMITIVES_TYPE_ALIASES = new Set([PRIMITIVES_TYPE, "combined", "COMBINED_PRIMITIVES"])

export function isPrimitivesLinkType(type) {
  return type != null && PRIMITIVES_TYPE_ALIASES.has(String(type))
}

/** キャンバス上のソケット表示名（内部リンク型 PRIMITIVES と対） */
export const PRIMITIVES_DISPLAY_LABEL = "combined"

/**
 * リンク型に対応するソケット表示ラベル。PRIMITIVES 系は ``combined`` に統一。
 *
 * @param {string|Array|undefined|null} type
 * @returns {string|null} 上書きラベル。不要なら null
 */
export function slotLabelForLinkType(type) {
  if (isPrimitivesLinkType(type)) {
    return PRIMITIVES_DISPLAY_LABEL
  }
  return null
}

/**
 * combined / PRIMITIVES リンク用ソケットの type と表示ラベルを揃える。
 *
 * @param {object|undefined|null} slot
 * @param {string} [type=PRIMITIVES_TYPE]
 */
export function syncPrimitivesLinkSlot(slot, type = PRIMITIVES_TYPE) {
  if (!slot) {
    return
  }
  slot.type = type
  const label = slotLabelForLinkType(type)
  if (label) {
    slot.label = label
  }
}

/** 任意型ソケットの type / label を常に ``*`` に固定する。 */
export function pinWildcardSlot(slot) {
  if (!slot) {
    return
  }
  slot.type = "*"
  slot.label = "*"
}

/** @deprecated PRIMITIVES_TYPE を使用 */
export const COMBINED_PRIMITIVES_TYPE = PRIMITIVES_TYPE

export const COMBINE_PRIMITIVES_NODE_CLASS = "Combine Primitives (misc)"
export const SPLIT_PRIMITIVES_NODE_CLASS = "Split Primitives (misc)"
export const FOREACH_NODE_CLASS = "ForEach (misc)"
export const END_FOREACH_NODE_CLASS = "End ForEach (misc)"

export const MISC_PRIMITIVE_SLOT_TYPES_KEY = "miscPrimitiveSlotTypes"

const RELAY_NODE_CLASSES = new Set(["Any Switch (misc)", "Any Output Switch (misc)"])

export function isRelayNodeClass(className) {
  return RELAY_NODE_CLASSES.has(className)
}

export function isGenericPrimitiveUnionType(type) {
  if (type == null) {
    return true
  }
  if (Array.isArray(type)) {
    return false
  }
  if (typeof type !== "string") {
    return false
  }
  const normalized = type.replace(/\s/g, "")
  if (GENERIC_PRIMITIVE_UNIONS.has(normalized)) {
    return true
  }
  const parts = normalized.split(",")
  return parts.length > 1 && parts.every((p) => PRIMITIVE_TYPE_NAMES.has(p))
}
