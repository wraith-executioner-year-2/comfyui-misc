import { describe, expect, it } from "vitest";
import {
  isAnyOutputPasteLayoutMismatch,
  minDataOutputsForRestore,
  remapPastedLinksToNamedOutputs,
  remapSerializedOriginSlotToOutputIndex,
  shouldSkipAnyOutputDataRemoval
} from "../../js/logic/any-output-switch-restore.js";

describe("any_output_switch_restore", () => {
  it("復元中は未接続 data 出力を削除しない", () => {
    expect(shouldSkipAnyOutputDataRemoval(true, false)).toBe(true);
    expect(shouldSkipAnyOutputDataRemoval(false, true)).toBe(true);
    expect(shouldSkipAnyOutputDataRemoval(false, false)).toBe(false);
  });

  it("キャッシュ2本 + リンク slot 0,1 なら最低2本の data を維持", () => {
    expect(
      minDataOutputsForRestore({
        cachedDataCount: 2,
        linkedDataOriginSlots: [0, 1]
      })
    ).toBe(2);
  });

  it("コピペ直後 index が先頭付近でも IMAGE_02 リンクは data スロットへ", () => {
    const outputs = [{ name: "IMAGE_01" }, { name: "index" }, { name: "IMAGE_02" }, { name: "index" }];
    expect(isAnyOutputPasteLayoutMismatch(outputs)).toBe(true);

    const nodeId = 12;
    const links = [
      { origin_id: nodeId, origin_slot: 0 },
      { origin_id: nodeId, origin_slot: 1 }
    ];
    remapPastedLinksToNamedOutputs(outputs, links, nodeId);
    expect(links[0].origin_slot).toBe(0);
    expect(links[1].origin_slot).toBe(2);
  });

  it("正しい並びでは origin_slot 0,1 はそのまま", () => {
    const outputs = [{ name: "IMAGE_01" }, { name: "IMAGE_02" }, { name: "index" }];
    expect(remapSerializedOriginSlotToOutputIndex(1, outputs)).toBe(1);
    expect(remapSerializedOriginSlotToOutputIndex(2, outputs)).toBe(2);
  });
});
