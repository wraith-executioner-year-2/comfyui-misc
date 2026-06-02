/**
 * comfyui-misc フロントエンド共通ユーティリティ
 *
 * 機能ごとに分割したモジュールをここから再エクスポートします。
 * 既存コードは ``./utils.js`` 経由でも同じ API を利用できます。
 */

export { debounce } from "./debounce.js";
export { getNodeGraph } from "./graph-context.js";
export { getGraphLink } from "./graph-links.js";

export {
    IoDirection,
    INDEX_OUTPUT_NAME,
    LENGTH_OUTPUT_NAME,
    PRIMITIVE_SLOT_TYPE,
    PRIMITIVES_TYPE,
    COMBINED_PRIMITIVES_TYPE,
    COMBINE_PRIMITIVES_NODE_CLASS,
    SPLIT_PRIMITIVES_NODE_CLASS,
    MISC_PRIMITIVE_SLOT_TYPES_KEY,
    isGenericPrimitiveUnionType,
} from "./constants.js";

export { getSlotLinks, followConnectionUntilType, isConcretePrimitiveSlotType } from "./connection-type.js";
export { removeUnusedInputsFromEnd } from "./inputs.js";
export {
    getDataOutputNamePrefix,
    formatDataOutputName,
    formatPrimitiveOutputLabel,
} from "./naming.js";

export {
    isIndexOutputSlot,
    countDataOutputs,
    ensureIndexOutput,
    getIndexOutputSlotIndex,
    renumberDataOutputs,
    ensureMinimumDataOutputs,
    removeUnusedDataOutputsFromEnd,
    addDataOutputBeforeIndex,
    addAnyOutputBeforeIndex,
    renumberAnyOutputs,
    removeUnusedAnyOutputsFromEnd,
} from "./any-output-slots.js";

export {
    isLengthOutputSlot,
    countPrimitiveDataOutputs,
    ensureLengthOutput,
    addPrimitiveInputs,
} from "./primitive-slots.js";

export {
    getStoredPrimitiveSlotTypes,
    storePrimitiveSlotTypes,
    isNumericPrimitiveType,
    primitiveSlotTypesEqual,
    primitiveTypesCompatible,
    reconcilePrimitiveSlotType,
    resolvePrimitiveSlotType,
} from "./primitive-type.js";

export {
    getNodeClassName,
    isNodeClass,
    isPrimitiveRelayNode,
    findDownstreamSplitNodes,
    notifyDownstreamSplitNodes,
    propagatePrimitiveSplitSync,
    findLinkedCombineNode,
} from "./graph-walk.js";

export {
    SELECT_INDEX_KEY,
    SELECT_INDEX_DEFAULT,
    countAnySwitchInputs,
    syncSelectIndexWidget,
} from "./select-index.js";
