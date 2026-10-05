"""Give every movable block in index.html a data-e key, and every group that
holds blocks a data-c key, so the layout editor and apply_layout.py can find
them. Safe to run again: blocks that already have a key keep it.

    python3 tools/layout/add_keys.py
"""
import re
from pathlib import Path

from htmltree import parse

INDEX = Path(__file__).resolve().parents[2] / "index.html"
GROUP_TAGS = {"section", "header", "footer", "nav"}
GROUP_CLASSES = {"hero-words", "actions", "demo", "dock-words", "section-words", "bd-more",
                 "sticker-intro", "finish-box", "sticker-book", "paper", "thanks"}
GROUP_IDS = {"android-ask"}


def is_group(node):
    return (node.tag in GROUP_TAGS or node.attrs.get("id") in GROUP_IDS
            or GROUP_CLASSES.intersection(node.classes()))


def main():
    source = INDEX.read_text()
    root = parse(source)
    body = next(n for n in root.walk() if n.tag == "body")
    used = [int(m) for m in re.findall(r'data-e="e(\d+)"', source)]
    counter = max(used, default=0)
    inserts = []  # (offset, text)

    def mark(node, attrs):
        if attrs:
            inserts.append((node.start + 1 + len(node.tag), "".join(f' {k}="{v}"' for k, v in attrs)))

    if body.container is None:
        mark(body, [("data-c", "root")])

    def visit(group):
        nonlocal counter
        for child in group.children:
            attrs = []
            key = child.key
            if key is None:
                counter += 1
                key = f"e{counter}"
                attrs.append(("data-e", key))
            if is_group(child):
                if child.container is None:
                    attrs.append(("data-c", key))
                mark(child, attrs)
                visit(child)
            else:
                mark(child, attrs)

    visit(body)
    for offset, text in sorted(inserts, reverse=True):
        source = source[:offset] + text + source[offset:]
    INDEX.write_text(source)
    print(f"{len(inserts)} tags marked, last key e{counter}")


if __name__ == "__main__":
    main()
