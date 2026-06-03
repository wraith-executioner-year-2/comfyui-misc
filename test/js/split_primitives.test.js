import { describe, expect, it } from "vitest";
import {
    formatTypedOutputName,
    listLinkedPrimitiveInputs,
    resolveDesiredPrimitiveSlots,
    typeNameForPrimitiveSlotType,
} from "../../js/logic/split-primitives-names.js";
import { getGraphLink } from "../../js/utils/graph-links.js";
import { primitiveTypesCompatible, reconcilePrimitiveSlotType } from "../../js/utils/primitive-type.js";
import { PRIMITIVE_SLOT_TYPE } from "../../js/utils/constants.js";

describe("split_primitives", () => {
    describe("formatTypedOutputName", () => {
        it("INT, FLOAT の順で INT_01 / FLOAT_02 になる（読込み時の表示名崩れ防止）", () => {
            expect(formatTypedOutputName("INT", 0)).toBe("INT_01");
            expect(formatTypedOutputName("FLOAT", 1)).toBe("FLOAT_02");
        });

        it("3本目も FLOAT_03 になる", () => {
            expect(formatTypedOutputName("FLOAT", 2)).toBe("FLOAT_03");
        });
    });

    describe("resolveDesiredPrimitiveSlots", () => {
        it("Combine 保存型 INT+FLOAT をそのまま2本として復元", () => {
            const stored = [
                { name: "primitive_01", type: "INT" },
                { name: "primitive_02", type: "FLOAT" },
            ];
            const desired = resolveDesiredPrimitiveSlots(stored, []);
            expect(desired).toHaveLength(2);
            expect(desired[0].type).toBe("INT");
            expect(desired[1].type).toBe("FLOAT");
        });

        it("linked を stored より優先（未接続の primitive_02 が stored にあっても1本）", () => {
            const stored = [
                { name: "primitive_01", type: "INT" },
                { name: "primitive_02", type: "FLOAT" },
            ];
            const linked = [{ name: "primitive_01", type: "INT" }];
            const desired = resolveDesiredPrimitiveSlots(stored, linked);
            expect(desired).toHaveLength(1);
            expect(desired[0].type).toBe("INT");
        });

        it("接続済みのみ列挙し未接続の primitive_03 は含めない", () => {
            const inputs = [
                { name: "primitive_01", type: "INT", link: 1 },
                { name: "primitive_02", type: "FLOAT", link: 2 },
                { name: "primitive_03", type: "FLOAT" },
            ];
            const linked = listLinkedPrimitiveInputs(inputs);
            expect(linked).toHaveLength(2);
            expect(linked[1].type).toBe("FLOAT");
        });
    });

    describe("型互換（FLOAT 切断防止）", () => {
        it("INT と FLOAT は互換", () => {
            expect(primitiveTypesCompatible("INT", "FLOAT")).toBe(true);
        });

        it("復元中の汎用型から FLOAT へ具体化できる", () => {
            expect(reconcilePrimitiveSlotType(PRIMITIVE_SLOT_TYPE, "FLOAT")).toBe("FLOAT");
        });

        it("既存 FLOAT は INT に上書きされない", () => {
            expect(reconcilePrimitiveSlotType("FLOAT", "INT")).toBe("FLOAT");
        });
    });

    describe("getGraphLink", () => {
        it("plain object の links でも取得できる", () => {
            const link = { id: 1 };
            expect(getGraphLink({ links: { 5: link } }, 5)).toBe(link);
        });
    });

    describe("typeNameForPrimitiveSlotType", () => {
        it("COMBO 配列は COMBO", () => {
            expect(typeNameForPrimitiveSlotType(["a", "b"])).toBe("COMBO");
        });
    });
});
