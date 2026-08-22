#!/usr/bin/env python3
"""Generate women / men static evaluation sites for GitHub Pages."""

from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

sys.dont_write_bytecode = True

ROOT = Path(__file__).resolve().parent
PACKAGES_PATH = ROOT / "packages.json"
SITE_TEMPLATE = ROOT / "site.html"
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
NUM_RE = re.compile(r"(\d+)")


def natural_key(name: str) -> tuple:
    parts = NUM_RE.split(name)
    key = []
    for part in parts:
        if part.isdigit():
            key.append((0, int(part)))
        else:
            key.append((1, part.lower()))
    return tuple(key)


def scan_images(image_dir: Path) -> list[dict]:
    files = [
        path for path in image_dir.iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_EXTS and not path.name.startswith(".")
    ]
    files.sort(key=lambda path: natural_key(path.name))
    return [{"fileName": path.name} for path in files]


def main() -> None:
    packages = json.loads(PACKAGES_PATH.read_text(encoding="utf-8"))["packages"]
    if not SITE_TEMPLATE.is_file():
        raise SystemExit("site.html がありません")

    for package in packages:
        package_id = package["id"]
        image_dir = ROOT / package["image_dir"]
        if not image_dir.is_dir():
            raise SystemExit(f"画像フォルダがありません: {image_dir}")

        images = scan_images(image_dir)
        if not images:
            raise SystemExit(f"有効な画像がありません: {image_dir}")

        for image in images:
            image["path"] = f"../{package['image_dir']}/{image['fileName']}"

        output_dir = ROOT / package_id
        output_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(SITE_TEMPLATE, output_dir / "index.html")

        config = {
            "siteId": package_id,
            "label": package.get("label", package_id),
            "imageDir": package["image_dir"],
        }
        (output_dir / "config.json").write_text(
            json.dumps(config, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        (output_dir / "images.json").write_text(
            json.dumps({"images": images}, ensure_ascii=False, separators=(",", ":")) + "\n",
            encoding="utf-8",
        )

        required = [
            output_dir / "index.html",
            output_dir / "config.json",
            output_dir / "images.json",
            ROOT / "app.js",
            ROOT / "style.css",
            image_dir / images[0]["fileName"],
        ]
        missing = [str(path) for path in required if not path.is_file()]
        if missing:
            raise SystemExit("生成後のファイル確認に失敗しました:\n" + "\n".join(missing))

        print(f"{package_id}: {len(images)} images -> /{package_id}/")


if __name__ == "__main__":
    main()
