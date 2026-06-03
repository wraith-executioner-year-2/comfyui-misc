/**
 * debounce 済み stabilize を短い間隔で再実行（リンク復元順のばらつきを吸収）。
 *
 * @param {object} node - scheduleStabilize(ms) を持つノード
 * @param {number[]} [delaysMs=[80, 200, 500]]
 * @param {{ doubleRaf?: boolean }} [options]
 */
export function scheduleStabilizeRetries(node, delaysMs = [80, 200, 500], options = {}) {
  const kick = () => {
    if (!node.removed) {
      node.scheduleStabilize(0);
    }
  };

  kick();
  if (options.doubleRaf) {
    requestAnimationFrame(() => requestAnimationFrame(kick));
  } else {
    requestAnimationFrame(kick);
  }
  for (const ms of delaysMs) {
    setTimeout(kick, ms);
  }
}
