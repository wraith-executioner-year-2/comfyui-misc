import { describe, expect, it } from "vitest"
import { syncNodeSizeToContent } from "../../js/utils/node-layout.js"

describe("node_layout", () => {
  it("syncNodeSizeToContent は computeSize より小さい枠を広げる", () => {
    const node = {
      removed: false,
      size: [120, 80],
      outputs: [{}, {}, {}],
      computeSize() {
        return [140, 160]
      },
      setSize(next) {
        this.size = [...next]
      },
    }
    syncNodeSizeToContent(node)
    expect(node.size).toEqual([140, 160])
  })
})
