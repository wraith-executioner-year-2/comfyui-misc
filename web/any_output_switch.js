/** Any Output Switch (misc) */

import { app } from "../../scripts/app.js"
import {
  minDataOutputsForRestore,
  shouldSkipAnyOutputDataRemoval,
} from "./logic/any-output-switch-restore.js"
import { MISC_GRAPH_RESTORE_WINDOW_MS } from "./logic/restore-window.js"
import {
  computeAnyOutputSelectIndexMax,
  nodeHasTrailingEmptyDataOutput,
} from "./logic/select-index-bounds.js"
import {
  collectDataOutputSnapshot,
  collectLinkedDataOriginSlots,
  remapAnyOutputSwitchPastedLinks,
} from "./utils/any-output-switch-restore.js"
import {
  attachStabilizeHooks,
  INDEX_OUTPUT_NAME,
  IoDirection,
  SELECT_INDEX_DEFAULT,
  SELECT_INDEX_KEY,
  addDataOutputBeforeIndex,
  countDataOutputs,
  ensureIndexOutput,
  ensureMinimumDataOutputs,
  followConnectionUntilType,
  getDataOutputNamePrefix,
  getIndexOutputSlotIndex,
  isPrimitivesLinkType,
  scheduleStabilizeRetries,
  slotLabelForLinkType,
  syncPrimitivesLinkSlot,
  propagatePrimitiveSplitSync,
  removeUnusedDataOutputsFromEnd,
  renumberDataOutputs,
  syncSelectIndexWidget,
} from "./utils.js"

const NODE_CLASS = "Any Output Switch (misc)"
const MIN_DATA_OUTPUTS = 1

function getMainInput(node) {
  return node.inputs?.find((inp) => inp.name === "input")
}

function resolveNodeType(node) {
  const mainInput = getMainInput(node)
  const mainIndex = mainInput ? node.inputs.indexOf(mainInput) : 0

  let connectedType = followConnectionUntilType(node, IoDirection.INPUT, mainIndex, true)
  if (!connectedType?.type || connectedType.type === "*") {
    for (let i = 0; i < countDataOutputs(node); i++) {
      connectedType = followConnectionUntilType(node, IoDirection.OUTPUT, i, true)
      if (connectedType?.type && connectedType.type !== "*") {
        break
      }
    }
  }
  return connectedType?.type || "*"
}

function setupMiscAnyOutputSwitch(nodeType) {
  nodeType.prototype.serialize_widgets = true

  attachStabilizeHooks(nodeType, {
    configureStabilize: "none",
    afterBind(node) {
      node.nodeType = "*"
      node.properties = node.properties ?? {}
      if (node.properties.select_index == null) {
        node.properties.select_index = SELECT_INDEX_DEFAULT
      }
      const prefix = getDataOutputNamePrefix(node.nodeType)
      ensureMinimumDataOutputs(node, MIN_DATA_OUTPUTS, prefix, node.nodeType)
      node._miscAnyOutputRestoringUntil = 0
      node._miscAnyOutputCachedOutputs = null
    },
    onConfigure(node) {
      node._miscAnyOutputRestoringUntil = Date.now() + MISC_GRAPH_RESTORE_WINDOW_MS
      node._miscAnyOutputCachedOutputs = collectDataOutputSnapshot(node)
      ensureIndexOutput(node)
      remapAnyOutputSwitchPastedLinks(node)
      node.stabilize()
      scheduleStabilizeRetries(node)
    },
    onConnectionsChange(node, type) {
      if (app.configuringGraph) {
        return false
      }
      const restoring = Date.now() < (node._miscAnyOutputRestoringUntil || 0)
      if (restoring && type === IoDirection.OUTPUT) {
        return false
      }
    },
    onConnectionsChainChange() {
      if (app.configuringGraph) {
        return false
      }
    },
  })

  nodeType.prototype.stabilize = function () {
    if (this.removed) {
      return
    }

    this.nodeType = resolveNodeType(this)
    const prefix = getDataOutputNamePrefix(this.nodeType)

    const mainInput = getMainInput(this)
    if (mainInput && isPrimitivesLinkType(this.nodeType)) {
      syncPrimitivesLinkSlot(mainInput, this.nodeType)
    } else if (mainInput) {
      mainInput.type = this.nodeType
    }

    for (const input of this.inputs ?? []) {
      if (input.name === SELECT_INDEX_KEY) {
        input.type = "INT"
      }
    }

    const restoring = Date.now() < (this._miscAnyOutputRestoringUntil || 0)

    ensureIndexOutput(this)

    if (!shouldSkipAnyOutputDataRemoval(restoring)) {
      removeUnusedDataOutputsFromEnd(this, MIN_DATA_OUTPUTS, prefix)
    }

    const minData = restoring
      ? minDataOutputsForRestore({
          minDefault: MIN_DATA_OUTPUTS,
          cachedDataCount: this._miscAnyOutputCachedOutputs?.length ?? MIN_DATA_OUTPUTS,
          linkedDataOriginSlots: collectLinkedDataOriginSlots(this),
        })
      : MIN_DATA_OUTPUTS
    ensureMinimumDataOutputs(this, minData, prefix, this.nodeType)

    const lastDataPos = countDataOutputs(this) - 1
    if (lastDataPos >= 0 && this.outputs[lastDataPos]?.links?.length) {
      addDataOutputBeforeIndex(this, 1, prefix, this.nodeType)
    }

    renumberDataOutputs(this, prefix)

    const dataCount = countDataOutputs(this)
    const primitivesLabel = slotLabelForLinkType(this.nodeType)
    for (let i = 0; i < dataCount; i++) {
      const output = this.outputs[i]
      output.type = this.nodeType
      output.label = primitivesLabel ?? output.name
    }

    const indexPos = getIndexOutputSlotIndex(this)
    const indexOutput = this.outputs[indexPos]
    indexOutput.type = "INT"
    indexOutput.name = INDEX_OUTPUT_NAME
    indexOutput.label = INDEX_OUTPUT_NAME

    syncSelectIndexWidget(this, (node) => {
      const dataCount = countDataOutputs(node)
      return computeAnyOutputSelectIndexMax(
        dataCount,
        nodeHasTrailingEmptyDataOutput(node.outputs, dataCount),
      )
    })
    propagatePrimitiveSplitSync(this)
    this.graph?.setDirtyCanvas?.(true, false)
  }
}

app.registerExtension({
  name: "comfyui-misc.AnyOutputSwitch",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== NODE_CLASS) {
      return
    }

    nodeData.input = nodeData.input ?? {}
    nodeData.input.required = {
      input: ["*"],
      select_index: ["INT", { default: -1, min: -1, max: 4096 }],
      ...(nodeData.input.required ?? {}),
    }
    nodeData.output = ["*"]
    nodeData.output_is_list = [false]
    nodeData.output_name = ["any_01"]

    setupMiscAnyOutputSwitch(nodeType)
  },
})
