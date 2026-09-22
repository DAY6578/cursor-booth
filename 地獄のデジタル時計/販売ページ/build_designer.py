# -*- coding: utf-8 -*-
"""デザインを変える.html を、フォント同梱の1ファイルとして書き出す。"""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
overlay = root / "overlay"
fonts = overlay / "fonts"
css = (overlay / "clock.css").read_text(encoding="utf-8")
js = (overlay / "clock.js").read_text(encoding="utf-8")

for font in fonts.glob("*.woff2"):
    data = font.read_bytes()
    encoded = __import__("base64").b64encode(data).decode("ascii")
    css = css.replace(
        'url("fonts/%s")' % font.name,
        'url("data:font/woff2;base64,%s")' % encoded,
    )

js = re.sub(
    r"const CONFIG = \{.*?\n\};",
    "const CONFIG = __CONFIG__;",
    js,
    count=1,
    flags=re.S,
)
if "__CONFIG__" not in js:
    raise SystemExit("CONFIG block was not replaced")

template = Path(__file__).with_name("designer.template.html").read_text(encoding="utf-8")
page = template.replace("__EMBED_CSS__", json.dumps(css, ensure_ascii=False))
page = page.replace("__EMBED_JS__", json.dumps(js, ensure_ascii=False))
out = root / "デザインを変える.html"
out.write_text(page, encoding="utf-8")
print(out, out.stat().st_size)
