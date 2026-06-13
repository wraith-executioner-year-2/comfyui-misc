"""
Any Switch (misc)

複数の入力 any_01, any_02 … のうち、最初に「中身がある」入力だけを
1本の出力に渡します。あわせてその入力の番号（0始まり）を INT で出します。

rgthree の Any Switch をベースに、インデックス出力を追加したノードです。
"""

from ..utils import FlexibleOptionalInputType, any_type, get_category, get_name, is_context_empty

# ノード検索の型フィルタ（LATENT 等）が optional の宣言を参照するため、初期スロットを登録する
# 初期表示は any_01 の1本（接続に応じて any_02 … が増える）
_ANY_SWITCH_OPTIONAL_SEED = {
    "any_01": (any_type,),
}


def is_none(value):
    """
    スイッチ対象として「空」とみなすかどうかを判定します。

    None のほか、rgthree CONTEXT で中身がすべて None のものも空扱いです。

    Args:
        value: 入力スロットから渡された値

    Returns:
        空なら True
    """
    if value is not None:
        # rgthree CONTEXT は dict なので、単純な `is None` だけでは空判定できない。
        # model/clip の実体が空かどうかまで見る。
        if isinstance(value, dict) and "model" in value and "clip" in value:
            return is_context_empty(value)
    return value is None


def _input_index(key: str) -> int:
    """
    スロット名 any_03 → インデックス 2（0始まり）に変換します。

    Args:
        key: any_XX 形式のキー名

    Returns:
        0始まりのインデックス
    """
    return int(key.split("_", 1)[1]) - 1


class MiscAnySwitch:
    """
    動的な Any Switch ノード（Python 側の実装）。

    画面上の any_* 入力のうち、最初に非空のものを * 出力へ、
    その番号を index 出力へ渡します。
    """

    # ComfyUI がノード一覧で使う内部名・表示名
    NAME = get_name("Any Switch")
    CATEGORY = get_category()

    @classmethod
    def INPUT_TYPES(cls):  # pylint: disable=invalid-name
        """入力定義。optional は FlexibleOptionalInputType で any_* を無制限に受け付ける。"""
        return {
            "required": {
                "select_index": ("INT", {"default": -1, "min": -1, "max": 4096}),
            },
            "optional": FlexibleOptionalInputType(any_type, data=_ANY_SWITCH_OPTIONAL_SEED),
        }

    RETURN_TYPES = (any_type, "INT")
    RETURN_NAMES = ("*", "index")
    FUNCTION = "switch"

    def switch(self, select_index=-1, **kwargs):
        """
        実行時に呼ばれる本体。

        select_index >= 0 のときは any_{index+1:02d} を常に採用します。
        -1 のときは従来どおり、最初の非空 any_* 入力を選びます。

        Returns:
            (選ばれた値, 0始まりインデックス)。どれも無ければ (None, -1)
        """
        if select_index is not None and select_index >= 0:
            key = f"any_{select_index + 1:02d}"
            value = kwargs.get(key) if key in kwargs else None
            return (value, select_index)

        any_value = None
        selected_index = -1
        for key, value in kwargs.items():
            if key.startswith("any_") and not is_none(value):
                any_value = value
                selected_index = _input_index(key)
                break
        return (any_value, selected_index)


# ComfyUI がカスタムノードを読み込むときに参照する辞書
NODE_CLASS_MAPPINGS = {
    MiscAnySwitch.NAME: MiscAnySwitch,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    MiscAnySwitch.NAME: MiscAnySwitch.NAME,
}
