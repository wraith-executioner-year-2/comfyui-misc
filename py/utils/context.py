"""rgthree CONTEXT 型の判定。"""


def is_context_empty(ctx) -> bool:
    """辞書の値がすべて None なら空とみなします。"""
    return not ctx or all(v is None for v in ctx.values())
