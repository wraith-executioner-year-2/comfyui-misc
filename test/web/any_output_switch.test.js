import { describe, expect, it } from "vitest"
import { buildSwitchOutputValues, computeOutputLayout } from "../../web/logic/any-output-switch-layout.js"
import { computeSelectIndexMax } from "../../web/logic/select-index-bounds.js"
import { getGraphLink } from "../../web/utils/graph-links.js"
import { createTrailingOutputHelpers } from "../../web/utils/trailing-output.js"

describe("any_output_switch", () => {
  describe("computeOutputLayout", () => {
    it("2本のデータ出力(0,1)接続時、index はスロット2（2本目を index と誤認しない）", () => {
      const { dataSlots, numData, indexSlot } = computeOutputLayout([0, 1])
      expect(dataSlots).toEqual([0, 1])
      expect(numData).toBe(2)
      expect(indexSlot).toBe(2)
    })

    it("index のみ接続(min=1, slot=1)のとき data は空", () => {
      const { dataSlots, numData, indexSlot } = computeOutputLayout([1], 1)
      expect(dataSlots).toEqual([])
      expect(numData).toBe(1)
      expect(indexSlot).toBe(1)
    })
  })

  describe("buildSwitchOutputValues", () => {
    it("select_index=0 で2本接続時、2本目に index 値が入らない（バグ: FLOATに0が入る）", () => {
      const input = { kind: "latent" }
      const { values, selectedIndex, indexSlot } = buildSwitchOutputValues(input, 0, [0, 1])
      expect(selectedIndex).toBe(0)
      expect(indexSlot).toBe(2)
      expect(values[0]).toBe(input)
      expect(values[1]).toBeNull()
      expect(values[2]).toBe(0)
    })

    it("index 出力は最後尾に整数の selectedIndex を載せる", () => {
      const { values } = buildSwitchOutputValues("x", 1, [0, 1])
      expect(values[values.length - 1]).toBe(1)
    })
  })

  describe("select_index 上限", () => {
    it("データ出力3本+空スロット想定で max は 1 (3-2)", () => {
      expect(computeSelectIndexMax(3)).toBe(1)
    })
  })

  describe("getGraphLink (Map)", () => {
    it("Proxy(Map) 形式の links からリンクを取得できる", () => {
      const link = { origin_id: 1, origin_slot: 2, target_id: 3, target_slot: 0 }
      const links = new Map([[61, link]])
      expect(getGraphLink({ links }, 61)).toBe(link)
      expect(getGraphLink({ links }, 999)).toBeNull()
    })
  })

  describe("ensureIndexOutput リンク再マップ", () => {
    it("countDataOutputs は末尾 index を除いた本数", () => {
      const indexTrailing = createTrailingOutputHelpers("index")
      const node = {
        outputs: [
          { name: "any_01", type: "*" },
          { name: "any_02", type: "*" },
          { name: "index", type: "INT" },
        ],
      }
      expect(indexTrailing.countDataSlots(node)).toBe(2)
    })
  })
})
