# Changelog

コミット一覧: [wraith-executioner-year-2/comfyui-misc](https://github.com/wraith-executioner-year-2/comfyui-misc)

## v0.0.2

### [fdf9e6f](https://github.com/wraith-executioner-year-2/comfyui-misc/commit/fdf9e6f) — :memo: スクショにワークフローが埋め込まれていなかったので修正

- README のスクリーンショットにワークフローが正しく埋め込まれるよう修正

### [d229cdd](https://github.com/wraith-executioner-year-2/comfyui-misc/commit/d229cdd) — :wrench: Add vitest

- Vitest による ComfyUI 非依存の JS 単体テストを追加（`npm test`）
- `js/logic/` に純粋ロジックを切り出し、`test/js/` にノード別テストを配置
- ComfyUI `app.js` スタブと Vitest プラグインで相対 import を解決

### [134b3d1](https://github.com/wraith-executioner-year-2/comfyui-misc/commit/134b3d1) — :bug: Combine Primitives (misc)でprimitive_01の型が固定される不具合の修正

- 入力ソケットは常に汎用プリミティブ型のまま維持し、他型（FLOAT 等）も接続可能に
- 型解決は接続を最優先（`pickResolvedPrimitiveSlotType`）
- 接続が無いときは保存済み型キャッシュをクリア

### [b60cc58](https://github.com/wraith-executioner-year-2/comfyui-misc/commit/b60cc58) — :bug: Combine の combined から Split が検索候補に出ない不具合の修正

- リンク型を Python と一致する `PRIMITIVES` に統一（JS の `"combined"` 表記を廃止）
- Split 登録時の `beforeRegisterNodeDef` で Python 定義が JS 上書きを打ち消していた問題を修正
- レガシー `"combined"` エイリアスの互換を Python / JS 双方に追加

### [be83870](https://github.com/wraith-executioner-year-2/comfyui-misc/commit/be83870) — :wrench: ExportWorkflowImage 再描画時に Split 出力名が崩れる問題

- グラフ走査を `node.graph` 優先に変更（オフスクリーン複製グラフで Combine を辿れるように）
- `onConfigure` 直後の同期 `stabilize()` と `onDrawForeground` で label を維持

### [3de2a64](https://github.com/wraith-executioner-year-2/comfyui-misc/commit/3de2a64) — :bug: combined から Any Switch 検索接続が any_01 に届かない問題

- `select_index` ソケットを維持したまま、入力順を any_* 先頭・select_index 末尾に並べ替え
- INT 以外が `select_index` に刺さった場合は `any_01` へ付け替え
- LiteGraph の `PRIMITIVES` ↔ `*` 型互換パッチを追加

### [4e0401c](https://github.com/wraith-executioner-year-2/comfyui-misc/commit/4e0401c) — :wrench: PRIMITIVES 型のノード上の表記を combined に統一

- 内部リンク型は `PRIMITIVES`、キャンバス表示は `combined` に統一（`slotLabelForLinkType`）
- Combine / Split / Any Switch / Any Output Switch のソケット表示を揃えた

### [1f26c78](https://github.com/wraith-executioner-year-2/comfyui-misc/commit/1f26c78) — :wrench: refactor: PRIMITIVESソケット同期とグラフリンク走査の共通化

- `syncPrimitivesLinkSlot` / `forEachGraphLink` を追加し重複を整理
- ノード拡張 JS のファイル先頭コメントを簡潔化

## v0.0.1

### [c989874](https://github.com/wraith-executioner-year-2/comfyui-misc/commit/c989874) — :arrow_up: v0.0.1

- Any Switch (misc) / Any Output Switch (misc) / Combine Primitives (misc) / Split Primitives (misc) を初回リリース
- README（英語・日本語）と ComfyUI-Manager 登録情報
