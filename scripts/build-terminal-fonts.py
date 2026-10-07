"""Repack official Maple Mono NF CN fonts as WOFF2 without altering glyphs.

Requires fonttools[woff]. Pass the v7.9 NF-CN-unhinted ZIP and its SHA256 file
downloaded from https://github.com/subframe7536/maple-font/releases/tag/v7.9.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import zipfile

from fontTools.ttLib import TTFont

parser = argparse.ArgumentParser()
parser.add_argument("archive", type=Path)
parser.add_argument("checksum", type=Path)
parser.add_argument("output", type=Path)
args = parser.parse_args()
expected = args.checksum.read_text().split()[0].lower()
with args.archive.open("rb") as source:
    actual = hashlib.file_digest(source, "sha256").hexdigest()
if actual != expected:
    raise SystemExit("Official font archive checksum mismatch")
args.output.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(args.archive) as archive:
    files = archive.namelist()
    for style in ("Regular", "Bold"):
        source = next(name for name in files if name.endswith(f"MapleMono-NF-CN-{style}.ttf"))
        font = TTFont(io.BytesIO(archive.read(source)))
        cmap = font.getBestCmap()
        widths = {char: font["hmtx"].metrics[cmap[ord(char)]][0] for char in ("W", "i", "m", "中", "文", "\uf306", "\ue0b0")}
        assert widths["W"] == widths["i"] == widths["m"], widths
        assert widths["中"] == widths["文"] == 2 * widths["W"], widths
        font.flavor = "woff2"
        target = args.output / f"MapleMonoNFCN-{style}-v7.9.woff2"
        font.save(target)
        print(f"{target.name}: {target.stat().st_size} bytes; glyph widths={widths}")
    licenses = [name for name in files if Path(name).name.lower().startswith(("license", "ofl")) and not name.endswith("/")]
    if not licenses:
        raise SystemExit("Official font license missing")
    for name in licenses:
        (args.output / Path(name).name).write_bytes(archive.read(name))
    (args.output / "source.json").write_text(json.dumps({
        "project": "https://github.com/subframe7536/maple-font",
        "version": "v7.9", "archive": "MapleMono-NF-CN-unhinted.zip", "sha256": actual,
        "conversion": "WOFF2 compression only; original glyphs and names preserved",
    }, indent=2) + "\n", encoding="utf8")
