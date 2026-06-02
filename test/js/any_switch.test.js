import { describe, expect, it } from "vitest";
import { computeSelectIndexMax } from "../../js/logic/select-index-bounds.js";
import { miscSlotTypesConnect } from "../../js/logic/litegraph-type-compat.js";
import { countAnySwitchInputs, SELECT_INDEX_KEY } from "../../js/utils/select-index.js";
import { syncSelectIndexWidget } from "../../js/utils/select-index.js";
import { PRIMITIVES_TYPE } from "../../js/utils/constants.js";

describe("any_switch", () => {
    describe("miscSlotTypesConnect", () => {
        it("Combine combined (PRIMITIVES) を any_01 (*) に接続可能", () => {
            expect(miscSlotTypesConnect(PRIMITIVES_TYPE, "*")).toBe(true);
            expect(miscSlotTypesConnect("*", PRIMITIVES_TYPE)).toBe(true);
        });
    });

    describe("select_index 上限", () => {
        it("any_* が3本（+空スロット想定）のとき max は 1", () => {
            expect(computeSelectIndexMax(3)).toBe(1);
        });

        it("any_* が1本だけのとき max は -1", () => {
            expect(computeSelectIndexMax(1)).toBe(-1);
        });
    });

    describe("countAnySwitchInputs", () => {
        it("any_01, any_02 のみカウントし select_index は含めない", () => {
            const node = {
                inputs: [
                    { name: SELECT_INDEX_KEY, type: "INT" },
                    { name: "any_01", type: "*" },
                    { name: "any_02", type: "*" },
                ],
            };
            expect(countAnySwitchInputs(node)).toBe(2);
        });
    });

    describe("syncSelectIndexWidget", () => {
        it("select_index 入力の型は INT のまま維持される", () => {
            const node = {
                inputs: [
                    { name: SELECT_INDEX_KEY, type: "INT" },
                    { name: "any_01", type: "IMAGE" },
                ],
                properties: {},
                widgets: [],
                addWidget(_type, name, value, _cb, options) {
                    const widget = { name, value, options: { ...options } };
                    this.widgets.push(widget);
                    return widget;
                },
            };
            syncSelectIndexWidget(node, (n) => computeSelectIndexMax(countAnySwitchInputs(n)));
            const selectInput = node.inputs.find((i) => i.name === SELECT_INDEX_KEY);
            expect(selectInput.type).toBe("INT");
            expect(node.widgets[0].options.max).toBe(-1);
        });
    });
});
