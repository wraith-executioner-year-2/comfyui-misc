import { IoDirection, isGenericPrimitiveUnionType } from "./constants.js";
import { getNodeGraph } from "./graph-context.js";
import { getGraphLink } from "./graph-links.js";

export function getSlotLinks(inputOrOutput, graph) {
    const links = [];
    if (!inputOrOutput) {
        return links;
    }
    const linksGraph = graph;
    if (!linksGraph) {
        return links;
    }
    if (inputOrOutput.links?.length) {
        for (const linkId of inputOrOutput.links) {
            const link = getGraphLink(linksGraph, linkId);
            if (link) {
                links.push({ id: linkId, link });
            }
        }
    }
    if (inputOrOutput.link) {
        const link = getGraphLink(linksGraph, inputOrOutput.link);
        if (link) {
            links.push({ id: inputOrOutput.link, link });
        }
    }
    return links;
}

function isConcretePrimitiveSlotType(type) {
    if (type == null || type === "*") {
        return false;
    }
    if (Array.isArray(type)) {
        return true;
    }
    return !isGenericPrimitiveUnionType(type);
}

function getTypeFromSlot(slot, dir, skipSelf, graph) {
    const resolvedGraph = graph;
    if (!resolvedGraph) {
        return null;
    }
    const type = slot?.type;
    if (!skipSelf && isConcretePrimitiveSlotType(type)) {
        return { type, label: slot?.label, name: slot?.name };
    }
    for (const { link } of getSlotLinks(slot, resolvedGraph)) {
        const connectedId = dir === IoDirection.OUTPUT ? link.target_id : link.origin_id;
        const connectedSlotNum = dir === IoDirection.OUTPUT ? link.target_slot : link.origin_slot;
        const connectedNode = resolvedGraph.getNodeById(connectedId);
        if (!connectedNode) {
            continue;
        }
        const connectedSlots = dir === IoDirection.OUTPUT ? connectedNode.inputs : connectedNode.outputs;
        const connectedSlot = connectedSlots[connectedSlotNum];
        if (isConcretePrimitiveSlotType(connectedSlot?.type)) {
            return {
                type: connectedSlot.type,
                label: connectedSlot?.label,
                name: connectedSlot?.name,
            };
        }
        if (connectedSlot?.type === "*" || isGenericPrimitiveUnionType(connectedSlot?.type)) {
            const nested = followConnectionUntilType(connectedNode, dir, connectedSlotNum, true);
            if (nested) {
                return nested;
            }
        }
    }
    return null;
}

export function followConnectionUntilType(node, dir, slotNum, skipSelf = false) {
    const graph = getNodeGraph(node);
    if (!graph) {
        return null;
    }
    const slots = dir === IoDirection.OUTPUT ? node.outputs : node.inputs;
    if (!slots?.length) {
        return null;
    }
    if (slotNum !== undefined && slotNum !== null) {
        if (!slots[slotNum]) {
            return null;
        }
        return getTypeFromSlot(slots[slotNum], dir, skipSelf, graph);
    }
    for (const slot of slots) {
        const type = getTypeFromSlot(slot, dir, skipSelf, graph);
        if (type) {
            return type;
        }
    }
    return null;
}

export { isConcretePrimitiveSlotType };
