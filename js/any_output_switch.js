/**
 * Any Output Switch (misc) — フロントエンド拡張
 *
 * 入力1本から、LATENT_01 / any_01 などの可変出力へ配線します。
 * 最後尾は常に index（INT）で、Python が選んだ出力番号を受け取れます。
 */

import { app } from "../../scripts/app.js";
import {
    INDEX_OUTPUT_NAME,
    IoDirection,
    SELECT_INDEX_DEFAULT,
    SELECT_INDEX_KEY,
    addDataOutputBeforeIndex,
    countDataOutputs,
    debounce,
    ensureIndexOutput,
    ensureMinimumDataOutputs,
    followConnectionUntilType,
    getDataOutputNamePrefix,
    getIndexOutputSlotIndex,
    isPrimitivesLinkType,
    slotLabelForLinkType,
    syncPrimitivesLinkSlot,
    propagatePrimitiveSplitSync,
    removeUnusedDataOutputsFromEnd,
    renumberDataOutputs,
    syncSelectIndexWidget,
} from "./utils.js";

/** Python の get_name("Any Output Switch") と同じ文字列 */
const NODE_CLASS = "Any Output Switch (misc)";

/** 常に表示するデータ出力の最小本数（any_01 の1本 + index） */
const MIN_DATA_OUTPUTS = 1;

/**
 * @param {object} node
 * @returns {object|undefined}
 */
function getMainInput(node) {
    return node.inputs?.find((inp) => inp.name === "input");
}

/**
 * @param {object} node
 * @returns {string}
 */
function resolveNodeType(node) {
    const mainInput = getMainInput(node);
    const mainIndex = mainInput ? node.inputs.indexOf(mainInput) : 0;

    // まず input 側の実配線型を見て、未確定なら出力側の配線から逆算する。
    let connectedType = followConnectionUntilType(node, IoDirection.INPUT, mainIndex, true);
    if (!connectedType?.type || connectedType.type === "*") {
        for (let i = 0; i < countDataOutputs(node); i++) {
            connectedType = followConnectionUntilType(node, IoDirection.OUTPUT, i, true);
            if (connectedType?.type && connectedType.type !== "*") {
                break;
            }
        }
    }
    return connectedType?.type || "*";
}

/**
 * @param {Function} nodeType
 */
function setupMiscAnyOutputSwitch(nodeType) {
    const onNodeCreated = nodeType.prototype.onNodeCreated;
    const onConnectionsChange = nodeType.prototype.onConnectionsChange;
    const onConfigure = nodeType.prototype.onConfigure;

    nodeType.prototype.serialize_widgets = true;

    nodeType.prototype.onNodeCreated = function () {
        const result = onNodeCreated?.apply(this, arguments);
        this.stabilizeBound = this.stabilize.bind(this);
        this.nodeType = "*";
        this.properties = this.properties ?? {};
        if (this.properties.select_index == null) {
            this.properties.select_index = SELECT_INDEX_DEFAULT;
        }

        const prefix = getDataOutputNamePrefix(this.nodeType);
        ensureMinimumDataOutputs(this, MIN_DATA_OUTPUTS, prefix, this.nodeType);
        this.stabilize();
        return result;
    };

    nodeType.prototype.onConfigure = function () {
        const result = onConfigure?.apply(this, arguments);
        requestAnimationFrame(() => this.scheduleStabilize(0));
        return result;
    };

    nodeType.prototype.onConnectionsChange = function (type, slotIndex, isConnected, linkInfo, ioSlot) {
        onConnectionsChange?.call(this, type, slotIndex, isConnected, linkInfo, ioSlot);
        if (app.configuringGraph) {
            return;
        }
        this.scheduleStabilize();
    };

    nodeType.prototype.onConnectionsChainChange = function () {
        if (app.configuringGraph) {
            return;
        }
        this.scheduleStabilize();
    };

    nodeType.prototype.scheduleStabilize = function (ms = 64) {
        return debounce(this.stabilizeBound, ms);
    };

    nodeType.prototype.stabilize = function () {
        if (this.removed) {
            return;
        }

        this.nodeType = resolveNodeType(this);
        const prefix = getDataOutputNamePrefix(this.nodeType);

        const mainInput = getMainInput(this);
        if (mainInput && isPrimitivesLinkType(this.nodeType)) {
            syncPrimitivesLinkSlot(mainInput, this.nodeType);
        } else if (mainInput) {
            mainInput.type = this.nodeType;
        }

        for (const input of this.inputs ?? []) {
            if (input.name === SELECT_INDEX_KEY) {
                input.type = "INT";
            }
        }

        ensureIndexOutput(this);
        removeUnusedDataOutputsFromEnd(this, MIN_DATA_OUTPUTS, prefix);
        ensureMinimumDataOutputs(this, MIN_DATA_OUTPUTS, prefix, this.nodeType);

        // 最後のデータ出力が使用中なら 1 本増やして常に「次の差し込み口」を確保する。
        const lastDataPos = countDataOutputs(this) - 1;
        if (lastDataPos >= 0 && this.outputs[lastDataPos]?.links?.length) {
            addDataOutputBeforeIndex(this, 1, prefix, this.nodeType);
        }

        renumberDataOutputs(this, prefix);

        const dataCount = countDataOutputs(this);
        const primitivesLabel = slotLabelForLinkType(this.nodeType);
        for (let i = 0; i < dataCount; i++) {
            const output = this.outputs[i];
            output.type = this.nodeType;
            output.label = primitivesLabel ?? output.name;
        }

        const indexPos = getIndexOutputSlotIndex(this);
        const indexOutput = this.outputs[indexPos];
        indexOutput.type = "INT";
        indexOutput.name = INDEX_OUTPUT_NAME;
        indexOutput.label = INDEX_OUTPUT_NAME;

        // any_* 出力は末尾に空スロットを1本維持するため、
        // select_index の最大値は (データ出力数 - 2) にする。
        syncSelectIndexWidget(this, (node) => countDataOutputs(node) - 2);
        propagatePrimitiveSplitSync(this);
        this.graph?.setDirtyCanvas?.(true, false);
    };
}

app.registerExtension({
    name: "comfyui-misc.AnyOutputSwitch",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_CLASS) {
            return;
        }

        // 出力を2個固定（*, INT）にすると可変出力と index が壊れるため、データ出力は1個だけ定義する
        nodeData.input = nodeData.input ?? {};
        nodeData.input.required = {
            input: ["*"],
            select_index: ["INT", { default: -1, min: -1, max: 4096 }],
            ...(nodeData.input.required ?? {}),
        };
        nodeData.output = ["*"];
        nodeData.output_is_list = [false];
        nodeData.output_name = ["any_01"];

        setupMiscAnyOutputSwitch(nodeType);
    },
});
