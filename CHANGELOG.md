# Changelog

## v0.0.4

### [`e978159`](https://github.com/wraith-executioner-year-2/comfyui-misc/commit/e978159) — :bug: Any Switch の any_* 本数・コピペ復元・index 接続時の型

- 接続済みの最後の `any_*` + 1 本だけに入力を揃え、未使用スロットの増え続けを防止
- コピペ直後に `select_index` が先頭にあるとき、`any_*` への `target_slot` を名前基準で付け直し
- 型解決はデータ出力（スロット 0）のみを参照し、`index` 出力だけ接続しても `*` のまま維持

### [`f4e5459`](https://github.com/wraith-executioner-year-2/comfyui-misc/commit/f4e5459) — :bug: Any Output Switch のコピペで 2 本目 data 出力の接続が復元されない問題

- 復元猶予中はリンク未復元の data 出力を `removeOutput` しない
- ペースト時の出力構成をキャッシュし、`IMAGE_02` など複数 data 出力の `origin_slot` を維持
- `index` スロット位置のずれ時は `origin_slot` をスロット名基準で再マップ

### [`8bb3e91`](https://github.com/wraith-executioner-year-2/comfyui-misc/commit/8bb3e91) — :wrench: コピペ復元の共有ロジックテストを追加

- `js/logic/paste-restore.js` と `test/js/paste_restore.test.js` で 4 ノードの復元ケースを検証
- Split の重複テストを `paste_restore.test.js` に集約

## v0.0.3

### [`1054bec`](https://github.com/wraith-executioner-year-2/comfyui-misc/commit/1054bec) — :bug: Split Primitives が Combine と同期されず出力が空になる問題を修正

- 接続済み `linked` を `stored` より優先して Split の出力本数・型を決定
- `combined` 接続直後に Combine / Split を即時 `stabilize`（検索からの新規作成に対応）
- `PRIMITIVES_TYPE` の import 漏れを修正

## v0.0.2

### [`d229cdd`](https://github.com/wraith-executioner-year-2/comfyui-misc/commit/d229cdd) — :wrench: Add vitest

- Vitest による ComfyUI 非依存の JS 単体テストを追加（`npm test`）
- `js/logic/` に純粋ロジックを切り出し、`test/js/` にノード別テストを配置
- ComfyUI `app.js` スタブと Vitest プラグインで相対 import を解決

### [`134b3d1`](https://github.com/wraith-executioner-year-2/comfyui-misc/commit/134b3d1) — :bug: Combine Primitives (misc)でprimitive_01の型が固定される不具合の修正

- 入力ソケットは常に汎用プリミティブ型のまま維持し、他型（FLOAT 等）も接続可能に
- 型解決は接続を最優先（`pickResolvedPrimitiveSlotType`）
- 接続が無いときは保存済み型キャッシュをクリア

### [`b60cc58`](https://github.com/wraith-executioner-year-2/comfyui-misc/commit/b60cc58) — :bug: Combine の combined から Split が検索候補に出ない不具合の修正

- リンク型を Python と一致する `PRIMITIVES` に統一（JS の `"combined"` 表記を廃止）
- Split 登録時の `beforeRegisterNodeDef` で Python 定義が JS 上書きを打ち消していた問題を修正
- レガシー `"combined"` エイリアスの互換を Python / JS 双方に追加

### [`be83870`](https://github.com/wraith-executioner-year-2/comfyui-misc/commit/be83870) — :wrench: ExportWorkflowImage 再描画時に Split 出力名が崩れる問題

- グラフ走査を `node.graph` 優先に変更（オフスクリーン複製グラフで Combine を辿れるように）
- `onConfigure` 直後の同期 `stabilize()` と `onDrawForeground` で label を維持

### [`3de2a64`](https://github.com/wraith-executioner-year-2/comfyui-misc/commit/3de2a64) — :bug: combined から Any Switch 検索接続が any_01 に届かない問題

- `select_index` ソケットを維持したまま、入力順を any_* 先頭・select_index 末尾に並べ替え
- INT 以外が `select_index` に刺さった場合は `any_01` へ付け替え
- LiteGraph の `PRIMITIVES` ↔ `*` 型互換パッチを追加

### [`4e0401c`](https://github.com/wraith-executioner-year-2/comfyui-misc/commit/4e0401c) — :wrench: PRIMITIVES 型のノード上の表記を combined に統一

- 内部リンク型は `PRIMITIVES`、キャンバス表示は `combined` に統一（`slotLabelForLinkType`）
- Combine / Split / Any Switch / Any Output Switch のソケット表示を揃えた

### [`1f26c78`](https://github.com/wraith-executioner-year-2/comfyui-misc/commit/1f26c78) — :wrench: refactor: PRIMITIVESソケット同期とグラフリンク走査の共通化

- `syncPrimitivesLinkSlot` / `forEachGraphLink` を追加し重複を整理
- ノード拡張 JS のファイル先頭コメントを簡潔化

## v0.0.1

- Any Switch (misc) / Any Output Switch (misc) / Combine Primitives (misc) / Split Primitives (misc) を初回リリース
