import { describe, expect, it } from "vitest";
import { getNodeGraph } from "../../js/utils/graph-context.js";

describe("graph_context", () => {
  describe("getNodeGraph", () => {
    it("node.graph を優先（ExportWorkflowImage のオフスクリーン複製で Combine を辿れる）", () => {
      const offscreen = { id: "offscreen-graph" };
      const splitNode = { graph: offscreen };
      expect(getNodeGraph(splitNode)).toBe(offscreen);
      expect(getNodeGraph(splitNode)).not.toBe(null);
    });
  });
});
