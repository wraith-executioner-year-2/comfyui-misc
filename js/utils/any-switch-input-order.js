import { remapInputTargetSlot } from "../logic/input-slot-remap.js";
import { getNodeGraph } from "./graph-context.js";
import { getGraphLink } from "./graph-links.js";
import { SELECT_INDEX_KEY } from "./select-index.js";

/**
 * @param {object} graph
 * @param {(link: object, linkId?: string|number) => void} callback
 */
function forEachGraphLink(graph, callback) {
    const links = graph?.links;
    if (!links) {
        return;
    }
    if (typeof links.forEach === "function") {
        links.forEach((link, linkId) => callback(link, linkId));
        return;
    }
    for (const linkId of Object.keys(links)) {
        callback(links[linkId], linkId);
    }
}

/**
 * select_index 入力を末尾へ移し、既存リンクの target_slot を更新する。
 *
 * @param {object} node
 * @returns {boolean} 並べ替えを行った
 */
export function moveSelectIndexInputToEnd(node) {
    const inputs = node.inputs;
    if (!inputs?.length) {
        return false;
    }
    const fromIndex = inputs.findIndex((inp) => inp.name === SELECT_INDEX_KEY);
    if (fromIndex < 0) {
        return false;
    }
    const newIndex = inputs.length - 1;
    if (fromIndex >= newIndex) {
        return false;
    }

    const [selectInput] = inputs.splice(fromIndex, 1);
    inputs.push(selectInput);

    const graph = getNodeGraph(node);
    if (graph) {
        forEachGraphLink(graph, (link) => {
            if (link.target_id !== node.id) {
                return;
            }
            link.target_slot = remapInputTargetSlot(fromIndex, newIndex, link.target_slot);
        });
    }

    node.onInputsOutputsParsed?.();
    return true;
}

/**
 * select_index に INT 以外が刺さったとき any_01（最初の any_*）へ付け替える。
 *
 * @param {object} node
 * @param {number} selectSlotIndex
 */
export function rerouteNonIntLinkFromSelectIndex(node, selectSlotIndex) {
    const graph = getNodeGraph(node);
    const selectInput = node.inputs?.[selectSlotIndex];
    if (!graph || !selectInput?.link) {
        return;
    }

    const link = getGraphLink(graph, selectInput.link);
    if (!link) {
        return;
    }

    const origin = graph.getNodeById(link.origin_id);
    const originOut = origin?.outputs?.[link.origin_slot];
    const outType = originOut?.type;
    if (outType == null || outType === "INT") {
        return;
    }

    const anySlot = node.inputs.findIndex((inp) => inp.name?.startsWith("any_"));
    if (anySlot < 0 || typeof origin?.connect !== "function") {
        return;
    }

    node.disconnectInput(selectSlotIndex, false);
    origin.connect(link.origin_slot, node, anySlot);
}
