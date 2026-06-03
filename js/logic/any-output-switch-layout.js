/**
 * Any Output Switch (misc) — Python any_output_switch._compute_output_layout と同等の純粋ロジック。
 * ComfyUI 非依存。単体テスト用。
 */

export const MIN_DATA_OUTPUTS = 1;

/**
 * @param {number[]} linkedSlots - このノード出力への接続スロット番号
 * @param {number} [minDataOutputs=1]
 * @returns {{ dataSlots: number[], numData: number, indexSlot: number }}
 */
export function computeOutputLayout(linkedSlots, minDataOutputs = MIN_DATA_OUTPUTS) {
  if (!linkedSlots?.length) {
    const numData = minDataOutputs;
    return { dataSlots: [], numData, indexSlot: numData };
  }

  const sortedSlots = [...new Set(linkedSlots)].sort((a, b) => a - b);
  const maxSlot = sortedSlots[sortedSlots.length - 1];

  const contiguousFromZero = sortedSlots.every((slot, i) => slot === i);
  if (contiguousFromZero) {
    const numData = Math.max(minDataOutputs, maxSlot + 1);
    return { dataSlots: sortedSlots, numData, indexSlot: numData };
  }

  if (sortedSlots.length === 1 && sortedSlots[0] === minDataOutputs) {
    const numData = minDataOutputs;
    return { dataSlots: [], numData, indexSlot: numData };
  }

  const numData = Math.max(minDataOutputs, maxSlot);
  const indexSlot = numData;
  const dataSlots = sortedSlots.filter((s) => s < indexSlot);
  return { dataSlots, numData, indexSlot };
}

/**
 * 実行結果タプルを組み立てる（ExecutionBlocker は null で表現）。
 *
 * @param {*} input
 * @param {number} selectIndex
 * @param {number[]} linkedSlots
 * @param {number} [minDataOutputs]
 * @returns {{ values: unknown[], selectedIndex: number, indexSlot: number }}
 */
export function buildSwitchOutputValues(input, selectIndex, linkedSlots, minDataOutputs = MIN_DATA_OUTPUTS) {
  const { dataSlots, numData, indexSlot } = computeOutputLayout(linkedSlots, minDataOutputs);

  let selectedIndex;
  let finalNumData = numData;

  if (selectIndex != null && selectIndex >= 0) {
    selectedIndex = selectIndex;
    finalNumData = Math.max(numData, selectedIndex + 1, minDataOutputs);
  } else {
    selectedIndex = dataSlots.length > 0 ? Math.min(...dataSlots) : -1;
  }

  const values = [];
  for (let i = 0; i < finalNumData; i++) {
    values.push(i === selectedIndex ? input : null);
  }
  values.push(selectedIndex);

  return { values, selectedIndex, indexSlot };
}
