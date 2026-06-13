"""
ForEach / End ForEach (misc)

combined 内の各プリミティブを順に下流へ渡し、ループ本体の結果を再び combined にまとめる。
ComfyUI の OUTPUT_IS_LIST / INPUT_IS_LIST によるリスト実行を利用する。
"""

from comfy_execution.graph import ExecutionBlocker

from ..utils import (
    any_type,
    combined_primitives_type,
    get_category,
    get_name,
    infer_primitive_type,
    pack_combined_primitives,
    unpack_combined_primitives,
)


def _flatten_list_input(value):
    """INPUT_IS_LIST で渡る value をフラットな値列にする。"""
    if value is None:
        return []
    if isinstance(value, ExecutionBlocker):
        return []
    if isinstance(value, list):
        out = []
        for item in value:
            if isinstance(item, ExecutionBlocker):
                continue
            if isinstance(item, list):
                out.extend(_flatten_list_input(item))
            else:
                out.append(item)
        return out
    return [value]


class MiscForEach:
    """combined を展開し、ループ本体へ 1 要素ずつ渡すノード。"""

    NAME = get_name("ForEach")
    CATEGORY = get_category()

    @classmethod
    def INPUT_TYPES(cls):  # pylint: disable=invalid-name
        return {
            "required": {
                "combined": (combined_primitives_type,),
            },
        }

    RETURN_TYPES = (any_type,)
    RETURN_NAMES = ("*",)
    OUTPUT_IS_LIST = (True,)
    FUNCTION = "iterate"

    def iterate(self, combined):
        values, _types, _length = unpack_combined_primitives(combined)
        return (list(values),)


class MiscEndForEach:
    """ループ本体の出力リストを combined に再パックするノード。"""

    NAME = get_name("End ForEach")
    CATEGORY = get_category()

    @classmethod
    def INPUT_TYPES(cls):  # pylint: disable=invalid-name
        return {
            "required": {
                "value": (any_type,),
            },
        }

    RETURN_TYPES = (combined_primitives_type,)
    RETURN_NAMES = ("combined",)
    INPUT_IS_LIST = True
    FUNCTION = "collect"

    def collect(self, value):
        values = _flatten_list_input(value)
        types = tuple(infer_primitive_type(v) for v in values)
        return (pack_combined_primitives(values, types),)


NODE_CLASS_MAPPINGS = {
    MiscForEach.NAME: MiscForEach,
    MiscEndForEach.NAME: MiscEndForEach,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    MiscForEach.NAME: MiscForEach.NAME,
    MiscEndForEach.NAME: MiscEndForEach.NAME,
}
