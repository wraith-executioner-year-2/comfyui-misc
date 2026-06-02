/**
 * Combine Primitives (misc) — フロントエンド拡張
 *
 * primitive_01 … の可変入力を持ち、combined / length を出力します。
 * Primitive 型以外は接続できません。
 */

import { app } from "../../scripts/app.js";
import {
    PRIMITIVES_TYPE,
    COMBINE_PRIMITIVES_NODE_CLASS,
    PRIMITIVE_SLOT_TYPE,
    MISC_PRIMITIVE_SLOT_TYPES_KEY,
    SPLIT_PRIMITIVES_NODE_CLASS,
    addPrimitiveInputs,
    debounce,
    notifyDownstreamSplitNodes,
    removeUnusedInputsFromEnd,
    resolvePrimitiveSlotType,
    storePrimitiveSlotTypes,
} from "./utils.js";

const NODE_CLASS = COMBINE_PRIMITIVES_NODE_CLASS;
const SPLIT_NODE_CLASS = SPLIT_PRIMITIVES_NODE_CLASS;
const MIN_PRIMITIVE_INPUTS = 1;
const PRIMITIVE_NAME_RE = /^primitive_/;

const DEFAULT_PRIMITIVE_INPUTS = Object.fromEntries(
    Array.from({ length: MIN_PRIMITIVE_INPUTS }, (_, i) => [
        `primitive_${String(i + 1).padStart(2, "0")}`,
        [PRIMITIVE_SLOT_TYPE],
    ]),
);

/**
 * @param {Function} nodeType
 */
function setupCombinePrimitives(nodeType) {
    const onNodeCreated = nodeType.prototype.onNodeCreated;
    const onConnectionsChange = nodeType.prototype.onConnectionsChange;
    const onConfigure = nodeType.prototype.onConfigure;

    nodeType.prototype.onNodeCreated = function () {
        const result = onNodeCreated?.apply(this, arguments);
        this.stabilizeBound = this.stabilize.bind(this);
        if (!this.inputs.some((inp) => PRIMITIVE_NAME_RE.test(inp.name ?? ""))) {
            addPrimitiveInputs(this, MIN_PRIMITIVE_INPUTS);
        }
        return result;
    };

    nodeType.prototype.onConfigure = function () {
        const result = onConfigure?.apply(this, arguments);
        this.scheduleStabilize();
        return result;
    };

    nodeType.prototype.onConnectionsChange = function (type, slotIndex, isConnected, linkInfo, ioSlot) {
        onConnectionsChange?.call(this, type, slotIndex, isConnected, linkInfo, ioSlot);
        this.scheduleStabilize();
    };

    nodeType.prototype.onConnectionsChainChange = function () {
        this.scheduleStabilize();
    };

    nodeType.prototype.scheduleStabilize = function (ms = 64) {
        return debounce(this.stabilizeBound, ms);
    };

    nodeType.prototype.stabilize = function () {
        removeUnusedInputsFromEnd(this, Math.max(1, MIN_PRIMITIVE_INPUTS - 1), PRIMITIVE_NAME_RE);

        const lastInput = this.inputs[this.inputs.length - 1];
        if (lastInput?.link && PRIMITIVE_NAME_RE.test(lastInput.name ?? "")) {
            addPrimitiveInputs(this, 1);
        } else if (this.inputs.length < MIN_PRIMITIVE_INPUTS) {
            addPrimitiveInputs(this, MIN_PRIMITIVE_INPUTS - this.inputs.length);
        }

        const storedSlots = [];
        for (let i = 0; i < this.inputs.length; i++) {
            const input = this.inputs[i];
            if (!PRIMITIVE_NAME_RE.test(input.name ?? "")) {
                continue;
            }
            // ソケットは汎用型のまま（先に接続した INT 等で固定され他型が刺さらなくなるのを防ぐ）
            input.type = PRIMITIVE_SLOT_TYPE;
            if (input.link) {
                const resolvedType = resolvePrimitiveSlotType(this, i, input);
                storedSlots.push({ name: input.name, type: resolvedType });
            }
        }
        if (storedSlots.length > 0) {
            storePrimitiveSlotTypes(this, storedSlots);
        } else if (this.properties?.[MISC_PRIMITIVE_SLOT_TYPES_KEY] != null) {
            delete this.properties[MISC_PRIMITIVE_SLOT_TYPES_KEY];
        }

        const combinedOut = this.outputs.find((o) => o.name === "combined");
        if (combinedOut) {
            combinedOut.type = PRIMITIVES_TYPE;
        }

        notifyDownstreamSplitNodes(this, SPLIT_NODE_CLASS);
    };
}

app.registerExtension({
    name: "comfyui-misc.CombinePrimitives",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_CLASS) {
            return;
        }

        nodeData.input = nodeData.input ?? {};
        nodeData.input.required = nodeData.input.required ?? {};
        nodeData.input.optional = {
            ...DEFAULT_PRIMITIVE_INPUTS,
            ...(nodeData.input.optional ?? {}),
        };
        nodeData.output = [PRIMITIVES_TYPE, "INT"];
        nodeData.output_name = ["combined", "length"];

        setupCombinePrimitives(nodeType);
    },
});
