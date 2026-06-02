import { app } from "../../../scripts/app.js";
import {
    COMBINE_PRIMITIVES_NODE_CLASS,
    PRIMITIVES_TYPE,
    PRIMITIVE_SLOT_TYPE,
    SPLIT_PRIMITIVES_NODE_CLASS,
    isRelayNodeClass,
} from "./constants.js";

export function getNodeClassName(node) {
    return node?.comfyClass || node?.type || "";
}

export function isNodeClass(node, className) {
    return getNodeClassName(node) === className;
}

export function isPrimitiveRelayNode(node) {
    if (!node) {
        return false;
    }
    const cls = getNodeClassName(node);
    if (cls.includes("Reroute") || node.type === "Reroute") {
        return true;
    }
    if (isRelayNodeClass(cls)) {
        return true;
    }
    const slots = [...(node.inputs || []), ...(node.outputs || [])];
    if (!slots.length) {
        return false;
    }
    return slots.every(
        (slot) =>
            !slot.type ||
            slot.type === "*" ||
            slot.type === PRIMITIVES_TYPE ||
            slot.type === "COMBINED_PRIMITIVES" ||
            slot.type === PRIMITIVE_SLOT_TYPE,
    );
}

function walkUpstreamForCombineNode(node, combineNodeClass, visited) {
    if (!node || visited.has(node.id)) {
        return null;
    }
    visited.add(node.id);

    if (isNodeClass(node, combineNodeClass)) {
        return node;
    }
    if (!isPrimitiveRelayNode(node)) {
        return null;
    }

    const graph = app.canvas.getCurrentGraph();
    for (const input of node.inputs || []) {
        if (!input?.link) {
            continue;
        }
        const link = app.graph.links[input.link];
        if (!link) {
            continue;
        }
        const upstream = graph.getNodeById(link.origin_id);
        const found = walkUpstreamForCombineNode(upstream, combineNodeClass, visited);
        if (found) {
            return found;
        }
    }
    return null;
}

export function findDownstreamSplitNodes(node, splitNodeClass, visited) {
    if (!node || visited.has(node.id)) {
        return [];
    }
    visited.add(node.id);

    if (isNodeClass(node, splitNodeClass)) {
        return [node];
    }
    if (!isPrimitiveRelayNode(node)) {
        return [];
    }

    const graph = app.canvas.getCurrentGraph();
    const splits = [];
    for (const output of node.outputs || []) {
        if (!output?.links?.length) {
            continue;
        }
        for (const linkId of output.links) {
            const link = app.graph.links[linkId];
            if (!link) {
                continue;
            }
            const target = graph.getNodeById(link.target_id);
            splits.push(...findDownstreamSplitNodes(target, splitNodeClass, visited));
        }
    }
    return splits;
}

export function notifyDownstreamSplitNodes(combineNode, splitNodeClass) {
    const combinedOutput = combineNode.outputs?.find((o) => o.name === "combined");
    if (!combinedOutput?.links?.length) {
        return;
    }

    const graph = app.canvas.getCurrentGraph();
    const visited = new Set([combineNode.id]);
    const notified = new Set();

    for (const linkId of combinedOutput.links) {
        const link = app.graph.links[linkId];
        if (!link) {
            continue;
        }
        const target = graph.getNodeById(link.target_id);
        for (const split of findDownstreamSplitNodes(target, splitNodeClass, visited)) {
            if (notified.has(split.id)) {
                continue;
            }
            notified.add(split.id);
            split.scheduleStabilize?.();
        }
    }
}

export function propagatePrimitiveSplitSync(
    fromNode,
    combineNodeClass = COMBINE_PRIMITIVES_NODE_CLASS,
    splitNodeClass = SPLIT_PRIMITIVES_NODE_CLASS,
) {
    if (!fromNode) {
        return;
    }

    const visitedDown = new Set();
    for (const split of findDownstreamSplitNodes(fromNode, splitNodeClass, visitedDown)) {
        split.scheduleStabilize?.();
    }

    const combine = walkUpstreamForCombineNode(fromNode, combineNodeClass, new Set());
    if (combine) {
        notifyDownstreamSplitNodes(combine, splitNodeClass);
    }
}

export function findLinkedCombineNode(splitNode, combineNodeClass) {
    const input = splitNode.inputs?.find((inp) => inp.name === "combined");
    if (!input?.link) {
        return null;
    }
    const link = app.graph.links[input.link];
    if (!link) {
        return null;
    }
    const graph = app.canvas.getCurrentGraph();
    const origin = graph.getNodeById(link.origin_id);
    if (!origin) {
        return null;
    }
    if (isNodeClass(origin, combineNodeClass)) {
        return origin;
    }
    return walkUpstreamForCombineNode(origin, combineNodeClass, new Set([splitNode.id]));
}
