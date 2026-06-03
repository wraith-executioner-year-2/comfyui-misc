# comfyui-misc

![](https://files.catbox.moe/d86cxg.png)
![](https://files.catbox.moe/32mwi2.png)

ComfyUI custom nodes focused on small utility workflows.

## Nodes

### 1) Any Switch (misc)
Selects one value from dynamic `any_01`, `any_02`, ... inputs.

- **Input**
  - `select_index` (`INT`):
    - `-1`: automatically choose the first non-empty `any_*` input
    - `0` or higher: force selection of `any_{index+1}`
  - `any_01`, `any_02`, ... (`*`): dynamic optional inputs
- **Output**
  - `*`: selected value
  - `index` (`INT`): selected input index (0-based)

**How to use**
1. Connect multiple candidates to `any_*` inputs.
2. Keep `select_index=-1` for auto mode, or set a number for fixed mode.
3. Use `index` when downstream nodes need to know which branch was chosen.

---

### 2) Any Output Switch (misc)
Routes one input to one of dynamic outputs `any_01`, `any_02`, ...

- **Input**
  - `input` (`*`): value to route
  - `select_index` (`INT`):
    - `-1`: route to the first connected output slot
    - `0` or higher: force route to `any_{index+1}`
- **Output**
  - `any_01`, `any_02`, ... (`*`): dynamic outputs (only one is active)
  - `index` (`INT`): selected output index (0-based)

**How to use**
1. Connect `input` from an upstream node.
2. Connect each destination node to desired `any_*` outputs.
3. Choose auto mode (`-1`) or fixed mode (`>=0`) with `select_index`.

---

### 3) Combine Primitives (misc)
Combines primitive values into a single `combined` package.

- **Supported primitive types**
  - `INT`, `FLOAT`, `STRING`, `BOOLEAN`, `COMBO`
- **Input**
  - `primitive_01`, `primitive_02`, ... (`PRIMITIVE`) dynamic optional inputs
- **Output**
  - `combined` (`PRIMITIVES`)
  - `length` (`INT`): number of packed primitive values

**How to use**
1. Connect primitive-producing nodes to `primitive_*` inputs.
2. Send `combined` to `Split Primitives (misc)` or another compatible node.
3. Use `length` for loops/validation.

---

### 4) Split Primitives (misc)
Unpacks `combined` produced by `Combine Primitives (misc)`.

- **Input**
  - `combined` (`PRIMITIVES`)
- **Output**
  - `INT_01`, `FLOAT_02`, ... (`PRIMITIVE`) dynamic outputs (typed names)
  - `length` (`INT`)

**How to use**
1. Connect `combined` from `Combine Primitives (misc)` (creating Split from the `combined` output search also syncs correctly).
2. Connect downstream primitive consumers to typed outputs such as `INT_01`.
3. Output slots auto-sync with upstream combine connections (even through relay nodes such as `Any Switch (misc)` and `Reroute`).
4. On workflow load / copy-paste restore, output links are preserved first and type-specific sync is applied after graph restoration settles.

## Installation

1. Place this folder under `ComfyUI/custom_nodes/comfyui-misc`.
2. Restart ComfyUI.
3. Node category: `misc`.

## Notes

- Dynamic slots are synchronized by JS extensions in `js/`.
- For workflow compatibility, keep ComfyUI and custom nodes up to date.

## JavaScript unit tests (no ComfyUI required)

```bash
npm install
npm test
```

Tests live under `test/js/` (one file per node) and cover regression cases for workflow load / copy-paste / slot typing. Pure logic is in `js/logic/`.
