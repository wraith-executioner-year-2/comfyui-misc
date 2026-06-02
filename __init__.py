"""
comfyui-misc カスタムノードパッケージ

ComfyUI 起動時にこのファイルが読み込まれ、NODE_CLASS_MAPPINGS に
登録されたノードがメニューに表示されます。

WEB_DIRECTORY で js/ 以下の拡張スクリプトもあわせて読み込みます。
"""

from .any_output_switch import NODE_CLASS_MAPPINGS as ANY_OUTPUT_SWITCH_MAPPINGS
from .any_output_switch import NODE_DISPLAY_NAME_MAPPINGS as ANY_OUTPUT_SWITCH_DISPLAY
from .any_switch import NODE_CLASS_MAPPINGS as ANY_SWITCH_MAPPINGS
from .any_switch import NODE_DISPLAY_NAME_MAPPINGS as ANY_SWITCH_DISPLAY
from .combine_primitives import NODE_CLASS_MAPPINGS as COMBINE_PRIMITIVES_MAPPINGS
from .combine_primitives import NODE_DISPLAY_NAME_MAPPINGS as COMBINE_PRIMITIVES_DISPLAY
from .split_primitives import NODE_CLASS_MAPPINGS as SPLIT_PRIMITIVES_MAPPINGS
from .split_primitives import NODE_DISPLAY_NAME_MAPPINGS as SPLIT_PRIMITIVES_DISPLAY

# 各ノードモジュールの登録情報を 1 つの辞書にまとめる。
# 後ろに書いたものほど優先されるが、このパッケージでは重複キーは想定していない。
NODE_CLASS_MAPPINGS = {
    **ANY_SWITCH_MAPPINGS,
    **ANY_OUTPUT_SWITCH_MAPPINGS,
    **COMBINE_PRIMITIVES_MAPPINGS,
    **SPLIT_PRIMITIVES_MAPPINGS,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    **ANY_SWITCH_DISPLAY,
    **ANY_OUTPUT_SWITCH_DISPLAY,
    **COMBINE_PRIMITIVES_DISPLAY,
    **SPLIT_PRIMITIVES_DISPLAY,
}

# フロントエンド用 JS（any_switch.js など）の置き場所
WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
