/**
 * コピー＆ペースト / ワークフロー復元時の接続維持（ComfyUI 非依存）
 */

import { remapInputTargetSlot } from "./input-slot-remap.js";
import { pickDesiredDuringSync } from "./split-primitives-names.js";

export { pickDesiredDuringSync, remapInputTargetSlot };

/**
 * Split: 復元猶予中に接続済みデータ出力を removeOutput しない。
 *
 * @param {boolean} restoring
 * @param {boolean} outputHasLinks
 * @returns {boolean}
 */
export function shouldBlockSplitOutputRemoval(restoreing, outputHasLinks) {
    return restoreing || outputHasLinks;
}

/**
 * Split: 復元中に余分なデータ出力を削除してよいか。
 *
 * @param {object} params
 * @param {boolean} params.restoring
 * @param {boolean} params.outputHasLinks
 * @param {number} params.currentCount
 * @param {number} params.desiredCount
 */
export function canRemoveExcessSplitOutput({ restoring, outputHasLinks, currentCount, desiredCount }) {
    if (currentCount <= desiredCount) {
        return false;
    }
    if (shouldBlockSplitOutputRemoval(restoring, outputHasLinks)) {
        return false;
    }
    return true;
}

/**
 * Split: 復元中に Combine 未確定でも combined リンクとキャッシュがあれば構成を維持する。
 */
export function shouldHoldSplitOutputsWithoutCombine(restoreing, combineNode, hasCombinedLink, cachedDesired) {
    return Boolean(restoreing && !combineNode && hasCombinedLink && cachedDesired?.length);
}

/**
 * Any Output Switch: 接続済み data 出力は末尾整理で削除しない。
 *
 * @param {boolean} outputHasLinks
 * @returns {boolean}
 */
export function shouldBlockDataOutputRemoval(outputHasLinks) {
    return outputHasLinks;
}

export { shouldSkipAnyOutputDataRemoval } from "./any-output-switch-restore.js";

/**
 * index 出力を末尾へ移すとき、origin 側リンクの origin_slot を更新する。
 *
 * @param {object} link
 * @param {number} nodeId
 * @param {number} newIndexSlot
 * @returns {object}
 */
export function remapOriginSlotToIndexOutput(link, nodeId, newIndexSlot) {
    if (link?.origin_id !== nodeId) {
        return link;
    }
    return { ...link, origin_slot: newIndexSlot };
}

/**
 * data 出力を index 手前に挿入したあと、index より後ろだった origin_slot を 1 つ詰める。
 *
 * @param {object} link
 * @param {number} nodeId
 * @param {number} removedSlot
 * @returns {object}
 */
export function decrementOriginSlotAfterOutputRemoved(link, nodeId, removedSlot) {
    if (link?.origin_id === nodeId && link.origin_slot > removedSlot) {
        return { ...link, origin_slot: link.origin_slot - 1 };
    }
    return link;
}

/**
 * Any Switch: select_index を末尾へ移したあと、入力リンクの target_slot が有効か検証。
 *
 * @param {Array<{ name?: string }>} inputs - 並べ替え後
 * @param {Array<{ target_id: number, target_slot: number }>} linksToNode
 * @param {number} nodeId
 * @param {number} fromIndex
 * @param {number} newIndex
 * @returns {boolean}
 */
export function verifyInputLinksAfterSelectIndexMove(inputs, linksToNode, nodeId, fromIndex, newIndex) {
    for (const link of linksToNode) {
        if (link.target_id !== nodeId) {
            continue;
        }
        const remapped = remapInputTargetSlot(fromIndex, newIndex, link.target_slot);
        const slot = inputs[remapped];
        if (!slot?.name) {
            return false;
        }
    }
    return true;
}

/**
 * ペースト後グラフ: 各リンクが参照するスロット名を解決できるか。
 *
 * @param {object} params
 * @param {Array<{ name?: string }>} params.inputs
 * @param {Array<{ name?: string, links?: number[] }>} params.outputs
 * @param {Record<string|number, { origin_id?: number, origin_slot?: number, target_id?: number, target_slot?: number }>} params.links
 * @returns {boolean}
 */
export function verifyGraphLinksResolve({ inputs, outputs, links }) {
    for (const link of Object.values(links ?? {})) {
        if (link.target_id != null) {
            const slot = inputs[link.target_slot];
            if (!slot) {
                return false;
            }
        }
        if (link.origin_id != null) {
            const out = outputs[link.origin_slot];
            if (!out) {
                return false;
            }
        }
    }
    return true;
}
