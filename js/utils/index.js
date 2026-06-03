/** comfyui-misc フロントエンド共通（``./utils.js`` からも再エクスポート） */

export { debounce } from "./debounce.js";
export { attachStabilizeHooks } from "./node-stabilize.js";
export { scheduleStabilizeRetries } from "./stabilize-retries.js";
export { normalizeOutputSlotLayout, syncNodeSizeToContent } from "./node-layout.js";
export { getNodeGraph } from "./graph-context.js";
export { forEachGraphLink, getGraphLink } from "./graph-links.js";

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
  isPrimitivesLinkType,
  PRIMITIVES_DISPLAY_LABEL,
  slotLabelForLinkType,
  syncPrimitivesLinkSlot,
  pinWildcardSlot
} from "./constants.js";

export { getSlotLinks, followConnectionUntilType, isConcretePrimitiveSlotType } from "./connection-type.js";
export { removeUnusedInputsFromEnd } from "./inputs.js";
export { getDataOutputNamePrefix, formatDataOutputName, formatPrimitiveOutputLabel } from "./naming.js";

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
  removeUnusedAnyOutputsFromEnd
} from "./any-output-slots.js";

export {
  isLengthOutputSlot,
  countPrimitiveDataOutputs,
  ensureLengthOutput,
  addPrimitiveInputs
} from "./primitive-slots.js";

export {
  getStoredPrimitiveSlotTypes,
  storePrimitiveSlotTypes,
  isNumericPrimitiveType,
  primitiveSlotTypesEqual,
  primitiveTypesCompatible,
  reconcilePrimitiveSlotType,
  resolvePrimitiveSlotType
} from "./primitive-type.js";

export {
  getNodeClassName,
  isNodeClass,
  isPrimitiveRelayNode,
  findDownstreamSplitNodes,
  notifyDownstreamSplitNodes,
  propagatePrimitiveSplitSync,
  findLinkedCombineNode
} from "./graph-walk.js";

export {
  SELECT_INDEX_KEY,
  SELECT_INDEX_DEFAULT,
  countAnySwitchInputs,
  syncSelectIndexWidget
} from "./select-index.js";
