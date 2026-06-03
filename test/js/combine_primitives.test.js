import { describe, expect, it } from "vitest"
import {
  getStoredPrimitiveSlotTypes,
  pickResolvedPrimitiveSlotType,
  storePrimitiveSlotTypes,
} from "../../js/utils/primitive-type.js"
import {
  MISC_PRIMITIVE_SLOT_TYPES_KEY,
  PRIMITIVE_SLOT_TYPE,
  PRIMITIVES_DISPLAY_LABEL,
  PRIMITIVES_TYPE,
  isPrimitivesLinkType,
  slotLabelForLinkType,
} from "../../js/utils/constants.js"
import { getDataOutputNamePrefix } from "../../js/utils/naming.js"
import { syncPrimitivesLinkSlot } from "../../js/utils/constants.js"
import { listLinkedPrimitiveInputs } from "../../js/logic/split-primitives-names.js"

describe("combine_primitives", () => {
  describe("PRIMITIVES_TYPE（ノード検索の型フィルタ）", () => {
    it("Python CombinedPrimitivesType と同じ PRIMITIVES", () => {
      expect(PRIMITIVES_TYPE).toBe("PRIMITIVES")
    })

    it("旧 combined エイリアスもリンク型として互換", () => {
      expect(isPrimitivesLinkType("combined")).toBe(true)
      expect(isPrimitivesLinkType("PRIMITIVES")).toBe(true)
    })

    it("画面上の表示ラベルは combined に統一", () => {
      expect(PRIMITIVES_DISPLAY_LABEL).toBe("combined")
      expect(slotLabelForLinkType("PRIMITIVES")).toBe("combined")
      expect(slotLabelForLinkType("combined")).toBe("combined")
      expect(getDataOutputNamePrefix("PRIMITIVES")).toBe("combined")
    })

    it("syncPrimitivesLinkSlot は type と label を揃える", () => {
      const slot = { type: "*", label: "*" }
      syncPrimitivesLinkSlot(slot)
      expect(slot.type).toBe(PRIMITIVES_TYPE)
      expect(slot.label).toBe("combined")
    })
  })

  describe("pickResolvedPrimitiveSlotType", () => {
    it("接続型が保存済み INT より優先される（primitive_01 を FLOAT に差し替え可能）", () => {
      expect(
        pickResolvedPrimitiveSlotType({
          connectionType: "FLOAT",
          storedType: "INT",
          slotType: "INT",
        }),
      ).toBe("FLOAT")
    })

    it("未接続時は保存型をフォールバックに使える", () => {
      expect(
        pickResolvedPrimitiveSlotType({
          connectionType: null,
          storedType: "INT",
          slotType: PRIMITIVE_SLOT_TYPE,
        }),
      ).toBe("INT")
    })

    it("接続も保存も無いときは汎用プリミティブ型", () => {
      expect(
        pickResolvedPrimitiveSlotType({
          connectionType: null,
          storedType: null,
          slotType: PRIMITIVE_SLOT_TYPE,
        }),
      ).toBe(PRIMITIVE_SLOT_TYPE)
    })
  })

  describe("storePrimitiveSlotTypes / getStoredPrimitiveSlotTypes", () => {
    it("INT と FLOAT を JSON 保存して復元できる（Split 同期の元データ）", () => {
      const combineNode = { properties: {} }
      storePrimitiveSlotTypes(combineNode, [
        { name: "primitive_01", type: "INT" },
        { name: "primitive_02", type: "FLOAT" },
      ])
      expect(combineNode.properties[MISC_PRIMITIVE_SLOT_TYPES_KEY]).toBeTruthy()
      const restored = getStoredPrimitiveSlotTypes(combineNode)
      expect(restored).toHaveLength(2)
      expect(restored[0].type).toBe("INT")
      expect(restored[1].type).toBe("FLOAT")
    })

    it("COMBO 配列型も round-trip できる", () => {
      const combineNode = { properties: {} }
      storePrimitiveSlotTypes(combineNode, [{ name: "primitive_01", type: ["opt_a", "opt_b"] }])
      const restored = getStoredPrimitiveSlotTypes(combineNode)
      expect(restored[0].type).toEqual(["opt_a", "opt_b"])
    })
  })

  describe("listLinkedPrimitiveInputs", () => {
    it("link のある primitive_* だけ列挙", () => {
      const inputs = [
        { name: "primitive_01", type: "INT", link: 10 },
        { name: "primitive_02", type: "FLOAT" },
      ]
      const linked = listLinkedPrimitiveInputs(inputs)
      expect(linked).toHaveLength(1)
      expect(linked[0].name).toBe("primitive_01")
    })
  })
})
