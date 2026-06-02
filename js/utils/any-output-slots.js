import { app } from "../../../scripts/app.js";
import { INDEX_OUTPUT_NAME } from "./constants.js";
import { formatDataOutputName } from "./naming.js";
import { createTrailingOutputHelpers } from "./trailing-output.js";

const indexTrailing = createTrailingOutputHelpers(INDEX_OUTPUT_NAME);

export const isIndexOutputSlot = indexTrailing.isMetaSlot;
export const countDataOutputs = indexTrailing.countDataSlots;
export const getIndexOutputSlotIndex = indexTrailing.getMetaIndex;

/**
 * index 出力を常に最後尾に置き、データ領域の誤った index 名をリネームします。
 *
 * @param {object} node
 */
export function ensureIndexOutput(node) {
    if (!node.outputs?.length) {
        node.addOutput(INDEX_OUTPUT_NAME, "INT");
        return;
    }

    for (let i = 0; i < node.outputs.length - 1; i++) {
        const output = node.outputs[i];
        if (output?.name === INDEX_OUTPUT_NAME) {
            output.name = formatDataOutputName("any", i + 1);
        }
    }

    let indexPos = node.outputs.findIndex((o) => o?.name === INDEX_OUTPUT_NAME);

    if (indexPos >= 0 && indexPos === node.outputs.length - 1) {
        node.outputs[indexPos].type = "INT";
        return;
    }

    const savedLinkIds = [];
    if (indexPos >= 0) {
        savedLinkIds.push(...(node.outputs[indexPos].links || []));
        for (const linkId of savedLinkIds) {
            const link = app.graph?.links?.[linkId];
            if (link && link.origin_id === node.id && link.origin_slot > indexPos) {
                link.origin_slot -= 1;
            }
        }
        node.removeOutput(indexPos);
    }

    node.addOutput(INDEX_OUTPUT_NAME, "INT");
    const newPos = node.outputs.length - 1;
    for (const linkId of savedLinkIds) {
        const link = app.graph?.links?.[linkId];
        if (link && link.origin_id === node.id) {
            link.origin_slot = newPos;
        }
    }
    node.outputs[newPos].type = "INT";
}

export function renumberDataOutputs(node, prefix = "any") {
    const end = countDataOutputs(node);
    for (let i = 0; i < end; i++) {
        node.outputs[i].name = formatDataOutputName(prefix, i + 1);
    }
}

export function ensureMinimumDataOutputs(node, minCount = 1, prefix = "any", nodeType = "*") {
    ensureIndexOutput(node);
    while (countDataOutputs(node) < minCount) {
        addDataOutputBeforeIndex(node, 1, prefix, nodeType);
    }
    renumberDataOutputs(node, prefix);
}

export function removeUnusedDataOutputsFromEnd(node, minCount = 1, prefix = "any") {
    if (node.removed) {
        return;
    }
    ensureIndexOutput(node);
    const indexPos = node.outputs.length - 1;
    for (let i = indexPos - 1; i >= minCount; i--) {
        if (!node.outputs[i]?.links?.length) {
            node.removeOutput(i);
            continue;
        }
        break;
    }
    renumberDataOutputs(node, prefix);
}

export function addDataOutputBeforeIndex(node, num = 1, prefix = "any", nodeType = "*") {
    ensureIndexOutput(node);
    for (let n = 0; n < num; n++) {
        if (!isIndexOutputSlot(node)) {
            ensureIndexOutput(node);
        }

        // 末尾 index を一度外して data を挿入する際、index 側リンクの origin_slot を保持する。
        // これをしないと、再追加後に「1つ前の data 出力」にぶら下がって見える。
        const oldIndexPos = node.outputs.length - 1;
        const indexOutput = node.outputs[oldIndexPos];
        const savedIndexLinkIds = [...(indexOutput?.links || [])];
        node.outputs.pop();

        const slotIndex = node.outputs.length + 1;
        node.addOutput(formatDataOutputName(prefix, slotIndex), nodeType || "*");
        node.addOutput(INDEX_OUTPUT_NAME, "INT");

        const newIndexPos = node.outputs.length - 1;
        for (const linkId of savedIndexLinkIds) {
            const link = app.graph?.links?.[linkId];
            if (link && link.origin_id === node.id) {
                link.origin_slot = newIndexPos;
            }
        }
    }
}

/** @deprecated addDataOutputBeforeIndex を使用 */
export function addAnyOutputBeforeIndex(node, num = 1, nodeType = "*") {
    addDataOutputBeforeIndex(node, num, "any", nodeType);
}

/** @deprecated renumberDataOutputs を使用 */
export function renumberAnyOutputs(node) {
    renumberDataOutputs(node, "any");
}

/** @deprecated removeUnusedDataOutputsFromEnd を使用 */
export function removeUnusedAnyOutputsFromEnd(node, minAnyCount = 1) {
    removeUnusedDataOutputsFromEnd(node, minAnyCount, "any");
}
