import { describe, expect, it } from "vitest"
import {
  isAnySwitchPasteOrderMismatch,
  remapPastedLinksToNamedInputs,
  remapSerializedTargetSlotToInputIndex,
} from "../../js/logic/any-switch-input-order.js"
import { remapInputTargetSlot } from "../../js/logic/input-slot-remap.js"

describe("any_switch input order", () => {
  describe("remapInputTargetSlot", () => {
    it("select_index を 0 から末尾(2)へ移すときリンク先スロットを再マップ", () => {
      expect(remapInputTargetSlot(0, 2, 0)).toBe(2)
      expect(remapInputTargetSlot(0, 2, 1)).toBe(0)
      expect(remapInputTargetSlot(0, 2, 2)).toBe(1)
    })
  })

  describe("コピペ復元（select_index が先頭に来る）", () => {
    const pastedInputs = [{ name: "select_index" }, { name: "any_01" }, { name: "any_02" }]

    it("ペースト直後の並び順ミスマッチを検出する", () => {
      expect(isAnySwitchPasteOrderMismatch(pastedInputs)).toBe(true)
      expect(
        isAnySwitchPasteOrderMismatch([{ name: "any_01" }, { name: "any_02" }, { name: "select_index" }]),
      ).toBe(false)
    })

    it("保存時 slot 0/1 は any_01/any_02 の配列 index に解決する", () => {
      expect(remapSerializedTargetSlotToInputIndex(0, pastedInputs)).toBe(1)
      expect(remapSerializedTargetSlotToInputIndex(1, pastedInputs)).toBe(2)
      expect(remapSerializedTargetSlotToInputIndex(2, pastedInputs)).toBe(0)
    })

    it("Int Constant 2本のリンクが any_01 / any_02 に復元される", () => {
      const nodeId = 9
      const links = [
        { target_id: nodeId, target_slot: 0 },
        { target_id: nodeId, target_slot: 1 },
      ]
      remapPastedLinksToNamedInputs(pastedInputs, links, nodeId)
      expect(links[0].target_slot).toBe(1)
      expect(links[1].target_slot).toBe(2)

      const inputsAfterSplice = [{ name: "any_01" }, { name: "any_02" }, { name: "select_index" }]
      links[0].target_slot = remapInputTargetSlot(0, 2, links[0].target_slot)
      links[1].target_slot = remapInputTargetSlot(0, 2, links[1].target_slot)

      expect(inputsAfterSplice[links[0].target_slot].name).toBe("any_01")
      expect(inputsAfterSplice[links[1].target_slot].name).toBe("any_02")
    })
  })
})
