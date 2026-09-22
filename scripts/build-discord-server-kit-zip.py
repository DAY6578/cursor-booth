#!/usr/bin/env python3
"""購入者向け zip を releases/discord-server-kit.zip に作る。

販売ページは入れない。中身は README.md、はじめての人へ.html、common/、pack-fan/、pack-event/ だけ。
"""
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "products" / "discord-server-kit"
OUT = ROOT / "releases" / "discord-server-kit.zip"
EXCLUDE_TOP = {"販売ページ"}
REQUIRED = (
    "README.md",
    "はじめての人へ.html",
    "common/01-server-setup.md",
    "common/02-roles-and-permissions.md",
    "common/03-moderation-first-response.md",
    "common/04-naming-rules.md",
    "common/05-backup-and-handoff.md",
    "pack-fan/README.md",
    "pack-fan/01-channels.md",
    "pack-fan/02-roles.md",
    "pack-fan/03-text-rules.md",
    "pack-fan/04-text-welcome.md",
    "pack-fan/05-text-intro.md",
    "pack-fan/06-membership-checklist.md",
    "pack-fan/07-prepublish-checklist.md",
    "pack-event/README.md",
    "pack-event/01-channels.md",
    "pack-event/02-roles.md",
    "pack-event/03-text-rules.md",
    "pack-event/04-text-entry.md",
    "pack-event/05-text-schedule.md",
    "pack-event/06-text-absence.md",
    "pack-event/07-day-of-runbook.md",
    "pack-event/08-incident.md",
    "pack-event/09-prepublish-checklist.md",
)


def main() -> int:
    if not SRC.is_dir():
        print("product folder not found", file=sys.stderr)
        return 1
    files = []
    for path in sorted(SRC.rglob("*")):
        if not path.is_file():
            continue
        if path.name.startswith("."):
            continue
        rel = path.relative_to(SRC)
        if rel.parts[0] in EXCLUDE_TOP:
            continue
        files.append((path, rel.as_posix()))
    names = {name for _, name in files}
    missing = [item for item in REQUIRED if item not in names]
    if missing:
        print("missing: " + ", ".join(missing), file=sys.stderr)
        return 1
    if any(name.startswith("販売ページ/") for name in names):
        print("sales notes must not be in the zip", file=sys.stderr)
        return 1
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUT, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path, name in files:
            # 日本語名は閉じたあとのヘッダで UTF-8 フラグ（bit 11）が付く。
            zf.write(path, arcname=name)
    with zipfile.ZipFile(OUT) as zf:
        info = zf.getinfo("はじめての人へ.html")
        if not info.flag_bits & 0x800:
            print("utf-8 flag missing on はじめての人へ.html", file=sys.stderr)
            OUT.unlink(missing_ok=True)
            return 1
        if any(name.startswith("販売ページ/") for name in zf.namelist()):
            print("sales notes must not be in the zip", file=sys.stderr)
            OUT.unlink(missing_ok=True)
            return 1
    print(OUT.relative_to(ROOT).as_posix())
    print(str(len(files)) + " files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
