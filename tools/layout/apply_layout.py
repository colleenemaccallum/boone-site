"""Put the layout saved in the layout editor onto the real site.

    python3 tools/layout/apply_layout.py state.json

state.json holds what the editor saved:
  text:  {key: html}            new words for a block (b, i, strong, em, br, a only)
  order: {group: [keys]}        the blocks in each group, top to bottom
  css:   {both|desk|phone: {key: {property: value}}}   size, spacing, alignment, hiding

Words and order go into index.html; everything else goes into edits.css.
"""
import json
import re
import sys
from html import escape
from html.parser import HTMLParser
from pathlib import Path

from htmltree import parse

SITE = Path(__file__).resolve().parents[2]
INDEX = SITE / "index.html"
EDITS = SITE / "edits.css"
ALLOWED = {"b", "i", "strong", "em", "br", "a"}
SAFE_HREF = re.compile(r"^(https?://|mailto:|#|/)[^\s\"'<>]*$|^[\w./-]+$")
CSS_PROPS = {"text-align", "justify-content", "margin-left", "margin-right", "margin-top",
             "margin-bottom", "zoom", "max-width", "display"}
CSS_VALUE = re.compile(r"^[\w .%-]+$")
MEDIA = {"desk": "(min-width: 861px)", "phone": "(max-width: 860px)"}


class _Clean(HTMLParser):
    """Keeps only simple inline tags; everything else becomes its text."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []
        self.open = []

    def handle_starttag(self, tag, attrs):
        if tag not in ALLOWED:
            return
        if tag == "br":
            self.out.append("<br>")
            return
        if tag == "a":
            href = dict(attrs).get("href") or ""
            self.out.append(f'<a href="{escape(href)}">' if SAFE_HREF.match(href) else "<a>")
        else:
            self.out.append(f"<{tag}>")
        self.open.append(tag)

    def handle_endtag(self, tag):
        if tag in self.open:
            while self.open:
                last = self.open.pop()
                self.out.append(f"</{last}>")
                if last == tag:
                    break

    def handle_data(self, data):
        self.out.append(escape(data.replace(" ", " "), quote=False).replace("'", "'"))


def clean_html(html):
    parser = _Clean()
    parser.feed(html)
    parser.close()
    parser.out.extend(f"</{tag}>" for tag in reversed(parser.open))
    return "".join(parser.out).strip()


def css_text(css):
    def block(rules, indent=""):
        lines = []
        for key, props in sorted(rules.items(), key=lambda kv: int(kv[0][1:]) if kv[0][1:].isdigit() else 0):
            if not re.fullmatch(r"e\d+", key):
                continue
            decls = "; ".join(f"{p}: {v} !important" for p, v in props.items()
                              if p in CSS_PROPS and CSS_VALUE.match(str(v)))
            if decls:
                lines.append(f'{indent}[data-e="{key}"] {{ {decls}; }}')
        return lines

    out = ["/* Made in the layout editor (tools/layout). Edit there, not here. */"]
    out += block(css.get("both", {}))
    for size, query in MEDIA.items():
        inner = block(css.get(size, {}), "  ")
        if inner:
            out += [f"@media {query} {{", *inner, "}"]
    return "\n".join(out) + "\n"


def render(source, root, state):
    text = state.get("text", {})
    order = state.get("order", {})
    by_key = {n.key: n for n in root.walk() if n.key}
    groups = {n.container: n for n in root.walk() if n.container}
    placed = set()
    plan = {}
    for gid, keys in order.items():
        group = groups.get(gid)
        if not group:
            continue
        row = []
        for key in keys:
            node = by_key.get(key)
            if node is None or key in placed or _inside(node, group):
                continue
            placed.add(key)
            row.append(node)
        plan[gid] = row
    for gid, group in groups.items():
        kept = [c for c in group.children if c.key and c.key not in placed]
        if gid in plan:
            plan[gid] = plan[gid] + kept
            placed.update(c.key for c in kept)

    def needs(node):
        return bool(node.container in plan or node.key in text or any(needs(c) for c in node.children))

    def draw(node):
        if node.container in plan:
            kids = [c for c in node.children if c.key]
            inner_start, inner_end = node.open_end, node.close_start
            if kids:
                lead = source[inner_start:kids[0].start]
                gaps = [source[a.end:b.start] for a, b in zip(kids, kids[1:])]
                tail = source[kids[-1].end:inner_end]
            else:
                lead, gaps, tail = "\n  ", [], "\n"
            gap = gaps[0] if gaps else lead
            body = gap.join(draw(c) for c in plan[node.container])
            return source[node.start:inner_start] + lead + body + tail + source[inner_end:node.end]
        if node.key in text:
            return source[node.start:node.open_end] + clean_html(text[node.key]) + source[node.close_start:node.end]
        out, at = [], node.start
        for child in node.children:
            if needs(child):
                out.append(source[at:child.start])
                out.append(draw(child))
                at = child.end
        out.append(source[at:node.end])
        return "".join(out)

    return draw(root)


def _inside(ancestor, node):
    while node is not None:
        if node is ancestor:
            return True
        node = node.parent
    return False


def main(path):
    state = json.loads(Path(path).read_text())
    source = INDEX.read_text()
    root = parse(source)
    root.start, root.open_end = 0, 0
    out = render(source, root, state)
    if 'href="edits.css"' not in out:
        out = re.sub(r'(<link rel="stylesheet" href="site\.css[^"]*">)',
                     r'\1\n<link rel="stylesheet" href="edits.css">', out, count=1)
    INDEX.write_text(out)
    EDITS.write_text(css_text(state.get("css", {})))
    print("index.html and edits.css updated")


if __name__ == "__main__":
    main(sys.argv[1])
