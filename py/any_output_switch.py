"""
Any Output Switch (misc)

入力1本を、複数の出力 any_01, any_02 … のうち
「最初に配線されている出力」だけに渡します。
それ以外の出力先には ExecutionBlocker を返し、下流ノードは実行されません。

最後の index 出力には、選ばれたデータ出力の番号（0始まりの整数）を渡します。
"""

from comfy_execution.graph import ExecutionBlocker

from .utils import ByPassNamesTuple, ByPassTypeTuple, any_type, get_category, get_name

MIN_DATA_OUTPUTS = 1
# web/any_output_switch.js stabilize が最後の接続 data の次に確保する空きスロット数
_STABILIZE_TRAILING_EMPTY_DATA_SLOTS = 1


def _linked_output_slots(prompt, unique_id):
    """
    ワークフロー JSON から、このノード出力に接続されているスロット番号を集める。

    ComfyUI の prompt では、各ノード入力が [元ノードID, 元スロット番号] で保存される。
    """
    uid = str(unique_id)
    slots = []
    for node in prompt.values():
        for value in node.get("inputs", {}).values():
            if isinstance(value, list) and len(value) == 2 and str(value[0]) == uid:
                slots.append(int(value[1]))
    return slots


def _pad_num_data_for_stabilize(num_data, max_slot):
    """index が data スロットに被らないよう、stabilize 分の空き data を num_data に含める。"""
    return max(num_data, max_slot + _STABILIZE_TRAILING_EMPTY_DATA_SLOTS + 1)


def _compute_output_layout(linked_slots, min_data_outputs):
    """
    データ出力の本数と index 出力位置を決める。

    返却タプルは result[0..num_data-1] が data、result[num_data] が index (int)。
    """
    if not linked_slots:
        num_data = min_data_outputs
        return [], num_data, num_data

    sorted_slots = sorted(set(int(s) for s in linked_slots))
    max_slot = sorted_slots[-1]

    if len(sorted_slots) == 1 and sorted_slots[0] == min_data_outputs:
        num_data = min_data_outputs
        return [], num_data, num_data

    contiguous_from_zero = sorted_slots == list(range(max_slot + 1))
    if contiguous_from_zero:
        num_data = max(min_data_outputs, max_slot + 1)
        data_slots = sorted_slots
    else:
        num_data = max(min_data_outputs, max_slot)
        data_slots = [s for s in sorted_slots if s < num_data]

    num_data = _pad_num_data_for_stabilize(num_data, max_slot)
    return data_slots, num_data, num_data


class MiscAnyOutputSwitch:
    """1入力・可変複数出力のスイッチ（Python 側）。"""

    NAME = get_name("Any Output Switch")
    CATEGORY = get_category()

    @classmethod
    def INPUT_TYPES(cls):  # pylint: disable=invalid-name
        return {
            "required": {
                "input": (any_type,),
                "select_index": ("INT", {"default": -1, "min": -1, "max": 4096}),
            },
            "hidden": {
                "prompt": "PROMPT",
                "unique_id": "UNIQUE_ID",
            },
        }

    RETURN_TYPES = ByPassTypeTuple((any_type,))
    RETURN_NAMES = ByPassNamesTuple(("any_01",))
    FUNCTION = "switch"

    def switch(self, input, select_index=-1, prompt=None, unique_id=None, **kwargs):
        """
        入力を 1 本だけ有効化して返す。

        - 選ばれた data 出力: input
        - それ以外の data 出力: ExecutionBlocker
        - 末尾: 選ばれた index (0 始まり)
        """
        linked = (
            _linked_output_slots(prompt, unique_id)
            if prompt is not None and unique_id is not None
            else []
        )

        data_slots, num_data, _index_slot = _compute_output_layout(linked, MIN_DATA_OUTPUTS)

        if select_index is not None and select_index >= 0:
            selected_index = select_index
            num_data = max(num_data, selected_index + 1, MIN_DATA_OUTPUTS)
        else:
            selected_index = min(data_slots) if data_slots else -1

        result = []
        for i in range(num_data):
            if i == selected_index:
                result.append(input)
            else:
                result.append(ExecutionBlocker(None))

        result.append(int(selected_index))
        return tuple(result)


NODE_CLASS_MAPPINGS = {
    MiscAnyOutputSwitch.NAME: MiscAnyOutputSwitch,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    MiscAnyOutputSwitch.NAME: MiscAnyOutputSwitch.NAME,
}
