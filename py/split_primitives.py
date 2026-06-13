"""
Split Primitives (misc)

Combine Primitives の combined 出力だけを受け取り、
結合時と同じ本数・型の Primitive 出力に戻します。末尾に length（INT）を付けます。
"""

from ..utils import (
    ByPassTypeTuple,
    SplitReturnTypes,
    combined_primitives_type,
    get_category,
    get_name,
    unpack_combined_primitives,
)

class MiscSplitPrimitives:
    """combined を Primitive 出力列に分解するノード。"""

    NAME = get_name("Split Primitives")
    CATEGORY = get_category()

    @classmethod
    def INPUT_TYPES(cls):  # pylint: disable=invalid-name
        return {
            "required": {
                "combined": (combined_primitives_type,),
            },
        }

    # 全出力スロットを any_type として検証（2 番目以降に "INT" が誤適用されないよう専用クラスを使用）
    RETURN_TYPES = SplitReturnTypes()
    RETURN_NAMES = ByPassTypeTuple(("primitive_01", "length"))
    FUNCTION = "split"

    def split(self, combined):
        """
        combined を Primitive 値の配列に戻し、末尾に length を付ける。

        空データのときは length だけを返す（ComfyUI の可変出力と整合させるため）。
        """
        values, _types, length = unpack_combined_primitives(combined)
        if not values:
            return (length,)
        return tuple(list(values) + [length])


NODE_CLASS_MAPPINGS = {
    MiscSplitPrimitives.NAME: MiscSplitPrimitives,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    MiscSplitPrimitives.NAME: MiscSplitPrimitives.NAME,
}
