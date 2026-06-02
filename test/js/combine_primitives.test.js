import { describe, expect, it } from "vitest";
import {
    getStoredPrimitiveSlotTypes,
    storePrimitiveSlotTypes,
} from "../../js/utils/primitive-type.js";
import { MISC_PRIMITIVE_SLOT_TYPES_KEY } from "../../js/utils/constants.js";
import { listLinkedPrimitiveInputs } from "../../js/logic/split-primitives-names.js";

describe("combine_primitives", () => {
    describe("storePrimitiveSlotTypes / getStoredPrimitiveSlotTypes", () => {
        it("INT と FLOAT を JSON 保存して復元できる（Split 同期の元データ）", () => {
            const combineNode = { properties: {} };
            storePrimitiveSlotTypes(combineNode, [
                { name: "primitive_01", type: "INT" },
                { name: "primitive_02", type: "FLOAT" },
            ]);
            expect(combineNode.properties[MISC_PRIMITIVE_SLOT_TYPES_KEY]).toBeTruthy();
            const restored = getStoredPrimitiveSlotTypes(combineNode);
            expect(restored).toHaveLength(2);
            expect(restored[0].type).toBe("INT");
            expect(restored[1].type).toBe("FLOAT");
        });

        it("COMBO 配列型も round-trip できる", () => {
            const combineNode = { properties: {} };
            storePrimitiveSlotTypes(combineNode, [
                { name: "primitive_01", type: ["opt_a", "opt_b"] },
            ]);
            const restored = getStoredPrimitiveSlotTypes(combineNode);
            expect(restored[0].type).toEqual(["opt_a", "opt_b"]);
        });
    });

    describe("listLinkedPrimitiveInputs", () => {
        it("link のある primitive_* だけ列挙", () => {
            const inputs = [
                { name: "primitive_01", type: "INT", link: 10 },
                { name: "primitive_02", type: "FLOAT" },
            ];
            const linked = listLinkedPrimitiveInputs(inputs);
            expect(linked).toHaveLength(1);
            expect(linked[0].name).toBe("primitive_01");
        });
    });
});
