"""Combine / Split で受け渡す combined データ。"""


def pack_combined_primitives(values, types):
    return {"values": tuple(values), "types": tuple(types)}


def unpack_combined_primitives(combined):
    if not isinstance(combined, dict):
        return (), (), 0
    values = combined.get("values") or ()
    types = combined.get("types") or ()
    if len(types) < len(values):
        types = tuple(types) + tuple("STRING" for _ in range(len(values) - len(types)))
    return values, types, len(values)


def infer_primitive_type(value):
    """実行時の値から ComfyUI 型名を推定（STRING / COMBO の区別は不可）。"""
    if type(value) is bool:
        return "BOOLEAN"
    if type(value) is int:
        return "INT"
    if type(value) is float:
        return "FLOAT"
    if isinstance(value, str):
        return "STRING"
    return "STRING"
