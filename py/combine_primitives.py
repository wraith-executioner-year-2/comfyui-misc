"""
Combine Primitives (misc)

複数の Primitive 値（INT / FLOAT / STRING / BOOLEAN / COMBO）を
1 つの combined オブジェクトにまとめ、入力数を length で出力します。
"""

from ..utils import (
    FlexibleOptionalInputType,
    _PRIMITIVE_TYPE_NAMES,
    combined_primitives_type,
    get_category,
    get_name,
    infer_primitive_type,
    output_type_for_link,
    pack_combined_primitives,
    primitive_input_type,
)

MIN_PRIMITIVE_INPUTS = 1

_PRIMITIVE_OPTIONAL_SEED = {
    "primitive_01": (primitive_input_type,),
}


def _primitive_sort_key(key: str) -> int:
    """primitive_03 -> 3 のように末尾番号を取り出す。"""
    return int(key.split("_", 1)[1])


def _collect_primitive_inputs(prompt, unique_id, kwargs):
    """
    primitive_* 入力をスロット番号順に集め、値と型のリストを返します。

    入力値は kwargs に入ってくるため、ここでは kwargs に存在する primitive_* だけを見る。
    型情報は可能なら prompt 内リンクから取得し、無ければ値から推定する。
    """
    keys = sorted(
        (k for k in kwargs if k.startswith("primitive_")),
        key=_primitive_sort_key,
    )
    values = []
    types = []
    node_inputs = {}
    if prompt is not None and unique_id is not None:
        node_inputs = prompt.get(str(unique_id), {}).get("inputs", {})

    for key in keys:
        value = kwargs[key]
        if value is None:
            continue
        values.append(value)
        link = node_inputs.get(key)
        if isinstance(link, list) and len(link) == 2:
            types.append(output_type_for_link(prompt, link))
        else:
            types.append(infer_primitive_type(value))
    return values, types


class MiscCombinePrimitives:
    """可変長 Primitive 入力を combined にまとめるノード。"""

    NAME = get_name("Combine Primitives")
    CATEGORY = get_category()

    @classmethod
    def INPUT_TYPES(cls):  # pylint: disable=invalid-name
        return {
            "required": {},
            "optional": FlexibleOptionalInputType(
                primitive_input_type,
                data=_PRIMITIVE_OPTIONAL_SEED,
            ),
            "hidden": {
                "prompt": "PROMPT",
                "unique_id": "UNIQUE_ID",
            },
        }

    RETURN_TYPES = (combined_primitives_type, "INT")
    RETURN_NAMES = ("combined", "length")
    FUNCTION = "combine"

    @classmethod
    def VALIDATE_INPUTS(cls, input_types=None, **kwargs):
        """COMBO リスト出力なども許可しつつ、非 Primitive 型の接続を拒否します。"""
        types_map = input_types
        if isinstance(types_map, list) and types_map and isinstance(types_map[0], dict):
            types_map = types_map[0]
        if not isinstance(types_map, dict):
            return True
        for key, received in types_map.items():
            if not key.startswith("primitive_"):
                continue
            if isinstance(received, (list, tuple)):
                continue
            if not isinstance(received, str):
                return f"{key}: only primitive types may be connected"
            parts = frozenset(part.strip() for part in received.split(","))
            if parts <= _PRIMITIVE_TYPE_NAMES or received in _PRIMITIVE_TYPE_NAMES:
                continue
            return f"{key}: only primitive types may be connected ({received})"
        return True

    def combine(self, prompt=None, unique_id=None, **kwargs):
        """
        primitive_* 入力を [values, types] に変換して combined に詰める。

        Returns:
            tuple: (combined, length)
        """
        values, types = _collect_primitive_inputs(prompt, unique_id, kwargs)
        length = len(values)
        combined = pack_combined_primitives(values, types)
        return (combined, length)


NODE_CLASS_MAPPINGS = {
    MiscCombinePrimitives.NAME: MiscCombinePrimitives,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    MiscCombinePrimitives.NAME: MiscCombinePrimitives.NAME,
}
