"""
Any Output Switch (misc)

入力1本を、複数の出力 any_01, any_02 … のうち
「最初に配線されている出力」だけに渡します。
それ以外の出力先には ExecutionBlocker を返し、下流ノードは実行されません。

最後の index 出力には、選ばれたデータ出力の番号（0始まりの整数）を渡します。
"""

from comfy_execution.graph import ExecutionBlocker

from .utils import ByPassNamesTuple, ByPassTypeTuple, any_type, get_category, get_name

# 画面上に常に表示しておくデータ出力の最小個数（any_01 の1本 + index）
MIN_DATA_OUTPUTS = 1


def _linked_output_slots(prompt, unique_id):
    """
    ワークフロー JSON から、このノード出力に接続されているスロット番号を集める。

    ComfyUI の prompt では、各ノード入力が [元ノードID, 元スロット番号] で保存される。
    そのためこの関数は「元ノードIDが自分と一致するもの」だけを抽出する。
    """
    uid = str(unique_id)
    slots = []
    for node in prompt.values():
        for value in node.get("inputs", {}).values():
            if isinstance(value, list) and len(value) == 2 and str(value[0]) == uid:
                slots.append(value[1])
    return slots


def _compute_output_layout(linked_slots, min_data_outputs):
    """
    データ出力の本数と index 出力のスロット番号を決めます。

    JS 側: [データ 0..N-1], [index at N]
    返却タプル: result[0..N-1] がデータ、result[N] が int の index
    """
    if not linked_slots:
        num_data = min_data_outputs
        return [], num_data, num_data

    sorted_slots = sorted(set(linked_slots))
    max_slot = sorted_slots[-1]

    # 0..max の連番で接続されている場合:
    # すべて data とみなし、index はその次のスロットに置く。
    contiguous_from_zero = sorted_slots == list(range(max_slot + 1))
    if contiguous_from_zero:
        num_data = max(min_data_outputs, max_slot + 1)
        index_slot = num_data
        return sorted_slots, num_data, index_slot

    # index だけが接続されている典型ケース（min_data_outputs=1 なら slot=1）。
    if len(sorted_slots) == 1 and sorted_slots[0] == min_data_outputs:
        num_data = min_data_outputs
        index_slot = num_data
        return [], num_data, index_slot

    # ギャップがある場合は、最大スロットを index とみなし、それ未満を data にする。
    num_data = max(min_data_outputs, max_slot)
    index_slot = num_data
    data_slots = [s for s in sorted_slots if s < index_slot]
    return data_slots, num_data, index_slot


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

    # 可変データ出力 + 末尾 index。2 要素目を "INT" 固定にすると増えた出力が誤って INT 扱いになるため * のみ定義
    RETURN_TYPES = ByPassTypeTuple((any_type,))
    RETURN_NAMES = ByPassNamesTuple(("any_01",))
    FUNCTION = "switch"

    def switch(self, input, select_index=-1, prompt=None, unique_id=None, **kwargs):
        """
        入力を 1 本だけ有効化して返す。

        - 選ばれたデータ出力には input を流す
        - それ以外のデータ出力には ExecutionBlocker を返す
        - 最後尾に index (0 始まり) を返す
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
