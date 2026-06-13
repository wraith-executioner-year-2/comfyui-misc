/** ForEach / End ForEach (misc) */

import { app } from "../../scripts/app.js"
import {
  attachStabilizeHooks,
  END_FOREACH_NODE_CLASS,
  FOREACH_NODE_CLASS,
  pinWildcardSlot,
  propagatePrimitiveSplitSync,
  PRIMITIVES_TYPE,
  syncPrimitivesLinkSlot,
} from "./utils.js"

function stabilizeForEach(node) {
  if (node.removed) {
    return
  }

  if (node.inputs?.some((inp) => inp.name === "combined")) {
    syncPrimitivesLinkSlot(node.inputs?.find((inp) => inp.name === "combined"))
    node.nodeType = "*"
    pinWildcardSlot(node.outputs?.[0])
  } else {
    pinWildcardSlot(node.inputs?.find((inp) => inp.name === "value"))
    syncPrimitivesLinkSlot(
      node.outputs?.find((o) => o.name === "combined"),
      PRIMITIVES_TYPE,
    )
  }

  propagatePrimitiveSplitSync(node)
  node.graph?.setDirtyCanvas?.(true, false)
}

function setupForEachNode(nodeType) {
  attachStabilizeHooks(nodeType, {
    afterBind(node) {
      node.nodeType = "*"
    },
  })

  nodeType.prototype.stabilize = stabilizeForEach
}

app.registerExtension({
  name: "comfyui-misc.ForEachPrimitives",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name === FOREACH_NODE_CLASS) {
      nodeData.input = nodeData.input ?? {}
      nodeData.input.required = {
        ...(nodeData.input.required ?? {}),
        combined: [PRIMITIVES_TYPE],
      }
      nodeData.output = ["*"]
      nodeData.output_name = ["*"]
      setupForEachNode(nodeType)
      return
    }
    if (nodeData.name === END_FOREACH_NODE_CLASS) {
      nodeData.input = nodeData.input ?? {}
      nodeData.input.required = {
        ...(nodeData.input.required ?? {}),
        value: ["*"],
      }
      nodeData.output = [PRIMITIVES_TYPE]
      nodeData.output_name = ["combined"]
      setupForEachNode(nodeType)
    }
  },
})
