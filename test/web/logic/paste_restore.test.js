import { describe, expect, it } from "vitest"
import { buildSwitchOutputValues, computeOutputLayout } from "../../../web/logic/any-output-switch-layout.js"
import { getDesiredAnyInputCount } from "../../../web/logic/any-switch-inputs.js"
import { remapInputTargetSlot } from "../../../web/logic/input-slot-remap.js"
import { remapPastedLinksToNamedInputs } from "../../../web/logic/any-switch-input-order.js"
import {
  canRemoveExcessSplitOutput,
  decrementOriginSlotAfterOutputRemoved,
  pickDesiredDuringSync,
  remapOriginSlotToIndexOutput,
  shouldBlockDataOutputRemoval,
  shouldSkipAnyOutputDataRemoval,
  shouldBlockSplitOutputRemoval,
  shouldHoldSplitOutputsWithoutCombine,
  verifyGraphLinksResolve,
  verifyInputLinksAfterSelectIndexMove,
} from "../../../web/logic/paste-restore.js"
import { formatTypedOutputName, resolveDesiredPrimitiveSlots } from "../../../web/logic/split-primitives-names.js"
import { COMBINE_PRIMITIVES_NODE_CLASS, SPLIT_PRIMITIVES_NODE_CLASS } from "../../../web/utils/constants.js"
import { getStoredPrimitiveSlotTypes, storePrimitiveSlotTypes } from "../../../web/utils/primitive-type.js"

const MISC_NODES = [
  "Split Primitives (misc)",
  "Combine Primitives (misc)",
  "ForEach (misc)",
  "End ForEach (misc)",
  "Any Switch (misc)",
  "Any Output Switch (misc)",
]

describe("コピー＆ペースト復元（接続維持）", () => {
  it("対象ノード一覧が揃っている", () => {
    expect(MISC_NODES).toEqual([
      SPLIT_PRIMITIVES_NODE_CLASS,
      COMBINE_PRIMITIVES_NODE_CLASS,
      "ForEach (misc)",
      "End ForEach (misc)",
      "Any Switch (misc)",
      "Any Output Switch (misc)",
    ])
  })

  describe("Split Primitives (misc)", () => {
    it("復元中・Combine未確定・combined接続ありではキャッシュ出力構成を維持", () => {
      const cached = [
        { name: "INT_01", type: "INT" },
        { name: "FLOAT_02", type: "FLOAT" },
      ]
      const picked = pickDesiredDuringSync({
        restoring: true,
        combineNode: null,
        hasCombinedLink: true,
        cachedDesired: cached,
        linked: [{ name: "primitive_01", type: "INT" }],
        stored: null,
      })
      expect(picked).toEqual(cached)
      expect(shouldHoldSplitOutputsWithoutCombine(true, null, true, cached)).toBe(true)
    })

    it("復元中は接続済み余分出力を削除しない", () => {
      expect(shouldBlockSplitOutputRemoval(true, true)).toBe(true)
      expect(
        canRemoveExcessSplitOutput({
          restoring: true,
          outputHasLinks: true,
          currentCount: 3,
          desiredCount: 2,
        }),
      ).toBe(false)
    })

    it("復元後は未接続の余分出力のみ削除可能", () => {
      expect(
        canRemoveExcessSplitOutput({
          restoring: false,
          outputHasLinks: false,
          currentCount: 3,
          desiredCount: 2,
        }),
      ).toBe(true)
    })

    it("ペースト復元後も出力名 INT_01 / FLOAT_02 が維持される", () => {
      const desired = resolveDesiredPrimitiveSlots(
        [
          { name: "primitive_01", type: "INT" },
          { name: "primitive_02", type: "FLOAT" },
        ],
        [],
      )
      expect(formatTypedOutputName(desired[0].type, 0)).toBe("INT_01")
      expect(formatTypedOutputName(desired[1].type, 1)).toBe("FLOAT_02")
    })
  })

  describe("Combine Primitives (misc)", () => {
    it("ペースト復元用の型キャッシュが properties に残り Split が読める", () => {
      const combineNode = { properties: {} }
      storePrimitiveSlotTypes(combineNode, [
        { name: "primitive_01", type: "STRING" },
        { name: "primitive_02", type: "INT" },
      ])
      const restored = getStoredPrimitiveSlotTypes(combineNode)
      expect(restored).toHaveLength(2)
      expect(restored[0].type).toBe("STRING")
      expect(restored[1].type).toBe("INT")
    })

    it("接続済み primitive_* はリンク解決できる（ペースト直後のグラフ）", () => {
      const inputs = [
        { name: "primitive_01", link: 1 },
        { name: "primitive_02", link: 2 },
      ]
      const outputs = [{ name: "combined", links: [10] }, { name: "length" }]
      const links = {
        1: { origin_id: 100, origin_slot: 0, target_id: 1, target_slot: 0 },
        2: { origin_id: 101, origin_slot: 0, target_id: 1, target_slot: 1 },
        10: { origin_id: 1, origin_slot: 0, target_id: 2, target_slot: 0 },
      }
      expect(verifyGraphLinksResolve({ inputs, outputs, links })).toBe(true)
    })
  })

  describe("Any Switch (misc)", () => {
    it("コピペ直後（select_index 先頭）でも Int 2本は any_01 / any_02 へ復元", () => {
      const pastedInputs = [{ name: "select_index" }, { name: "any_01" }, { name: "any_02" }]
      const nodeId = 9
      const links = [
        { target_id: nodeId, target_slot: 0 },
        { target_id: nodeId, target_slot: 1 },
      ]
      remapPastedLinksToNamedInputs(pastedInputs, links, nodeId)
      expect(links[0].target_slot).toBe(1)
      expect(links[1].target_slot).toBe(2)
    })

    it("select_index 末尾移動後も入力リンクの target_slot が有効", () => {
      const inputs = [{ name: "any_01" }, { name: "any_02" }, { name: "select_index" }]
      const nodeId = 5
      const linksToNode = [{ target_id: nodeId, target_slot: 0 }]
      expect(verifyInputLinksAfterSelectIndexMove(inputs, linksToNode, nodeId, 0, 2)).toBe(true)
      expect(remapInputTargetSlot(0, 2, 0)).toBe(2)
      expect(inputs[2].name).toBe("select_index")
    })

    it("接続済み any_02 まで復元後も any_03 まで確保（リンク用空スロット）", () => {
      const inputs = [{ name: "any_01", link: 1 }, { name: "any_02", link: 2 }, { name: "select_index" }]
      expect(getDesiredAnyInputCount(inputs)).toBe(3)
    })

    it("ペースト後グラフで any_* / select_index リンクが解決できる", () => {
      const inputs = [{ name: "any_01" }, { name: "any_02" }, { name: "select_index" }]
      const outputs = [
        { name: "*", links: [20] },
        { name: "index", links: [21] },
      ]
      const links = {
        11: { origin_id: 50, origin_slot: 0, target_id: 5, target_slot: 1 },
        20: { origin_id: 5, origin_slot: 0, target_id: 60, target_slot: 0 },
        21: { origin_id: 5, origin_slot: 1, target_id: 61, target_slot: 0 },
      }
      expect(verifyGraphLinksResolve({ inputs, outputs, links })).toBe(true)
    })
  })

  describe("Any Output Switch (misc)", () => {
    it("接続済み data 出力は整理時に削除しない", () => {
      expect(shouldBlockDataOutputRemoval(true)).toBe(true)
      expect(shouldBlockDataOutputRemoval(false)).toBe(false)
    })

    it("復元中はリンク未復元でも data 出力を削除しない", () => {
      expect(shouldSkipAnyOutputDataRemoval(true, false)).toBe(true)
    })

    it("IMAGE_01 / IMAGE_02 2本接続のコピペ後も origin_slot 0,1 が解決できる", () => {
      const outputs = [
        { name: "IMAGE_01", links: [30] },
        { name: "IMAGE_02", links: [32] },
        { name: "IMAGE_03" },
        { name: "index", links: [31] },
      ]
      const inputs = [{ name: "input", link: 40 }]
      const links = {
        30: { origin_id: 8, origin_slot: 0, target_id: 90, target_slot: 0 },
        32: { origin_id: 8, origin_slot: 1, target_id: 92, target_slot: 0 },
        31: { origin_id: 8, origin_slot: 3, target_id: 91, target_slot: 0 },
        40: { origin_id: 70, origin_slot: 0, target_id: 8, target_slot: 0 },
      }
      expect(verifyGraphLinksResolve({ inputs, outputs, links })).toBe(true)
    })

    it("index 出力リンクは末尾スロットへ追従する", () => {
      const nodeId = 7
      const link = { origin_id: nodeId, origin_slot: 1 }
      const remapped = remapOriginSlotToIndexOutput(link, nodeId, 2)
      expect(remapped.origin_slot).toBe(2)
    })

    it("data 挿入で index 手前の出力を外したとき後続 origin_slot を詰める", () => {
      const nodeId = 7
      const link = { origin_id: nodeId, origin_slot: 2 }
      const adjusted = decrementOriginSlotAfterOutputRemoved(link, nodeId, 0)
      expect(adjusted.origin_slot).toBe(1)
    })

    it("2本 data 接続時 index はスロット2（接続先スロットがずれない）", () => {
      const { indexSlot, numData } = computeOutputLayout([0, 1])
      expect(numData).toBe(2)
      expect(indexSlot).toBe(2)
      const { values } = buildSwitchOutputValues({ x: 1 }, 0, [0, 1])
      expect(values[2]).toBe(0)
      expect(values[1]).toBeNull()
    })

    it("ペースト後グラフで data / index 出力リンクが解決できる", () => {
      const outputs = [{ name: "any_01", links: [30] }, { name: "any_02" }, { name: "index", links: [31] }]
      const inputs = [{ name: "input", link: 40 }]
      const links = {
        30: { origin_id: 8, origin_slot: 0, target_id: 90, target_slot: 0 },
        31: { origin_id: 8, origin_slot: 2, target_id: 91, target_slot: 0 },
        40: { origin_id: 70, origin_slot: 0, target_id: 8, target_slot: 0 },
      }
      expect(verifyGraphLinksResolve({ inputs, outputs, links })).toBe(true)
    })
  })
})
