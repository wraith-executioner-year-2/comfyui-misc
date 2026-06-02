export const IoDirection = {
    INPUT: 0,
    OUTPUT: 1,
};

export const INDEX_OUTPUT_NAME = "index";
export const LENGTH_OUTPUT_NAME = "length";

export const PRIMITIVE_SLOT_TYPE = "INT,FLOAT,STRING,BOOLEAN,COMBO";

const GENERIC_PRIMITIVE_UNIONS = new Set([
    PRIMITIVE_SLOT_TYPE,
    "STRING,FLOAT,INT,BOOLEAN",
    "FLOAT,INT",
]);

export const PRIMITIVE_TYPE_NAMES = new Set(["INT", "FLOAT", "STRING", "BOOLEAN", "COMBO", "BOOL"]);

/** Combine ``combined`` 出力 / Split ``combined`` 入力のリンク型（Python ``CombinedPrimitivesType`` と一致） */
export const PRIMITIVES_TYPE = "PRIMITIVES";

/** 旧ワークフロー・誤設定時の互換エイリアス */
export const PRIMITIVES_TYPE_ALIASES = new Set([
    PRIMITIVES_TYPE,
    "combined",
    "COMBINED_PRIMITIVES",
]);

export function isPrimitivesLinkType(type) {
    return type != null && PRIMITIVES_TYPE_ALIASES.has(String(type));
}

/** @deprecated PRIMITIVES_TYPE を使用 */
export const COMBINED_PRIMITIVES_TYPE = PRIMITIVES_TYPE;

export const COMBINE_PRIMITIVES_NODE_CLASS = "Combine Primitives (misc)";
export const SPLIT_PRIMITIVES_NODE_CLASS = "Split Primitives (misc)";

export const MISC_PRIMITIVE_SLOT_TYPES_KEY = "miscPrimitiveSlotTypes";

const RELAY_NODE_CLASSES = new Set(["Any Switch (misc)", "Any Output Switch (misc)"]);

export function isRelayNodeClass(className) {
    return RELAY_NODE_CLASSES.has(className);
}

export function isGenericPrimitiveUnionType(type) {
    if (type == null) {
        return true;
    }
    if (Array.isArray(type)) {
        return false;
    }
    if (typeof type !== "string") {
        return false;
    }
    const normalized = type.replace(/\s/g, "");
    if (GENERIC_PRIMITIVE_UNIONS.has(normalized)) {
        return true;
    }
    const parts = normalized.split(",");
    return parts.length > 1 && parts.every((p) => PRIMITIVE_TYPE_NAMES.has(p));
}
