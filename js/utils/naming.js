import { isGenericPrimitiveUnionType, isPrimitivesLinkType, PRIMITIVES_DISPLAY_LABEL } from "./constants.js";

export function getDataOutputNamePrefix(nodeType) {
  if (!nodeType || nodeType === "*") {
    return "any";
  }
  if (isPrimitivesLinkType(nodeType)) {
    return PRIMITIVES_DISPLAY_LABEL;
  }
  if (nodeType === "RGTHREE_CONTEXT") {
    return "CONTEXT";
  }
  const text = String(nodeType);
  if (text.includes(",")) {
    return "any";
  }
  return text;
}

export function formatDataOutputName(prefix, oneBasedIndex) {
  return `${prefix}_${String(oneBasedIndex).padStart(2, "0")}`;
}

export function formatPrimitiveOutputLabel(type, fallbackName = "") {
  if (Array.isArray(type)) {
    return "COMBO";
  }
  if (isPrimitivesLinkType(type)) {
    return PRIMITIVES_DISPLAY_LABEL;
  }
  if (typeof type === "string" && !isGenericPrimitiveUnionType(type)) {
    if (type.includes(",")) {
      return "COMBO";
    }
    return type;
  }
  return fallbackName || "primitive";
}
