"""
comfyui-misc 共通ユーティリティ（パッケージ入口）

後方互換のため ``from .utils import …`` はこのモジュールへ集約されます。
"""

from .comfy_types import (
    PRIMITIVE_TYPE_NAMES,
    AnyType,
    ByPassNamesTuple,
    ByPassTypeTuple,
    CombinedPrimitivesType,
    FlexibleOptionalInputType,
    PrimitiveInputType,
    SplitReturnTypes,
    _PRIMITIVE_TYPE_NAMES,
    any_type,
    combined_primitives_type,
    primitive_input_type,
)
from .context import is_context_empty
from .naming import NAMESPACE, get_category, get_name
from .primitives_data import infer_primitive_type, pack_combined_primitives, unpack_combined_primitives
from .workflow_types import output_type_for_link

__all__ = [
    "NAMESPACE",
    "AnyType",
    "ByPassNamesTuple",
    "ByPassTypeTuple",
    "CombinedPrimitivesType",
    "FlexibleOptionalInputType",
    "PRIMITIVE_TYPE_NAMES",
    "PrimitiveInputType",
    "SplitReturnTypes",
    "_PRIMITIVE_TYPE_NAMES",
    "any_type",
    "combined_primitives_type",
    "get_category",
    "get_name",
    "infer_primitive_type",
    "is_context_empty",
    "output_type_for_link",
    "pack_combined_primitives",
    "primitive_input_type",
    "unpack_combined_primitives",
]
