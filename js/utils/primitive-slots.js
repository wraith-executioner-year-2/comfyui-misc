import { app } from "../../../scripts/app.js";
import { LENGTH_OUTPUT_NAME, PRIMITIVE_SLOT_TYPE } from "./constants.js";
import { formatPrimitiveOutputLabel } from "./naming.js";
import {
    primitiveSlotTypesEqual,
    primitiveTypesCompatible,
    reconcilePrimitiveSlotType,
    resolvePrimitiveSlotType,
} from "./primitive-type.js";
import { createTrailingOutputHelpers } from "./trailing-output.js";

const lengthTrailing = createTrailingOutputHelpers(LENGTH_OUTPUT_NAME);

export const isLengthOutputSlot = lengthTrailing.isMetaSlot;
export const countPrimitiveDataOutputs = lengthTrailing.countDataSlots;
export const ensureLengthOutput = lengthTrailing.ensureMeta;

export function addPrimitiveInputs(node, num = 1, slotType = PRIMITIVE_SLOT_TYPE) {
    const primitiveInputs = node.inputs.filter((inp) => inp.name?.startsWith("primitive_"));
    let nextIndex = primitiveInputs.length + 1;
    for (let i = 0; i < num; i++) {
        node.addInput(`primitive_${String(nextIndex).padStart(2, "0")}`, slotType);
        nextIndex += 1;
    }
}

export function getConnectedPrimitiveInputs(combineNode) {
    return combineNode.inputs
        .map((inp, slotIndex) => ({ inp, slotIndex }))
        .filter(({ inp }) => inp.name?.startsWith("primitive_") && inp.link)
        .map(({ inp, slotIndex }) => ({
            name: inp.name,
            type: resolvePrimitiveSlotType(combineNode, slotIndex, inp),
            slotIndex,
        }));
}

export function getSplitDesiredOutputSlots(combineNode, splitNode) {
    return getConnectedPrimitiveInputs(combineNode).map((slot, index) => ({
        name: slot.name,
        type: reconcilePrimitiveSlotType(splitNode.outputs[index]?.type, slot.type),
    }));
}

export function getExistingPrimitiveOutputSlots(splitNode) {
    const end = countPrimitiveDataOutputs(splitNode);
    const slots = [];
    for (let i = 0; i < end; i++) {
        const output = splitNode.outputs[i];
        if (output?.name?.startsWith("primitive_")) {
            slots.push({ name: output.name, type: output.type });
        }
    }
    return slots;
}

export function addPrimitiveOutputBeforeLength(node, name, type) {
    ensureLengthOutput(node);
    if (isLengthOutputSlot(node)) {
        const lengthSlot = node.outputs.pop();
        node.addOutput(name, type);
        node.outputs.push(lengthSlot);
    } else {
        node.addOutput(name, type);
        ensureLengthOutput(node);
    }
}

export function disconnectOutputSlot(node, slotIndex) {
    const output = node.outputs?.[slotIndex];
    if (!output?.links?.length) {
        return;
    }
    const graph = app.graph;
    for (const linkId of [...output.links]) {
        const link = graph.links[linkId];
        if (!link) {
            continue;
        }
        const targetNode = graph.getNodeById(link.target_id);
        if (targetNode) {
            node.disconnectOutput(slotIndex, targetNode, link.target_slot);
        }
    }
}

export function syncSplitOutputsFromCombine(splitNode, connectedSlots, options = {}) {
    const { preserveExisting = false } = options;

    let desired = connectedSlots.map((slot) => ({
        name: slot.name,
        type: slot.type,
    }));

    if (desired.length === 0) {
        const existing = getExistingPrimitiveOutputSlots(splitNode);
        if (preserveExisting && existing.length > 0) {
            desired = existing;
        } else {
            desired = [{ name: "primitive_01", type: PRIMITIVE_SLOT_TYPE }];
        }
    }

    ensureLengthOutput(splitNode);

    while (countPrimitiveDataOutputs(splitNode) > desired.length) {
        const removeIndex = countPrimitiveDataOutputs(splitNode) - 1;
        const output = splitNode.outputs[removeIndex];
        if (output?.links?.length) {
            break;
        }
        splitNode.removeOutput(removeIndex);
    }

    while (countPrimitiveDataOutputs(splitNode) < desired.length) {
        const slot = desired[countPrimitiveDataOutputs(splitNode)];
        addPrimitiveOutputBeforeLength(splitNode, slot.name, slot.type);
    }

    for (let i = 0; i < desired.length; i++) {
        const output = splitNode.outputs[i];
        const want = desired[i];
        if (!output) {
            break;
        }

        if (output.name !== want.name) {
            output.name = want.name;
        }

        const prevType = output.type;
        const nextType = reconcilePrimitiveSlotType(prevType, want.type);
        if (!primitiveSlotTypesEqual(prevType, nextType)) {
            if (!primitiveTypesCompatible(prevType, nextType)) {
                disconnectOutputSlot(splitNode, i);
            }
            output.type = nextType;
        }

        output.label = formatPrimitiveOutputLabel(output.type, output.name);
    }

    const lengthOut = splitNode.outputs[splitNode.outputs.length - 1];
    lengthOut.type = "INT";
    lengthOut.name = LENGTH_OUTPUT_NAME;
    lengthOut.label = LENGTH_OUTPUT_NAME;
}
