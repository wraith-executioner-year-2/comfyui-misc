import { debounce } from "./debounce.js";

/**
 * stabilize / scheduleStabilize の共通ライフサイクルを nodeType に載せる。
 *
 * @param {Function} nodeType
 * @param {{
 *   afterBind?: (node: object) => void,
 *   afterStabilizeOnCreate?: (node: object) => void,
 *   onConfigure?: (node: object) => void,
 *   configureStabilize?: "schedule"|"stabilize"|"none",
 *   onConnectionsChange?: (node: object, type: number, slotIndex: number, isConnected: boolean, linkInfo: object, ioSlot: object) => boolean|void,
 *   onConnectionsChainChange?: (node: object) => boolean|void,
 *   stabilizeOnCreate?: boolean,
 *   debounceMs?: number,
 * }} [options]
 */
export function attachStabilizeHooks(nodeType, options = {}) {
  const {
    afterBind,
    afterStabilizeOnCreate,
    onConfigure,
    configureStabilize = "schedule",
    onConnectionsChange,
    onConnectionsChainChange,
    stabilizeOnCreate = true,
    debounceMs = 64
  } = options;

  const origCreated = nodeType.prototype.onNodeCreated;
  const origConfigure = nodeType.prototype.onConfigure;
  const origChange = nodeType.prototype.onConnectionsChange;
  const origChain = nodeType.prototype.onConnectionsChainChange;

  nodeType.prototype.onNodeCreated = function () {
    const result = origCreated?.apply(this, arguments);
    this.stabilizeBound = this.stabilize.bind(this);
    afterBind?.(this);
    if (stabilizeOnCreate) {
      this.stabilize();
      afterStabilizeOnCreate?.(this);
    }
    return result;
  };

  nodeType.prototype.onConfigure = function () {
    const result = origConfigure?.apply(this, arguments);
    onConfigure?.(this);
    if (configureStabilize === "schedule") {
      this.scheduleStabilize();
    } else if (configureStabilize === "stabilize") {
      this.stabilize();
    }
    return result;
  };

  nodeType.prototype.onConnectionsChange = function (type, slotIndex, isConnected, linkInfo, ioSlot) {
    origChange?.call(this, type, slotIndex, isConnected, linkInfo, ioSlot);
    if (onConnectionsChange?.(this, type, slotIndex, isConnected, linkInfo, ioSlot) === false) {
      return;
    }
    this.scheduleStabilize();
  };

  nodeType.prototype.onConnectionsChainChange = function () {
    origChain?.call(this);
    if (onConnectionsChainChange?.(this) === false) {
      return;
    }
    this.scheduleStabilize();
  };

  nodeType.prototype.scheduleStabilize = function (ms = debounceMs) {
    return debounce(this.stabilizeBound, ms);
  };
}
