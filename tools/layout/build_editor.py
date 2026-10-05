"""Build the layout editor page from the live site.

    python3 tools/layout/build_editor.py OUT_DIR

OUT_DIR gets editor.html (the page to publish) and every file it needs.
Run it again after index.html or site.css changes, then republish.
"""
import json
import re
import shutil
import sys
from pathlib import Path

from htmltree import parse

HERE = Path(__file__).resolve().parent
SITE = HERE.parents[1]


def editor_css(css):
    """site.css, made to follow the editor's frame width instead of the window."""
    css = re.sub(r"@media \(((?:max|min)-width: \d+px)\)", r"@container site (\1)", css)
    css = re.sub(r"(\d)vw\b", r"\1cqw", css)
    css = css.replace("html { scroll-behavior: smooth; }\n", "")
    css = css.replace("html, body { overflow-x: clip; }", ".site { overflow-x: clip; }")
    css = re.sub(r"\bbody\b", ".site", css)
    css = css.replace("position: fixed; inset: 0; background: url(img/grain.png)", "position: absolute; inset: 0; background: url(img/grain.png)")
    return css


def main(out):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    source = (SITE / "index.html").read_text()
    root = parse(source)
    body = next(n for n in root.walk() if n.tag == "body")
    parts, at = [], body.open_end
    for child in body.children:
        if child.tag == "script":
            parts.append(source[at:child.start])
            at = child.end
    parts.append(source[at:body.close_start])
    inner = "".join(parts)
    live = HERE / "live-state.json"
    live_css = json.loads(live.read_text()).get("css", {}) if live.exists() else {}
    page = (HERE / "editor-template.html").read_text()
    page = page.replace("{{SITE}}", inner).replace("{{LIVE_CSS}}", json.dumps(live_css))
    (out / "editor.html").write_text(page)
    (out / "editor-site.css").write_text(editor_css((SITE / "site.css").read_text()))
    for name in ("editor.css", "editor.js", "editor-pre.js"):
        shutil.copy(HERE / name, out / name)
    shutil.copy(SITE / "site.js", out / "site.js")
    shutil.copy(SITE / "fonts.css", out / "fonts.css")
    for folder in ("fonts", "img"):
        if (out / folder).exists():
            shutil.rmtree(out / folder)
        shutil.copytree(SITE / folder, out / folder, ignore=shutil.ignore_patterns("email"))
    print(f"editor built in {out}")


if __name__ == "__main__":
    main(sys.argv[1])
