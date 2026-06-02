/** Any Switch / Any Output Switch 共通の select_index プロパティ */

export const SELECT_INDEX_KEY = "select_index";
export const SELECT_INDEX_DEFAULT = -1;

/**
 * @param {object} node
 * @returns {number}
 */
export function countAnySwitchInputs(node) {
    return (node.inputs ?? []).filter((inp) => inp.name?.startsWith("any_")).length;
}

/**
 * select_index ウィジェットの max を更新し、値を範囲内に収めます。
 *
 * @param {object} node
 * @param {(node: object) => number} getMaxIndex
 * 動的スロット構成に合わせた最大 index を返す関数。
 * 例: 末尾に空スロットを1本持つノードでは (データスロット数 - 2) を返す。
 */
export function syncSelectIndexWidget(node, getMaxIndex) {
    const maxIndex = Math.max(-1, getMaxIndex(node));
    node.properties = node.properties ?? {};

    const selectIndexInput = node.inputs?.find((inp) => inp.name === SELECT_INDEX_KEY);
    if (selectIndexInput) {
        selectIndexInput.type = "INT";
    }

    let widget = node.widgets?.find((w) => w.name === SELECT_INDEX_KEY);
    if (!widget) {
        const initial = node.properties[SELECT_INDEX_KEY] ?? SELECT_INDEX_DEFAULT;
        widget = node.addWidget(
            "number",
            SELECT_INDEX_KEY,
            initial,
            (value) => {
                node.properties[SELECT_INDEX_KEY] = value;
            },
            { min: -1, max: maxIndex, step: 1, precision: 0 },
        );
    }

    widget.options.min = -1;
    widget.options.max = maxIndex;

    let value = Number(widget.value ?? node.properties[SELECT_INDEX_KEY] ?? SELECT_INDEX_DEFAULT);
    if (!Number.isFinite(value)) {
        value = SELECT_INDEX_DEFAULT;
    }
    value = Math.min(maxIndex, Math.max(-1, Math.trunc(value)));
    widget.value = value;
    node.properties[SELECT_INDEX_KEY] = value;
}
