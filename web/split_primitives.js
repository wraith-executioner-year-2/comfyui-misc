/** Split Primitives (misc) */

import { app } from "../../scripts/app.js"
import {
  attachStabilizeHooks,
  PRIMITIVES_TYPE,
  syncPrimitivesLinkSlot,
  COMBINE_PRIMITIVES_NODE_CLASS,
  IoDirection,
  PRIMITIVE_SLOT_TYPE,
  SPLIT_PRIMITIVES_NODE_CLASS,
  LENGTH_OUTPUT_NAME,
  findLinkedCombineNode,
  isPrimitiveRelayNode,
  propagatePrimitiveSplitSync,
  getStoredPrimitiveSlotTypes,
  resolvePrimitiveSlotType,
  reconcilePrimitiveSlotType,
  scheduleStabilizeRetries,
  syncNodeSizeToContent,
} from "./utils.js"

import { createTrailingOutputHelpers } from "./utils/trailing-output.js"
import {
  formatTypedOutputName,
  typeNameForPrimitiveSlotType,
  listLinkedPrimitiveInputs,
  pickDesiredDuringSync,
  resolveDesiredPrimitiveSlots,
} from "./logic/split-primitives-names.js"
import { MISC_GRAPH_RESTORE_WINDOW_MS } from "./logic/restore-window.js"

const NODE_CLASS = SPLIT_PRIMITIVES_NODE_CLASS
const COMBINE_NODE_CLASS = COMBINE_PRIMITIVES_NODE_CLASS

const RELAY_PATCH_KEY = "__miscPrimitiveRelayPatch"

const lengthTrailing = createTrailingOutputHelpers(LENGTH_OUTPUT_NAME)
const countPrimitiveDataOutputs = lengthTrailing.countDataSlots
const ensureLengthOutput = lengthTrailing.ensureMeta
const isLengthOutputSlot = lengthTrailing.isMetaSlot

function patchRelayNodeConnectionCallbacks() {
  if (LGraphNode.prototype[RELAY_PATCH_KEY]) {
    return
  }
  LGraphNode.prototype[RELAY_PATCH_KEY] = true

  const origChange = LGraphNode.prototype.onConnectionsChange
  LGraphNode.prototype.onConnectionsChange = function (...args) {
    const ret = origChange?.apply(this, args)
    if (isPrimitiveRelayNode(this)) {
      propagatePrimitiveSplitSync(this)
    }
    return ret
  }

  const origChain = LGraphNode.prototype.onConnectionsChainChange
  if (origChain) {
    LGraphNode.prototype.onConnectionsChainChange = function (...args) {
      const ret = origChain.apply(this, args)
      if (isPrimitiveRelayNode(this)) {
        propagatePrimitiveSplitSync(this)
      }
      return ret
    }
  }
}

function addPrimitiveOutputBeforeLength(node, name, type) {
  ensureLengthOutput(node)
  if (isLengthOutputSlot(node)) {
    const lengthSlot = node.outputs.pop()
    node.addOutput(name, type)
    node.outputs.push(lengthSlot)
  } else {
    node.addOutput(name, type)
    ensureLengthOutput(node)
  }
}

function collectExistingOutputSnapshot(splitNode) {
  const end = countPrimitiveDataOutputs(splitNode)
  const snapshot = []
  for (let i = 0; i < end; i++) {
    const out = splitNode.outputs?.[i]
    if (!out?.name) {
      continue
    }
    snapshot.push({ name: out.name, type: out.type })
  }
  return snapshot
}

function ensurePrimitiveOutputsCount(splitNode, count, defaultType = PRIMITIVE_SLOT_TYPE) {
  ensureLengthOutput(splitNode)
  while (countPrimitiveDataOutputs(splitNode) < count) {
    const idx = countPrimitiveDataOutputs(splitNode)
    addPrimitiveOutputBeforeLength(splitNode, `primitive_${String(idx + 1).padStart(2, "0")}`, defaultType)
  }
}

function normalizeLengthOutput(splitNode) {
  const lengthOut = splitNode.outputs[splitNode.outputs.length - 1]
  if (!lengthOut) {
    return
  }
  lengthOut.type = "INT"
  lengthOut.name = LENGTH_OUTPUT_NAME
  lengthOut.label = LENGTH_OUTPUT_NAME
}

function ensureSplitOutputLabels(splitNode) {
  const end = countPrimitiveDataOutputs(splitNode)
  for (let i = 0; i < end; i++) {
    const out = splitNode.outputs?.[i]
    if (!out?.name) {
      continue
    }
    if (out.label !== out.name) {
      out.label = out.name
    }
  }
  normalizeLengthOutput(splitNode)
}

function setGenericPrimitiveOutputs(splitNode) {
  const end = countPrimitiveDataOutputs(splitNode)
  for (let i = 0; i < end; i++) {
    const out = splitNode.outputs[i]
    if (!out?.name?.includes("_")) {
      continue
    }
    out.type = PRIMITIVE_SLOT_TYPE
    out.label = out.name
  }
}

function applySnapshotPlaceholders(splitNode, snapshot) {
  if (!snapshot?.length) {
    return
  }
  ensurePrimitiveOutputsCount(splitNode, snapshot.length, PRIMITIVE_SLOT_TYPE)
  for (let i = 0; i < snapshot.length; i++) {
    const out = splitNode.outputs?.[i]
    const snap = snapshot[i]
    if (!out || !snap) {
      continue
    }
    out.name = snap.name
    out.type = PRIMITIVE_SLOT_TYPE
    out.label = snap.name
  }
  normalizeLengthOutput(splitNode)
}

function listLinkedWithResolvedTypes(combineNode) {
  const linked = []
  for (let i = 0; i < (combineNode.inputs ?? []).length; i++) {
    const inp = combineNode.inputs[i]
    if (!inp?.name?.startsWith("primitive_") || !inp.link) {
      continue
    }
    linked.push({
      name: inp.name,
      type: resolvePrimitiveSlotType(combineNode, i, inp),
    })
  }
  return linked
}

function getCombinedInput(splitNode) {
  return splitNode.inputs?.find((inp) => inp.name === "combined")
}

function syncSplitFromCombine(splitNode, combineNode) {
  ensureLengthOutput(splitNode)

  const restoring = Date.now() < (splitNode._miscSplitRestoringUntil || 0)
  const combinedInput = getCombinedInput(splitNode)
  const hasCombinedLink = !!combinedInput?.link

  if (!restoring && !combineNode && hasCombinedLink) {
    ensurePrimitiveOutputsCount(splitNode, 1, PRIMITIVE_SLOT_TYPE)
    normalizeLengthOutput(splitNode)
    ensureSplitOutputLabels(splitNode)
    return
  }

  if (restoring && !combineNode) {
    setGenericPrimitiveOutputs(splitNode)
    normalizeLengthOutput(splitNode)
    return
  }

  const desired = pickDesiredDuringSync({
    restoring,
    combineNode,
    hasCombinedLink,
    cachedDesired: splitNode._miscSplitCachedDesired,
    linked: combineNode ? listLinkedWithResolvedTypes(combineNode) : [],
    stored: combineNode ? getStoredPrimitiveSlotTypes(combineNode) : null,
  })
  const desiredCount = desired.length

  while (countPrimitiveDataOutputs(splitNode) < desiredCount) {
    const idx = countPrimitiveDataOutputs(splitNode)
    const slot = desired[idx]
    if (!slot) {
      break
    }
    addPrimitiveOutputBeforeLength(splitNode, formatTypedOutputName(slot.type, idx), slot.type)
  }

  while (countPrimitiveDataOutputs(splitNode) > desiredCount) {
    const removeIndex = countPrimitiveDataOutputs(splitNode) - 1
    const output = splitNode.outputs[removeIndex]

    if (restoring) {
      break
    }
    if (output?.links?.length) {
      break
    }
    splitNode.removeOutput(removeIndex)
  }

  for (let i = 0; i < desiredCount; i++) {
    const output = splitNode.outputs[i]
    if (!output) {
      break
    }

    const want = desired[i]
    if (!want) {
      continue
    }

    const typedName = formatTypedOutputName(want.type, i)
    if (output.name !== typedName) {
      output.name = typedName
    }

    if (restoring) {
      output.type = PRIMITIVE_SLOT_TYPE
    } else {
      output.type = reconcilePrimitiveSlotType(output.type, want.type)
    }

    output.label = output.name
  }

  ensureSplitOutputLabels(splitNode)
  syncNodeSizeToContent(splitNode)
}

function initSplitRestoreState(node) {
  node._miscSplitGraphReady = true
  node._miscSplitRestoringUntil = 0
  node._miscSplitCachedOutputs = null
  node._miscSplitCachedDesired = null
}

function setupSplitPrimitives(nodeType) {
  const onDrawForeground = nodeType.prototype.onDrawForeground

  attachStabilizeHooks(nodeType, {
    configureStabilize: "none",
    afterBind(node) {
      initSplitRestoreState(node)
      syncPrimitivesLinkSlot(getCombinedInput(node))
    },
    afterStabilizeOnCreate(node) {
      scheduleStabilizeRetries(node, [80])
    },
    onConfigure(node) {
      initSplitRestoreState(node)
      node._miscSplitRestoringUntil = Date.now() + MISC_GRAPH_RESTORE_WINDOW_MS
      node._miscSplitCachedOutputs = collectExistingOutputSnapshot(node)
      node._miscSplitCachedDesired = node._miscSplitCachedOutputs
        ? node._miscSplitCachedOutputs.map((s) => ({ name: s.name, type: s.type }))
        : null
      applySnapshotPlaceholders(node, node._miscSplitCachedOutputs)
      node.stabilize()
      scheduleStabilizeRetries(node, [80, 200, 500, 1200], { doubleRaf: true })
    },
    onConnectionsChange(node, type, slotIndex, isConnected, _linkInfo, ioSlot) {
      if (ioSlot && node.outputs?.includes(ioSlot)) {
        return false
      }
      if (type === IoDirection.OUTPUT) {
        return false
      }
      if (!node._miscSplitGraphReady) {
        return false
      }
      const slot = ioSlot ?? node.inputs?.[slotIndex]
      if (type === IoDirection.INPUT && isConnected && slot?.name === "combined") {
        const combineNode = findLinkedCombineNode(node, COMBINE_NODE_CLASS)
        combineNode?.stabilize?.()
        node.stabilize()
        scheduleStabilizeRetries(node, [80])
        return false
      }
    },
    onConnectionsChainChange(node) {
      if (!node._miscSplitGraphReady) {
        return false
      }
    },
  })

  nodeType.prototype.onDrawForeground = function (ctx) {
    onDrawForeground?.call(this, ctx)
    if (this._miscSplitGraphReady) {
      ensureSplitOutputLabels(this)
    }
  }

  nodeType.prototype.stabilize = function () {
    if (!this._miscSplitGraphReady) {
      return
    }

    syncPrimitivesLinkSlot(getCombinedInput(this))

    const combineNode = findLinkedCombineNode(this, COMBINE_NODE_CLASS)
    const restoring = Date.now() < (this._miscSplitRestoringUntil || 0)
    syncSplitFromCombine(this, combineNode)

    if (restoring && combineNode && this._miscSplitCachedOutputs) {
      const current = collectExistingOutputSnapshot(this)
      const cached = this._miscSplitCachedOutputs
      const differs =
        current.length !== cached.length ||
        current.some((s, i) => s.name !== cached[i]?.name || s.type !== cached[i]?.type)
      if (differs) {
        requestAnimationFrame(() => this.scheduleStabilize(0))
      }
    }

    syncNodeSizeToContent(this)
  }
}

app.registerExtension({
  name: "comfyui-misc.SplitPrimitives",
  init() {
    patchRelayNodeConnectionCallbacks()
  },
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== NODE_CLASS) {
      return
    }

    nodeData.input = nodeData.input ?? {}
    nodeData.input.required = {
      ...(nodeData.input.required ?? {}),
      combined: [PRIMITIVES_TYPE],
    }

    nodeData.output = [PRIMITIVE_SLOT_TYPE, "INT"]
    nodeData.output_name = ["primitive_01", "length"]

    setupSplitPrimitives(nodeType)
  },
})
