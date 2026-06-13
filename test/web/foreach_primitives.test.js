import { describe, expect, it } from "vitest"
import { packCombinedPrimitives, unpackCombinedPrimitives } from "../../web/logic/primitives-data.js"

describe("foreach_primitives", () => {
  describe("pack / unpack (Python 同等)", () => {
    it("3 本の STRING を往復できる", () => {
      const combined = packCombinedPrimitives(["foo", "bar", "baz"], ["STRING", "STRING", "STRING"])
      const { values, types, length } = unpackCombinedPrimitives(combined)
      expect(values).toEqual(["foo", "bar", "baz"])
      expect(types).toEqual(["STRING", "STRING", "STRING"])
      expect(length).toBe(3)
    })
  })
})
