import { describe, expect, it } from "vitest";
import { remapInputTargetSlot } from "../../js/logic/input-slot-remap.js";

describe("any_switch input order", () => {
    describe("remapInputTargetSlot", () => {
        it("select_index を 0 から末尾(2)へ移すときリンク先スロットを再マップ", () => {
            expect(remapInputTargetSlot(0, 2, 0)).toBe(2);
            expect(remapInputTargetSlot(0, 2, 1)).toBe(0);
            expect(remapInputTargetSlot(0, 2, 2)).toBe(1);
        });
    });
});
