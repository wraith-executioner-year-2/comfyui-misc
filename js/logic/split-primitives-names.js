/**
 * Split Primitives (misc) — 出力名の型ベース命名（ComfyUI 非依存）。
 */

/**
 * @param {string|Array} type
 * @returns {string}
 */
export function typeNameForPrimitiveSlotType(type) {
  if (Array.isArray(type)) {
    return "COMBO";
  }
  const text = String(type ?? "").trim();
  if (text === "INT" || text === "FLOAT" || text === "STRING" || text === "BOOLEAN" || text === "COMBO") {
    return text;
  }
  return "PRIMITIVE";
}

/**
 * @param {string|Array} type
 * @param {number} index0 - 0 始まり
 * @returns {string}
 */
export function formatTypedOutputName(type, index0) {
  const typeName = typeNameForPrimitiveSlotType(type);
  return `${typeName}_${String(index0 + 1).padStart(2, "0")}`;
}

/**
 * Combine 入力から接続済み primitive_* の desired スロットを列挙（名前は primitive_XX のまま）。
 *
 * @param {Array<{ name?: string, link?: unknown, type?: string }>} inputs
 * @returns {Array<{ name: string, type: string }>}
 */
export function listLinkedPrimitiveInputs(inputs) {
  const desired = [];
  for (const inp of inputs ?? []) {
    if (!inp?.name?.startsWith("primitive_")) {
      continue;
    }
    if (!inp.link) {
      continue;
    }
    desired.push({
      name: inp.name,
      type: inp.type ?? "INT,FLOAT,STRING,BOOLEAN,COMBO"
    });
  }
  return desired;
}

/**
 * @param {Array<{ name: string, type: string }>|null} stored
 * @param {Array<{ name: string, type: string }>} linked
 * @returns {Array<{ name: string, type: string }>}
 */
export function resolveDesiredPrimitiveSlots(stored, linked) {
  // 実際に刺さっている入力（linked）を優先。stored だけだと未接続スロットが混ざることがある
  if (linked.length > 0) {
    return linked.map((s) => ({ name: s.name, type: s.type }));
  }
  if (stored?.length) {
    return stored.map((s) => ({ name: s.name, type: s.type }));
  }
  return [{ name: "primitive_01", type: "INT,FLOAT,STRING,BOOLEAN,COMBO" }];
}

/**
 * 復元中に Combine が未確定でも combined リンクとキャッシュがあればキャッシュを使う。
 *
 * @param {object} params
 * @param {boolean} params.restoring
 * @param {object|null} params.combineNode
 * @param {boolean} params.hasCombinedLink
 * @param {Array<{ name: string, type: string }>|null} params.cachedDesired
 * @param {Array<{ name: string, type: string }>} params.linked
 * @param {Array<{ name: string, type: string }>|null} params.stored
 */
export function pickDesiredDuringSync({
  restoring,
  combineNode,
  hasCombinedLink,
  cachedDesired,
  linked,
  stored
}) {
  if (!combineNode && hasCombinedLink && restoring && cachedDesired?.length) {
    return cachedDesired;
  }
  if (combineNode) {
    return resolveDesiredPrimitiveSlots(stored, linked);
  }
  return [{ name: "primitive_01", type: "INT,FLOAT,STRING,BOOLEAN,COMBO" }];
}
