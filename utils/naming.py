"""ノード名・カテゴリの付け方。"""

NAMESPACE = "misc"


def get_name(name: str) -> str:
    """例: ``get_name("Any Switch")`` → ``"Any Switch (misc)"``"""
    return f"{name} ({NAMESPACE})"


def get_category(sub_dirs=None) -> str:
    if sub_dirs is None:
        return NAMESPACE
    return f"{NAMESPACE}/{sub_dirs}"
