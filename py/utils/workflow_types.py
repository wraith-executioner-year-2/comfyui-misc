"""ワークフロー JSON 上のリンク型解決。"""

from .comfy_types import AnyType, PRIMITIVE_TYPE_NAMES, any_type
from .naming import get_name

_SPLIT_PRIMITIVES_CLASS = get_name("Split Primitives")


def _is_wildcard_return_type(slot_type) -> bool:
    if isinstance(slot_type, AnyType):
        return True
    text = str(slot_type)
    return text == "*" or text == str(any_type)


def _normalize_return_type(slot_type):
    if isinstance(slot_type, (list, tuple)):
        return list(slot_type)
    text = str(slot_type)
    if text in PRIMITIVE_TYPE_NAMES:
        return "BOOL" if text == "BOOL" else text
    if "," in text:
        parts = frozenset(part.strip() for part in text.split(","))
        if parts <= PRIMITIVE_TYPE_NAMES:
            if "FLOAT" in parts:
                return "FLOAT"
            if "INT" in parts:
                return "INT"
    return text


def _split_output_type_from_prompt(prompt, node_id, slot_index):
    node = prompt.get(str(node_id))
    if not node or node.get("class_type") != _SPLIT_PRIMITIVES_CLASS:
        return None

    combined_link = node.get("inputs", {}).get("combined")
    if not isinstance(combined_link, list) or len(combined_link) != 2:
        return None

    combine_node = prompt.get(str(combined_link[0]))
    if not combine_node:
        return None

    primitive_key = f"primitive_{slot_index + 1:02d}"
    upstream_link = combine_node.get("inputs", {}).get(primitive_key)
    if isinstance(upstream_link, list) and len(upstream_link) == 2:
        return output_type_for_link(prompt, upstream_link)
    return None


def output_type_for_link(prompt, link):
    """リンク ``[node_id, slot]`` から出力側の型名を返します。"""
    if not prompt or not isinstance(link, list) or len(link) != 2:
        return "STRING"
    from nodes import NODE_CLASS_MAPPINGS

    node_id, slot_index = link[0], link[1]
    node = prompt.get(str(node_id))
    if not node:
        return "STRING"
    class_type = node.get("class_type")
    if not class_type or class_type not in NODE_CLASS_MAPPINGS:
        return "STRING"

    return_types = NODE_CLASS_MAPPINGS[class_type].RETURN_TYPES
    try:
        slot_type = return_types[slot_index]
    except (IndexError, TypeError, KeyError):
        return "STRING"

    if class_type == _SPLIT_PRIMITIVES_CLASS:
        passthrough = _split_output_type_from_prompt(prompt, node_id, slot_index)
        if passthrough is not None:
            return passthrough

    if _is_wildcard_return_type(slot_type):
        passthrough = _split_output_type_from_prompt(prompt, node_id, slot_index)
        if passthrough is not None:
            return passthrough
        return "STRING"

    return _normalize_return_type(slot_type)
