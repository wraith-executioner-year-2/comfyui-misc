/**
 * Split Primitives (misc) — フロントエンド拡張
 *
 * Combine Primitives の combined のみを入力とし、
 * 接続先 Combine の primitive_* 接続状況に合わせて出力を同期します。
 */

import { app } from "../../scripts/app.js";
import {
    PRIMITIVES_TYPE,
    COMBINE_PRIMITIVES_NODE_CLASS,
    IoDirection,
    PRIMITIVE_SLOT_TYPE,
    SPLIT_PRIMITIVES_NODE_CLASS,
    debounce,
    findLinkedCombineNode,
    countPrimitiveDataOutputs,
    getSplitDesiredOutputSlots,
    isPrimitiveRelayNode,
    propagatePrimitiveSplitSync,
    syncSplitOutputsFromCombine,
} from "./utils.js";

const NODE_CLASS = SPLIT_PRIMITIVES_NODE_CLASS;
const COMBINE_NODE_CLASS = COMBINE_PRIMITIVES_NODE_CLASS;

const RELAY_PATCH_KEY = "__miscPrimitiveRelayPatch";

/**
 * Reroute 等、個別拡張を持たないリレーノードの配線変更を Split へ伝播する。
 */
function patchRelayNodeConnectionCallbacks() {
    if (LGraphNode.prototype[RELAY_PATCH_KEY]) {
        return;
    }
    LGraphNode.prototype[RELAY_PATCH_KEY] = true;

    const origChange = LGraphNode.prototype.onConnectionsChange;
    LGraphNode.prototype.onConnectionsChange = function (...args) {
        const ret = origChange?.apply(this, args);
        if (isPrimitiveRelayNode(this)) {
            propagatePrimitiveSplitSync(this);
        }
        return ret;
    };

    const origChain = LGraphNode.prototype.onConnectionsChainChange;
    if (origChain) {
        LGraphNode.prototype.onConnectionsChainChange = function (...args) {
            const ret = origChain.apply(this, args);
            if (isPrimitiveRelayNode(this)) {
                propagatePrimitiveSplitSync(this);
            }
            return ret;
        };
    }
}

/**
 * @param {Function} nodeType
 */
function setupSplitPrimitives(nodeType) {
    const onNodeCreated = nodeType.prototype.onNodeCreated;
    const onConnectionsChange = nodeType.prototype.onConnectionsChange;
    const onConfigure = nodeType.prototype.onConfigure;

    nodeType.prototype.onNodeCreated = function () {
        const result = onNodeCreated?.apply(this, arguments);
        this.stabilizeBound = this.stabilize.bind(this);
        this._miscSplitGraphReady = false;
        if (this.inputs[0]) {
            this.inputs[0].type = PRIMITIVES_TYPE;
        }
        return result;
    };

    nodeType.prototype.onConfigure = function () {
        const result = onConfigure?.apply(this, arguments);
        this._miscSplitGraphReady = true;
        // ワークフロー復元後にリンクが揃ってから同期する
        requestAnimationFrame(() => {
            requestAnimationFrame(() => this.scheduleStabilize(0));
        });
        return result;
    };

    nodeType.prototype.onConnectionsChange = function (type, slotIndex, isConnected, linkInfo, ioSlot) {
        onConnectionsChange?.call(this, type, slotIndex, isConnected, linkInfo, ioSlot);
        // 出力側の接続変更で stabilize すると removeOutput により即切断される
        if (ioSlot && this.outputs?.includes(ioSlot)) {
            return;
        }
        if (type === IoDirection.OUTPUT) {
            return;
        }
        this.scheduleStabilize();
    };

    nodeType.prototype.onConnectionsChainChange = function () {
        if (!this._miscSplitGraphReady) {
            return;
        }
        this.scheduleStabilize();
    };

    nodeType.prototype.scheduleStabilize = function (ms = 64) {
        return debounce(this.stabilizeBound, ms);
    };

    nodeType.prototype.stabilize = function () {
        if (this.inputs[0]) {
            this.inputs[0].type = PRIMITIVES_TYPE;
        }

        const combineNode = findLinkedCombineNode(this, COMBINE_NODE_CLASS);
        const connected = combineNode ? getSplitDesiredOutputSlots(combineNode, this) : [];
        const hasExistingOutputs = countPrimitiveDataOutputs(this) > 0;

        syncSplitOutputsFromCombine(this, connected, {
            preserveExisting:
                !combineNode || (connected.length === 0 && hasExistingOutputs),
        });
    };
}

app.registerExtension({
    name: "comfyui-misc.SplitPrimitives",
    init() {
        patchRelayNodeConnectionCallbacks();
    },
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_CLASS) {
            return;
        }

        nodeData.input = nodeData.input ?? {};
        nodeData.input.required = {
            combined: [PRIMITIVES_TYPE],
            ...(nodeData.input.required ?? {}),
        };
        nodeData.output = [PRIMITIVE_SLOT_TYPE, "INT"];
        nodeData.output_name = ["primitive_01", "length"];

        setupSplitPrimitives(nodeType);
    },
});
