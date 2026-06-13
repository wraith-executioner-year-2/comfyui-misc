# comfyui-misc

![](https://files.catbox.moe/1w7o94.png)
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

1. `Combine Primitives (misc)` の `combined` を接続します（`combined` 出力から検索で Split を作成して接続しても同期されます）。
2. 下流の Primitive 消費ノードを `INT_01` など型名付き出力に接続します。
3. 出力スロットは上流 Combine の接続状況に合わせて自動同期されます（`Any Switch (misc)` や `Reroute` など中継ノード越しでも同期）。
4. ワークフロー読込み/コピー＆ペースト復元時は、まず接続維持を優先し、その後に型同期します。

---

### 5) ForEach (misc)

`combined` を展開し、下流ノードを要素ごとに繰り返し実行します（ComfyUI のリスト実行）。

- **入力**
  - `combined` (`PRIMITIVES`)
- **出力**
  - `*`: 各要素。接続してもラベル/型は常に `*`（型チェックなし）

**使い方**

1. `Combine Primitives (misc)` の `combined` を接続します。
2. `*` 出力を処理ノードへ通し、最後を `End ForEach (misc)` の `value` へ接続します。

---

### 6) End ForEach (misc)

ループ本体の結果を再び `combined` にまとめます。

- **入力**
  - `value` (`*`): 接続してもラベル/型は常に `*`（型チェックなし）。ループ最終ノードの出力を接続
- **出力**
  - `combined` (`PRIMITIVES`)

**使い方**

1. ループ本体の出力を `value` に接続します。
2. `combined` を `Split Primitives (misc)` へ接続します（`STRING_01` などは元の Combine 構成に同期）。

## インストール

1. `ComfyUI/custom_nodes` で次を実行します:

   ```bash
   git clone https://github.com/wraith-executioner-year-2/comfyui-misc/
   ```

2. ComfyUI を再起動します。
3. ノードカテゴリは `misc` です。

## 補足

- 動的スロットは `web/` の拡張で同期します（`attachStabilizeHooks` / `stabilize`）。
- 読込・コピペ直後はリンク復元完了までスロット削除を抑え、復元後に `stabilize()` で整理します。
- バージョン履歴は [CHANGELOG.md](CHANGELOG.md) を参照してください。

## 開発

```bash
npm install
npm test      # 単体テスト（ComfyUI 不要）
npm run format  # Prettier（JS のみ、trailing comma なし）
```

- テスト: `test/web/` は `web/` と同じ階層（例: `test/web/utils/graph_context.test.js`）
- コピペ復元の横断テスト: `test/web/logic/paste_restore.test.js`
