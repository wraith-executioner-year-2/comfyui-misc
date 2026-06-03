/** Any Switch (misc) */

import { app } from "../../scripts/app.js";
import {
  attachStabilizeHooks,
  IoDirection,
  SELECT_INDEX_DEFAULT,
  SELECT_INDEX_KEY,
  countAnySwitchInputs,
  followConnectionUntilType,
  propagatePrimitiveSplitSync,
  slotLabelForLinkType,
  syncSelectIndexWidget
} from "./utils.js";
import {
  moveSelectIndexInputToEnd,
  rerouteNonIntLinkFromSelectIndex
} from "./utils/any-switch-input-order.js";
import { ANY_SWITCH_DATA_OUTPUT_SLOT, getDesiredAnyInputCount } from "./logic/any-switch-inputs.js";

const NODE_CLASS = "Any Switch (misc)";
const MIN_ANY_INPUTS = 1;

const DEFAULT_ANY_INPUTS = Object.fromEntries(
  Array.from({ length: MIN_ANY_INPUTS }, (_, i) => [`any_${String(i + 1).padStart(2, "0")}`, ["*"]])
);

function applyOutputLabels(output, nodeType, connectedType) {
  const primitivesLabel = slotLabelForLinkType(nodeType);
  if (primitivesLabel) {
    output.label = primitivesLabel;
    return;
  }
  output.label =
    nodeType === "RGTHREE_CONTEXT"
      ? "CONTEXT"
      : Array.isArray(nodeType) || nodeType.includes(",")
        ? connectedType?.label || String(nodeType)
        : String(nodeType);
}

function setupMiscAnySwitch(nodeType) {
  attachStabilizeHooks(nodeType, {
    afterBind(node) {
      node.nodeType = null;
      node.properties = node.properties ?? {};
      if (node.properties.select_index == null) {
        node.properties.select_index = SELECT_INDEX_DEFAULT;
      }
      if (!node.inputs.some((inp) => inp.name?.startsWith("any_"))) {
        node.addAnyInput(MIN_ANY_INPUTS);
      }
      moveSelectIndexInputToEnd(node);
    },
    onConfigure(node) {
      moveSelectIndexInputToEnd(node);
    },
    onConnectionsChange(node, type, slotIndex, isConnected, _linkInfo, ioSlot) {
      if (
        type === IoDirection.INPUT &&
        isConnected &&
        (ioSlot?.name === SELECT_INDEX_KEY || node.inputs[slotIndex]?.name === SELECT_INDEX_KEY)
      ) {
        rerouteNonIntLinkFromSelectIndex(node, slotIndex);
        moveSelectIndexInputToEnd(node);
      }
    }
  });

  nodeType.prototype.addAnyInput = function (num = 1) {
    for (let i = 0; i < num; i++) {
      const next = countAnySwitchInputs(this) + 1;
      this.addInput(`any_${String(next).padStart(2, "0")}`, this.nodeType || "*");
    }
  };

  nodeType.prototype.syncAnyInputCount = function () {
    const desired = getDesiredAnyInputCount(this.inputs, MIN_ANY_INPUTS);

    while (countAnySwitchInputs(this) > desired) {
      for (let i = this.inputs.length - 1; i >= 0; i--) {
        if (this.inputs[i]?.name?.startsWith("any_")) {
          this.removeInput(i);
          break;
        }
      }
    }

    while (countAnySwitchInputs(this) < desired) {
      this.addAnyInput(1);
    }
  };

  nodeType.prototype.stabilize = function () {
    moveSelectIndexInputToEnd(this);
    this.syncAnyInputCount();

    let connectedType = null;
    for (let i = 0; i < this.inputs.length; i++) {
      const input = this.inputs[i];
      if (!input?.name?.startsWith("any_")) {
        continue;
      }
      connectedType = followConnectionUntilType(this, IoDirection.INPUT, i, true);
      if (connectedType) {
        break;
      }
    }
    if (!connectedType) {
      connectedType = followConnectionUntilType(this, IoDirection.OUTPUT, ANY_SWITCH_DATA_OUTPUT_SLOT, true);
    }

    this.nodeType = connectedType?.type || "*";
    for (const input of this.inputs) {
      if (input.name === SELECT_INDEX_KEY) {
        input.type = "INT";
        continue;
      }
      if (input.name?.startsWith("any_")) {
        input.type = this.nodeType;
        const label = slotLabelForLinkType(this.nodeType);
        input.label = label ?? input.name;
      }
    }
    for (let i = 0; i < this.outputs.length; i++) {
      const output = this.outputs[i];
      if (i === 0) {
        output.type = this.nodeType;
        applyOutputLabels(output, this.nodeType, connectedType);
      } else {
        output.type = "INT";
        output.label = "index";
      }
    }

    syncSelectIndexWidget(this, (node) => countAnySwitchInputs(node) - 2);

    propagatePrimitiveSplitSync(this);
  };
}

app.registerExtension({
  name: "comfyui-misc.AnySwitch",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== NODE_CLASS) {
      return;
    }

    nodeData.input = nodeData.input ?? {};
    nodeData.input.required = {
      ...(nodeData.input.required ?? {}),
      select_index: ["INT", { default: -1, min: -1, max: 4096 }]
    };
    nodeData.input.optional = {
      ...(nodeData.input.optional ?? {}),
      ...DEFAULT_ANY_INPUTS
    };
    nodeData.output = ["*", "INT"];
    nodeData.output_name = ["*", "index"];

    setupMiscAnySwitch(nodeType);
  }
});
