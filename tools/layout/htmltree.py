"""A tiny HTML tree that remembers where each element sits in the source.

The layout tools edit index.html by splicing the original text, so
everything they don't touch (spacing, SVG attribute case, comments)
stays exactly as written.
"""
from html.parser import HTMLParser

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}


class Node:
    def __init__(self, tag, attrs, start, open_end, parent):
        self.tag = tag
        self.attrs = dict(attrs)
        self.start = start
        self.open_end = open_end
        self.close_start = open_end
        self.end = open_end
        self.parent = parent
        self.children = []

    @property
    def key(self):
        return self.attrs.get("data-e")

    @property
    def container(self):
        return self.attrs.get("data-c")

    def classes(self):
        return (self.attrs.get("class") or "").split()

    def walk(self):
        yield self
        for child in self.children:
            yield from child.walk()


class _Builder(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.source = source
        self.line_starts = [0]
        for i, ch in enumerate(source):
            if ch == "\n":
                self.line_starts.append(i + 1)
        self.root = Node("#root", [], 0, 0, None)
        self.root.end = self.root.close_start = len(source)
        self.stack = [self.root]

    def _offset(self):
        line, col = self.getpos()
        return self.line_starts[line - 1] + col

    def handle_starttag(self, tag, attrs):
        start = self._offset()
        node = Node(tag, attrs, start, start + len(self.get_starttag_text()), self.stack[-1])
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        start = self._offset()
        node = Node(tag, attrs, start, start + len(self.get_starttag_text()), self.stack[-1])
        self.stack[-1].children.append(node)

    def handle_endtag(self, tag):
        start = self._offset()
        end = self.source.index(">", start) + 1
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                for node in self.stack[i:]:
                    node.close_start, node.end = start, end
                del self.stack[i:]
                return


def parse(source):
    builder = _Builder(source)
    builder.feed(source)
    builder.close()
    return builder.root
