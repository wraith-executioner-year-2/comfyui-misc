import {
    COMBINE_PRIMITIVES_NODE_CLASS,
    isPrimitivesLinkType,
    PRIMITIVE_SLOT_TYPE,
    SPLIT_PRIMITIVES_NODE_CLASS,
    isRelayNodeClass,
} from "./constants.js";
import { getNodeGraph } from "./graph-context.js";
import { getGraphLink } from "./graph-links.js";

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
            isPrimitivesLinkType(slot.type) ||
            slot.type === PRIMITIVE_SLOT_TYPE,
    );
}

function walkUpstreamForCombineNode(node, combineNodeClass, visited, graph) {
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

    const resolvedGraph = graph ?? getNodeGraph(node);
    if (!resolvedGraph) {
        return null;
    }

    for (const input of node.inputs || []) {
        if (!input?.link) {
            continue;
        }
        const link = getGraphLink(resolvedGraph, input.link);
        if (!link) {
            continue;
        }
        const upstream = resolvedGraph.getNodeById(link.origin_id);
        const found = walkUpstreamForCombineNode(upstream, combineNodeClass, visited, resolvedGraph);
        if (found) {
            return found;
        }
    }
    return null;
}

export function findDownstreamSplitNodes(node, splitNodeClass, visited, graph) {
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

    const resolvedGraph = graph ?? getNodeGraph(node);
    if (!resolvedGraph) {
        return [];
    }

    const splits = [];
    for (const output of node.outputs || []) {
        if (!output?.links?.length) {
            continue;
        }
        for (const linkId of output.links) {
            const link = getGraphLink(resolvedGraph, linkId);
            if (!link) {
                continue;
            }
            const target = resolvedGraph.getNodeById(link.target_id);
            splits.push(...findDownstreamSplitNodes(target, splitNodeClass, visited, resolvedGraph));
        }
    }
    return splits;
}

export function notifyDownstreamSplitNodes(combineNode, splitNodeClass) {
    const combinedOutput = combineNode.outputs?.find((o) => o.name === "combined");
    if (!combinedOutput?.links?.length) {
        return;
    }

    const graph = getNodeGraph(combineNode);
    if (!graph) {
        return;
    }

    const visited = new Set([combineNode.id]);
    const notified = new Set();

    for (const linkId of combinedOutput.links) {
        const link = getGraphLink(graph, linkId);
        if (!link) {
            continue;
        }
        const target = graph.getNodeById(link.target_id);
        for (const split of findDownstreamSplitNodes(target, splitNodeClass, visited, graph)) {
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

    const graph = getNodeGraph(fromNode);
    const visitedDown = new Set();
    for (const split of findDownstreamSplitNodes(fromNode, splitNodeClass, visitedDown, graph)) {
        split.scheduleStabilize?.();
    }

    const combine = walkUpstreamForCombineNode(fromNode, combineNodeClass, new Set(), graph);
    if (combine) {
        notifyDownstreamSplitNodes(combine, splitNodeClass);
    }
}

export function findLinkedCombineNode(splitNode, combineNodeClass) {
    const input = splitNode.inputs?.find((inp) => inp.name === "combined");
    if (!input?.link) {
        return null;
    }

    const graph = getNodeGraph(splitNode);
    if (!graph) {
        return null;
    }

    const link = getGraphLink(graph, input.link);
    if (!link) {
        return null;
    }

    const origin = graph.getNodeById(link.origin_id);
    if (!origin) {
        return null;
    }
    if (isNodeClass(origin, combineNodeClass)) {
        return origin;
    }
    return walkUpstreamForCombineNode(origin, combineNodeClass, new Set([splitNode.id]), graph);
}
