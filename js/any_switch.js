/**
 * Any Switch (misc) — フロントエンド拡張
 *
 * 画面上で any_01, any_02 … の入力スロットを増減し、
 * 接続されている型（IMAGE など）に合わせてスロット表示を揃えます。
 *
 * Python 側の MiscAnySwitch と名前 "Any Switch (misc)" で対応します。
 */

import { app } from "../../scripts/app.js";
import {
    IoDirection,
    SELECT_INDEX_DEFAULT,
    SELECT_INDEX_KEY,
    countAnySwitchInputs,
    debounce,
    followConnectionUntilType,
    propagatePrimitiveSplitSync,
    removeUnusedInputsFromEnd,
    syncSelectIndexWidget,
} from "./utils.js";
import {
    moveSelectIndexInputToEnd,
    rerouteNonIntLinkFromSelectIndex,
} from "./utils/any-switch-input-order.js";

/** Python の get_name("Any Switch") と同じ文字列 */
const NODE_CLASS = "Any Switch (misc)";

/** 初期表示する入力スロット数（any_01 のみ） */
const MIN_ANY_INPUTS = 1;

/** ノード検索の型フィルタ用（LATENT 等 → * 入力としてマッチさせる） */
const DEFAULT_ANY_INPUTS = Object.fromEntries(
    Array.from({ length: MIN_ANY_INPUTS }, (_, i) => [
        `any_${String(i + 1).padStart(2, "0")}`,
        ["*"],
    ]),
);

/**
 * メイン出力（*）のラベル文字列を、型に応じて整えます。
 *
 * @param {object} output - 出力スロット
 * @param {string} nodeType - 現在の型名
 * @param {{label?: string}|null} connectedType - 接続先から取った型情報
 */
function applyOutputLabels(output, nodeType, connectedType) {
    output.label =
        nodeType === "RGTHREE_CONTEXT"
            ? "CONTEXT"
            : Array.isArray(nodeType) || nodeType.includes(",")
              ? connectedType?.label || String(nodeType)
              : String(nodeType);
}

/**
 * 標準の ComfyUI ノード定義に、Any Switch 用の振る舞いを載せます。
 *
 * @param {Function} nodeType - ComfyUI が登録するノードクラス（prototype を拡張）
 */
function setupMiscAnySwitch(nodeType) {
    const onNodeCreated = nodeType.prototype.onNodeCreated;
    const onConnectionsChange = nodeType.prototype.onConnectionsChange;

    /**
     * ノードがキャンバスに置かれたとき。
     * 初期状態で any_01 を1本用意します。
     */
    nodeType.prototype.onNodeCreated = function () {
        const result = onNodeCreated?.apply(this, arguments);
        this.stabilizeBound = this.stabilize.bind(this);
        this.nodeType = null;
        this.properties = this.properties ?? {};
        if (this.properties.select_index == null) {
            this.properties.select_index = SELECT_INDEX_DEFAULT;
        }
        if (!this.inputs.some((inp) => inp.name?.startsWith("any_"))) {
            this.addAnyInput(MIN_ANY_INPUTS);
        }
        moveSelectIndexInputToEnd(this);
        // 検索からの自動接続直後に型を揃える（debounce 前に PRIMITIVES 等を反映）
        this.stabilize();
        return result;
    };

    /** 配線が変わったら、少し待ってから stabilize でスロット整理 */
    nodeType.prototype.onConnectionsChange = function (type, slotIndex, isConnected, linkInfo, ioSlot) {
        onConnectionsChange?.call(this, type, slotIndex, isConnected, linkInfo, ioSlot);

        if (
            type === IoDirection.INPUT &&
            isConnected &&
            (ioSlot?.name === SELECT_INDEX_KEY || this.inputs[slotIndex]?.name === SELECT_INDEX_KEY)
        ) {
            rerouteNonIntLinkFromSelectIndex(this, slotIndex);
            moveSelectIndexInputToEnd(this);
        }

        this.scheduleStabilize();
    };

    /** チェーン接続（リレー経由など）が変わったときも同様 */
    nodeType.prototype.onConnectionsChainChange = function () {
        this.scheduleStabilize();
    };

    /**
     * stabilize を debounce で予約する。
     * @param {number} [ms=64]
     */
    nodeType.prototype.scheduleStabilize = function (ms = 64) {
        return debounce(this.stabilizeBound, ms);
    };

    /**
     * any_XX 形式の入力スロットを num 本追加する。
     * @param {number} [num=1]
     */
    nodeType.prototype.addAnyInput = function (num = 1) {
        for (let i = 0; i < num; i++) {
            const next = countAnySwitchInputs(this) + 1;
            this.addInput(
                `any_${String(next).padStart(2, "0")}`,
                this.nodeType || "*",
            );
        }
    };

    /**
     * 未使用スロットの削除・1本追加・型の同期をまとめて行う。
     */
    nodeType.prototype.stabilize = function () {
        // 末尾の未使用 any_* を整理しつつ、最低 1 本の入力は常に残す。
        removeUnusedInputsFromEnd(this, Math.max(1, MIN_ANY_INPUTS - 1), /^any_/);
        this.addAnyInput();
        moveSelectIndexInputToEnd(this);

        let connectedType = null;
        for (let i = 0; i < this.inputs.length; i++) {
            const input = this.inputs[i];
            if (!input?.name?.startsWith("any_")) {
                continue;
            }
            connectedType = followConnectionUntilType(this, IoDirection.INPUT, i, true);
            if (connectedType) {
                break;
            }
        }
        if (!connectedType) {
            connectedType = followConnectionUntilType(this, IoDirection.OUTPUT, undefined, true);
        }

        this.nodeType = connectedType?.type || "*";
        for (const input of this.inputs) {
            if (input.name === SELECT_INDEX_KEY) {
                input.type = "INT";
                continue;
            }
            if (input.name?.startsWith("any_")) {
                input.type = this.nodeType;
            }
        }
        for (let i = 0; i < this.outputs.length; i++) {
            const output = this.outputs[i];
            if (i === 0) {
                output.type = this.nodeType;
                applyOutputLabels(output, this.nodeType, connectedType);
            } else {
                output.type = "INT";
                output.label = "index";
            }
        }

        // any_* は末尾に「次に接続するための空スロット」を1本維持するため、
        // 選択可能な最大 index は (入力本数 - 2) にする。
        syncSelectIndexWidget(this, (node) => countAnySwitchInputs(node) - 2);

        propagatePrimitiveSplitSync(this);
    };
}

app.registerExtension({
    name: "comfyui-misc.AnySwitch",
    /**
     * ノード定義が登録される直前に呼ばれ、Any Switch だけカスタム化する。
     */
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_CLASS) {
            return;
        }

        // object_info の optional が空だと型絞り込み検索に出ないため、* 入力を明示する
        nodeData.input = nodeData.input ?? {};
        nodeData.input.required = {
            ...(nodeData.input.required ?? {}),
            select_index: ["INT", { default: -1, min: -1, max: 4096 }],
        };
        nodeData.input.optional = {
            ...(nodeData.input.optional ?? {}),
            ...DEFAULT_ANY_INPUTS,
        };
        nodeData.output = ["*", "INT"];
        nodeData.output_name = ["*", "index"];

        setupMiscAnySwitch(nodeType);
    },
});
