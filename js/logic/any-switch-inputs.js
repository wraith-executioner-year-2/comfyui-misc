/**
 * Any Switch の可変 any_* 入力本数・型解決（ComfyUI 非依存）
 */

/** データ出力（*）のスロット番号。index 出力は INT 専用で型伝播しない */
export const ANY_SWITCH_DATA_OUTPUT_SLOT = 0;

/**
 * @param {string|undefined|null} name
 * @returns {number|null} 1始まりの any_XX 番号
 */
export function parseAnyInputIndex(name) {
    const match = /^any_(\d+)$/.exec(name ?? "");
    if (!match) {
        return null;
    }
    return Number.parseInt(match[1], 10);
}

/**
 * 接続済みの最後の any_* + 1 本（未接続なら minCount のみ）。
 *
 * @param {Array<{ name?: string, link?: unknown }>} inputs
 * @param {number} [minCount=1]
 * @returns {number}
 */
export function getDesiredAnyInputCount(inputs, minCount = 1) {
    let maxConnectedIndex = 0;

    for (const input of inputs ?? []) {
        const index = parseAnyInputIndex(input?.name);
        if (index == null) {
            continue;
        }
        if (input.link != null && index > maxConnectedIndex) {
            maxConnectedIndex = index;
        }
    }

    if (maxConnectedIndex === 0) {
        return minCount;
    }

    return Math.max(minCount, maxConnectedIndex + 1);
}
