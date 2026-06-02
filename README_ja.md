# comfyui-misc

![](https://files.catbox.moe/d86cxg.png)
![](https://files.catbox.moe/32mwi2.png)

小さなユーティリティ系ワークフロー向けの ComfyUI カスタムノード集です。

## ノード一覧

### 1) Any Switch (misc)
動的入力 `any_01`, `any_02`, ... から 1 つの値を選択します。

- **入力**
  - `select_index` (`INT`):
    - `-1`: 空でない最初の `any_*` 入力を自動選択
    - `0` 以上: `any_{index+1}` を強制選択
  - `any_01`, `any_02`, ... (`*`): 動的な任意入力
- **出力**
  - `*`: 選択された値
  - `index` (`INT`): 選択された入力インデックス（0始まり）

**使い方**
1. 候補を複数の `any_*` 入力に接続します。
2. 自動選択なら `select_index=-1` のまま、固定選択なら番号を設定します。
3. どの分岐が選ばれたかが必要な場合は `index` を下流で使います。

---

### 2) Any Output Switch (misc)
1つの入力を、動的出力 `any_01`, `any_02`, ... のいずれか 1 つに振り分けます。

- **入力**
  - `input` (`*`): 振り分ける値
  - `select_index` (`INT`):
    - `-1`: 接続されている最初の出力スロットへ自動振り分け
    - `0` 以上: `any_{index+1}` へ強制振り分け
- **出力**
  - `any_01`, `any_02`, ... (`*`): 動的出力（有効になるのは1本のみ）
  - `index` (`INT`): 選択された出力インデックス（0始まり）

**使い方**
1. 上流ノードから `input` に接続します。
2. 送信先ノードを `any_*` 出力へ接続します。
3. `select_index` で自動 (`-1`) か固定 (`>=0`) を選びます。

---

### 3) Combine Primitives (misc)
複数の Primitive 値を 1 つの `combined` パッケージにまとめます。

- **対応 Primitive 型**
  - `INT`, `FLOAT`, `STRING`, `BOOLEAN`, `COMBO`
- **入力**
  - `primitive_01`, `primitive_02`, ... (`PRIMITIVE`) 動的入力
- **出力**
  - `combined` (`PRIMITIVES`)
  - `length` (`INT`): パックされた Primitive 値の個数

**使い方**
1. Primitive を出すノードを `primitive_*` に接続します。
2. `combined` を `Split Primitives (misc)` など対応ノードへ渡します。
3. 個数が必要なら `length` を利用します。

---

### 4) Split Primitives (misc)
`Combine Primitives (misc)` の `combined` を分解して取り出します。

- **入力**
  - `combined` (`PRIMITIVES`)
- **出力**
  - `INT_01`, `FLOAT_02`, ... (`PRIMITIVE`) 型名付き動的出力
  - `length` (`INT`)

**使い方**
1. `Combine Primitives (misc)` の `combined` を接続します。
2. 下流の Primitive 消費ノードを `primitive_*` に接続します。
3. 出力スロットは上流 Combine の接続状況に合わせて自動同期されます（`Any Switch (misc)` や `Reroute` など中継ノード越しでも同期）。
4. ワークフロー読込み/コピー＆ペースト復元時は、まず接続維持を優先し、その後に型同期します。

## インストール

1. このフォルダを `ComfyUI/custom_nodes/comfyui-misc` に配置します。
2. ComfyUI を再起動します。
3. ノードカテゴリは `misc` です。

## 補足

- 動的スロットは `js/` の拡張スクリプトで同期しています。
- ワークフロー互換性のため、ComfyUI 本体とカスタムノードは最新に保ってください。

## JavaScript 単体テスト（ComfyUI 不要）

```bash
npm install
npm test
```

テストは `test/js/` にノードごとに配置しています。純粋ロジックは `js/logic/` にあり、読込み・コピペ・型同期の回帰を検証します。
