import {
    isAnyOutputPasteLayoutMismatch,
    listDataOutputSlotIndices,
    remapPastedLinksToNamedOutputs,
} from "../logic/any-output-switch-restore.js";
import { INDEX_OUTPUT_NAME } from "./constants.js";
import { getIndexOutputSlotIndex } from "./any-output-slots.js";
import { getNodeGraph } from "./graph-context.js";
import { forEachGraphLink } from "./graph-links.js";

/**
 * @param {object} node
 * @returns {Array<{ name: string, type?: string }>}
 */
export function collectDataOutputSnapshot(node) {
    const dataIndices = listDataOutputSlotIndices(node.outputs ?? []);
    const snapshot = [];
    for (const i of dataIndices) {
        const out = node.outputs?.[i];
        if (out?.name) {
            snapshot.push({ name: out.name, type: out.type });
        }
    }
    return snapshot;
}

/**
 * このノードの data 出力へ向かうリンクの origin_slot を収集（index より手前のみ）。
 *
 * @param {object} node
 * @returns {number[]}
 */
export function collectLinkedDataOriginSlots(node) {
    const graph = getNodeGraph(node);
    if (!graph || node.id == null) {
        return [];
    }
    const dataEnd = getIndexOutputSlotIndex(node);
    const slots = [];
    forEachGraphLink(graph, (link) => {
        if (link.origin_id !== node.id || link.origin_slot == null) {
            return;
        }
        if (link.origin_slot >= 0 && link.origin_slot < dataEnd) {
            slots.push(link.origin_slot);
        }
    });
    return slots;
}

/**
 * コピペ直後に index 位置ずれで data リンクが index に刺さるのを防ぐ。
 *
 * @param {object} node
 */
export function remapAnyOutputSwitchPastedLinks(node) {
    const outputs = node.outputs;
    if (!outputs?.length || !isAnyOutputPasteLayoutMismatch(outputs)) {
        return;
    }
    const graph = getNodeGraph(node);
    if (!graph) {
        return;
    }
    const linksFromNode = [];
    forEachGraphLink(graph, (link) => {
        if (link.origin_id === node.id) {
            linksFromNode.push(link);
        }
    });
    remapPastedLinksToNamedOutputs(outputs, linksFromNode, node.id);
}
