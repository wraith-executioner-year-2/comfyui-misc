/**
 * Split Primitives (misc) — Combine の primitive_* 構成を出力へ同期する。
 * 復元・コピペ直後は disconnect / removeOutput を抑え、リンク復元揺れを吸収する。
 */

import { app } from "../../scripts/app.js";
import {
    syncPrimitivesLinkSlot,
    COMBINE_PRIMITIVES_NODE_CLASS,
    IoDirection,
    PRIMITIVE_SLOT_TYPE,
    SPLIT_PRIMITIVES_NODE_CLASS,
    LENGTH_OUTPUT_NAME,
    debounce,
    findLinkedCombineNode,
    isPrimitiveRelayNode,
    propagatePrimitiveSplitSync,
    getStoredPrimitiveSlotTypes,
    resolvePrimitiveSlotType,
    reconcilePrimitiveSlotType,
} from "./utils.js";

import { createTrailingOutputHelpers } from "./utils/trailing-output.js";
import {
    formatTypedOutputName,
    typeNameForPrimitiveSlotType,
    listLinkedPrimitiveInputs,
    pickDesiredDuringSync,
    resolveDesiredPrimitiveSlots,
} from "./logic/split-primitives-names.js";

const NODE_CLASS = SPLIT_PRIMITIVES_NODE_CLASS;
const COMBINE_NODE_CLASS = COMBINE_PRIMITIVES_NODE_CLASS;

const RELAY_PATCH_KEY = "__miscPrimitiveRelayPatch";

const lengthTrailing = createTrailingOutputHelpers(LENGTH_OUTPUT_NAME);
const countPrimitiveDataOutputs = lengthTrailing.countDataSlots;
const ensureLengthOutput = lengthTrailing.ensureMeta;
const isLengthOutputSlot = lengthTrailing.isMetaSlot;

// ワークフロー読込 / まとめてコピペ後の「リンク復元揺れ」を吸収する猶予
const RESTORE_WINDOW_MS = 2500;

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

function addPrimitiveOutputBeforeLength(node, name, type) {
    ensureLengthOutput(node);
    if (isLengthOutputSlot(node)) {
        const lengthSlot = node.outputs.pop();
        node.addOutput(name, type);
        node.outputs.push(lengthSlot);
    } else {
        node.addOutput(name, type);
        ensureLengthOutput(node);
    }
}

function collectExistingOutputSnapshot(splitNode) {
    const end = countPrimitiveDataOutputs(splitNode);
    const snapshot = [];
    for (let i = 0; i < end; i++) {
        const out = splitNode.outputs?.[i];
        if (!out?.name) {
            continue;
        }
        snapshot.push({ name: out.name, type: out.type });
    }
    return snapshot;
}

function ensurePrimitiveOutputsCount(splitNode, count, defaultType = PRIMITIVE_SLOT_TYPE) {
    ensureLengthOutput(splitNode);
    while (countPrimitiveDataOutputs(splitNode) < count) {
        const idx = countPrimitiveDataOutputs(splitNode);
        addPrimitiveOutputBeforeLength(splitNode, `primitive_${String(idx + 1).padStart(2, "0")}`, defaultType);
    }
}

function normalizeLengthOutput(splitNode) {
    const lengthOut = splitNode.outputs[splitNode.outputs.length - 1];
    if (!lengthOut) {
        return;
    }
    lengthOut.type = "INT";
    lengthOut.name = LENGTH_OUTPUT_NAME;
    lengthOut.label = LENGTH_OUTPUT_NAME;
}

/** 再描画（ExportWorkflowImage 等）で label だけ消えた場合に表示名を name に揃える */
function ensureSplitOutputLabels(splitNode) {
    const end = countPrimitiveDataOutputs(splitNode);
    for (let i = 0; i < end; i++) {
        const out = splitNode.outputs?.[i];
        if (!out?.name) {
            continue;
        }
        if (out.label !== out.name) {
            out.label = out.name;
        }
    }
    normalizeLengthOutput(splitNode);
}

function setGenericPrimitiveOutputs(splitNode) {
    const end = countPrimitiveDataOutputs(splitNode);
    for (let i = 0; i < end; i++) {
        const out = splitNode.outputs[i];
        if (!out?.name?.includes("_")) {
            continue;
        }
        out.type = PRIMITIVE_SLOT_TYPE;
        // 仕様③: 復元中でも表示名は INT_01 / FLOAT_02 などの名前を維持する
        out.label = out.name;
    }
}

function applySnapshotPlaceholders(splitNode, snapshot) {
    if (!snapshot?.length) {
        return;
    }
    // snapshot は data 出力の並びだけを想定（length は含めない）
    ensurePrimitiveOutputsCount(splitNode, snapshot.length, PRIMITIVE_SLOT_TYPE);
    for (let i = 0; i < snapshot.length; i++) {
        const out = splitNode.outputs?.[i];
        const snap = snapshot[i];
        if (!out || !snap) {
            continue;
        }
        out.name = snap.name;
        out.type = PRIMITIVE_SLOT_TYPE; // 復元中は互換型で受ける
        out.label = snap.name; // 画面表示は INT_01 などの名前を優先
    }
    normalizeLengthOutput(splitNode);
}

function listLinkedWithResolvedTypes(combineNode) {
    const linked = [];
    for (let i = 0; i < (combineNode.inputs ?? []).length; i++) {
        const inp = combineNode.inputs[i];
        if (!inp?.name?.startsWith("primitive_") || !inp.link) {
            continue;
        }
        linked.push({
            name: inp.name,
            type: resolvePrimitiveSlotType(combineNode, i, inp),
        });
    }
    return linked;
}

function syncSplitFromCombine(splitNode, combineNode) {
    ensureLengthOutput(splitNode);

    // 復元/コピペ直後の短時間は削除を抑止（コピー＆ペースト復元途中で既存ソケットが消える事故を防ぐ）
    const restoring = Date.now() < (splitNode._miscSplitRestoringUntil || 0);
    const combinedInput = splitNode.inputs?.find((inp) => inp.name === "combined");
    const hasCombinedLink = !!combinedInput?.link;

    // 復元中に Combine がまだ辿れない瞬間がある（リンク復元順の都合）。
    // その瞬間にフォールバック出力へ上書きすると、保存済みの INT,FLOAT が崩れるため、
    // restoring 中は Combine が見つかるまで「出力構成を保持」する（縮小・型変更・名前変更をしない）。
    if (restoring && !combineNode) {
        // 再接続が成立するよう primitive_* を汎用型にしつつ、表示名は保持する。
        setGenericPrimitiveOutputs(splitNode);
        normalizeLengthOutput(splitNode);
        return;
    }

    // Combine が辿れないが combined 入力は接続されている場合、復元キャッシュがあればそれを維持する
    // （コピペ復元中に primitive_02 が未生成で切断される問題を回避）
    const desired = pickDesiredDuringSync({
        restoring,
        combineNode,
        hasCombinedLink,
        cachedDesired: splitNode._miscSplitCachedDesired,
        linked: combineNode ? listLinkedWithResolvedTypes(combineNode) : [],
        stored: combineNode ? getStoredPrimitiveSlotTypes(combineNode) : null,
    });
    const desiredCount = desired.length;

    // 必要なら追加（縮小はしない/リンクがないときだけ）
    while (countPrimitiveDataOutputs(splitNode) < desiredCount) {
        const idx = countPrimitiveDataOutputs(splitNode);
        const slot = desired[idx];
        if (!slot) {
            break;
        }
        addPrimitiveOutputBeforeLength(splitNode, formatTypedOutputName(slot.type, idx), slot.type);
    }

    while (countPrimitiveDataOutputs(splitNode) > desiredCount) {
        const removeIndex = countPrimitiveDataOutputs(splitNode) - 1;
        const output = splitNode.outputs[removeIndex];

        if (restoring) {
            break;
        }
        if (output?.links?.length) {
            break;
        }
        splitNode.removeOutput(removeIndex);
    }

    // 名前・型・ラベルの同期
    for (let i = 0; i < desiredCount; i++) {
        const output = splitNode.outputs[i];
        if (!output) {
            break;
        }

        const want = desired[i];
        if (!want) {
            continue;
        }

        const typedName = formatTypedOutputName(want.type, i);
        if (output.name !== typedName) {
            output.name = typedName;
        }

        if (restoring) {
            output.type = PRIMITIVE_SLOT_TYPE;
        } else {
            output.type = reconcilePrimitiveSlotType(output.type, want.type);
        }

        // 仕様③: 表示名も INT_01 / FLOAT_02 のようにする
        output.label = output.name;
    }

    ensureSplitOutputLabels(splitNode);
}

/**
 * @param {Function} nodeType
 */
function setupSplitPrimitives(nodeType) {
    const onNodeCreated = nodeType.prototype.onNodeCreated;
    const onConnectionsChange = nodeType.prototype.onConnectionsChange;
    const onConfigure = nodeType.prototype.onConfigure;
    const onDrawForeground = nodeType.prototype.onDrawForeground;

    nodeType.prototype.onNodeCreated = function () {
        const result = onNodeCreated?.apply(this, arguments);
        this.stabilizeBound = this.stabilize.bind(this);
        // 新規作成時は onConfigure が呼ばれないため、ここで ready にする。
        this._miscSplitGraphReady = true;
        this._miscSplitRestoringUntil = 0;
        this._miscSplitCachedOutputs = null;
        this._miscSplitCachedDesired = null;

        syncPrimitivesLinkSlot(this.inputs[0]);
        // 新規作成直後にも 1 回同期しておく
        requestAnimationFrame(() => this.scheduleStabilize(0));
        return result;
    };

    nodeType.prototype.onConfigure = function () {
        const result = onConfigure?.apply(this, arguments);
        this._miscSplitGraphReady = true;

        // 復元/コピペ直後の短時間だけ縮小や切断リスクを下げる
        this._miscSplitRestoringUntil = Date.now() + RESTORE_WINDOW_MS;
        // 仕様⑥: 復元時点の出力構成をキャッシュして、先にソケット本数を確保する
        this._miscSplitCachedOutputs = collectExistingOutputSnapshot(this);
        this._miscSplitCachedDesired = this._miscSplitCachedOutputs
            ? this._miscSplitCachedOutputs.map((s) => ({ name: s.name, type: s.type }))
            : null;
        applySnapshotPlaceholders(this, this._miscSplitCachedOutputs);
        // オフスクリーン複製など、直後の 1 フレーム描画前に名前を確定させる
        this.stabilize();

        // 復元中はリンクと型の復元順が不定なので、少し間隔をあけて複数回同期を試みる。
        // （最初の 1 回で Combine まで辿れない場合がある）
        const kick = () => {
            if (!this.removed) {
                this.scheduleStabilize(0);
            }
        };

        requestAnimationFrame(() => requestAnimationFrame(kick));
        setTimeout(kick, 80);
        setTimeout(kick, 200);
        setTimeout(kick, 500);
        setTimeout(kick, 1200);
        return result;
    };

    nodeType.prototype.onConnectionsChange = function (type, slotIndex, isConnected, linkInfo, ioSlot) {
        onConnectionsChange?.call(this, type, slotIndex, isConnected, linkInfo, ioSlot);

        // 出力側の接続変更で stabilize すると removeOutput により即切断される事故がある。
        if (ioSlot && this.outputs?.includes(ioSlot)) {
            return;
        }
        if (type === IoDirection.OUTPUT) {
            return;
        }

        if (!this._miscSplitGraphReady) {
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

    nodeType.prototype.onDrawForeground = function (ctx) {
        onDrawForeground?.call(this, ctx);
        if (this._miscSplitGraphReady) {
            ensureSplitOutputLabels(this);
        }
    };

    nodeType.prototype.stabilize = function () {
        if (!this._miscSplitGraphReady) {
            return;
        }

        syncPrimitivesLinkSlot(this.inputs[0]);

        const combineNode = findLinkedCombineNode(this, COMBINE_NODE_CLASS);
        const restoring = Date.now() < (this._miscSplitRestoringUntil || 0);
        syncSplitFromCombine(this, combineNode);

        if (restoring && combineNode && this._miscSplitCachedOutputs) {
            const current = collectExistingOutputSnapshot(this);
            const cached = this._miscSplitCachedOutputs;
            const differs =
                current.length !== cached.length ||
                current.some((s, i) => s.name !== cached[i]?.name || s.type !== cached[i]?.type);
            if (differs) {
                requestAnimationFrame(() => this.scheduleStabilize(0));
            }
        }
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
            ...(nodeData.input.required ?? {}),
            combined: [PRIMITIVES_TYPE],
        };

        nodeData.output = [PRIMITIVE_SLOT_TYPE, "INT"];
        nodeData.output_name = ["primitive_01", "length"];

        setupSplitPrimitives(nodeType);
    },
});
