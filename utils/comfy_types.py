"""ComfyUI 向けの型文字列・可変入出力ヘルパ。"""

from typing import Union

PRIMITIVE_TYPE_NAMES = frozenset({"INT", "FLOAT", "STRING", "BOOLEAN", "COMBO", "BOOL"})
PRIMITIVE_INPUT_TYPE_STR = "INT,FLOAT,STRING,BOOLEAN,COMBO"

# combine_primitives が検証に利用（後方互換の private 名）
_PRIMITIVE_TYPE_NAMES = PRIMITIVE_TYPE_NAMES


class AnyType(str):
    """どんな型とも接続可能な特殊型（pythongosssss / rgthree パターン）。"""

    def __ne__(self, __value: object) -> bool:
        return False


class FlexibleOptionalInputType(dict):
    """any_01, any_02 … のような動的 optional 入力用辞書。"""

    def __init__(self, type, data: Union[dict, None] = None):
        self.type = type
        self.data = data
        if self.data is not None:
            for k, v in self.data.items():
                self[k] = v

    def __getitem__(self, key):
        if self.data is not None and key in self.data:
            return self.data[key]
        return (self.type,)

    def __contains__(self, key):
        return True


any_type = AnyType("*")


class PrimitiveInputType(str):
    """Primitive ノード出力のみ受け付ける入力型。"""

    def __ne__(self, __value: object) -> bool:
        if __value is None:
            return True
        if isinstance(__value, (list, tuple)):
            return False
        if not isinstance(__value, str):
            return True
        if __value == combined_primitives_type:
            return True
        value_types = frozenset(part.strip() for part in __value.split(","))
        if value_types <= PRIMITIVE_TYPE_NAMES:
            return False
        if __value in PRIMITIVE_TYPE_NAMES:
            return False
        return True


class CombinedPrimitivesType(str):
    """Combine → Split 専用 combined 型（表示名 PRIMITIVES）。"""

    _LEGACY_ALIASES = frozenset({"COMBINED_PRIMITIVES", "combined"})

    def __ne__(self, __value: object) -> bool:
        if isinstance(__value, str) and (__value == str(self) or __value in self._LEGACY_ALIASES):
            return False
        return True


primitive_input_type = PrimitiveInputType(PRIMITIVE_INPUT_TYPE_STR)
combined_primitives_type = CombinedPrimitivesType("PRIMITIVES")


class ByPassNamesTuple(tuple):
    """可変出力ノード用 RETURN_NAMES（2 番目を index 固定にしない）。"""

    def __getitem__(self, index):
        if index > len(self) - 1:
            return f"any_{index + 1:02d}"
        return super().__getitem__(index)


class ByPassTypeTuple(tuple):
    """可変出力ノード用 RETURN_TYPES（未定義スロットは any_type）。"""

    def __getitem__(self, index):
        if index > len(self) - 1:
            return any_type
        return super().__getitem__(index)


class SplitReturnTypes(tuple):
    """Split Primitives 用 RETURN_TYPES（全データスロットを * 扱い）。"""

    def __getitem__(self, index):
        return any_type
