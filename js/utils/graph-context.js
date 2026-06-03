import { app } from "../../../scripts/app.js";

/**
 * ノードが属する LGraph（メイングラフ / ExportWorkflowImage 等のオフスクリーン複製）。
 *
 * @param {object|null|undefined} node
 * @returns {object|null}
 */
export function getNodeGraph(node) {
  if (node?.graph) {
    return node.graph;
  }
  return app?.canvas?.getCurrentGraph?.() ?? app?.graph ?? null;
}
