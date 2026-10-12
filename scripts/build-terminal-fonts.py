"""Split the official Maple Mono NF CN fonts into WOFF2 unicode-range chunks.

Dev-only tool. It needs fontTools and Brotli, for example in a throwaway venv:

    python -m venv .fonts-venv
    .fonts-venv/Scripts/pip install fonttools==4.66.1 brotli==1.2.0   # bin/ on POSIX

The committed files were produced with exactly those versions. The WOFF2 bytes
depend on the Brotli encoder, so other versions give equivalent but not
byte-identical files.

Pass the v7.9 NF-CN-unhinted ZIP and its SHA256 file from
https://github.com/subframe7536/maple-font/releases/tag/v7.9 and the output
directory (packages/terminal-fonts):

    python scripts/build-terminal-fonts.py MapleMono-NF-CN-unhinted.zip \
        MapleMono-NF-CN-unhinted.sha256 packages/terminal-fonts

Every chunk keeps the original outlines, advance widths, vertical metrics,
names and OpenType layout. Subsetting only drops codepoints and the glyphs that
no kept codepoint reaches. The script verifies this for every codepoint after a
WOFF2 round trip. It writes the chunks, the @font-face stylesheet with one
unicode-range per chunk, the license and source.json, and removes stale WOFF2
files from the output directory.

Browsers download a chunk only when text needs one of its codepoints. The
ranges stay disjoint so one character never makes the browser consider (and
possibly fetch) two chunks. The files are served as immutable, so a chunk's
membership is part of its file name's contract: rename the files if the
layout ever changes.
"""
import argparse
import hashlib
import importlib.metadata
import io
import json
from pathlib import Path
import zipfile

from fontTools import subset
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.ttLib import TTFont

VERSION = "v7.9"
FAMILY = "Maple Mono NF CN"
STYLES = (("Regular", 400), ("Bold", 700))
STYLESHEET = "maple-mono-nf-cn.css"
REMAINING_HAN_CHUNKS = 10
# Bridging a short run of codepoints the font lacks shortens the CSS. A long
# bridge would make text the font cannot render (emoji, other scripts) download
# a chunk for nothing.
MAX_BRIDGE = 64

# Loaded on every terminal page: Latin-1 and combining marks, general
# punctuation through the symbol blocks (arrows, box drawing, block elements,
# geometric shapes, dingbats, braille), and the Nerd Font sets prompts use most:
# Pomicons/Powerline, Seti-UI, Font Awesome, Font Logos and Octicons.
BASE = ((0x0000, 0x00FF), (0x0300, 0x036F), (0x2000, 0x2BFF), (0xE000, 0xE0FF),
        (0xE5FA, 0xE6FF), (0xF000, 0xF2FF), (0xF300, 0xF3FF), (0xF400, 0xF533))
HAN = ((0x3400, 0x4DBF), (0x4E00, 0x9FFF), (0xF900, 0xFAFF), (0x20000, 0x3FFFF))
CJK_PUNCTUATION = ((0x3000, 0x303F), (0xFF00, 0xFFEF))
BMP_PRIVATE_USE = ((0xE000, 0xF8FF),)
MATERIAL_DESIGN = ((0xF0000, 0xFFFFF),)


def within(ranges, codepoint):
    return any(start <= codepoint <= end for start, end in ranges)


def gb2312_level1():
    """GB2312 level 1 hanzi: the 3,755 most common characters in Chinese text."""
    chars = set()
    for row in range(0xB0, 0xD8):
        for cell in range(0xA1, 0xFF):
            try:
                chars.add(ord(bytes((row, cell)).decode("gb2312")))
            except UnicodeDecodeError:
                pass
    assert len(chars) == 3755, len(chars)
    return chars


def plan_chunks(codepoints):
    """Assign every codepoint of the font to exactly one named chunk."""
    common_han = gb2312_level1()
    assert common_han <= codepoints, "font lacks GB2312 level 1 hanzi"
    chunks = {"base": [], "cjk": [], "nerd": [], "mdi": [], "ext": []}
    remaining_han = []
    for codepoint in sorted(codepoints):
        if within(BASE, codepoint):
            chunks["base"].append(codepoint)
        elif codepoint in common_han or within(CJK_PUNCTUATION, codepoint):
            chunks["cjk"].append(codepoint)
        elif within(HAN, codepoint):
            remaining_han.append(codepoint)
        elif within(BMP_PRIVATE_USE, codepoint):
            chunks["nerd"].append(codepoint)
        elif within(MATERIAL_DESIGN, codepoint):
            chunks["mdi"].append(codepoint)
        else:
            chunks["ext"].append(codepoint)
    # Rare hanzi are scattered through the block, so equal-sized codepoint slices
    # keep the download for an occasional rare character small.
    size = -(-len(remaining_han) // REMAINING_HAN_CHUNKS)
    for index in range(REMAINING_HAN_CHUNKS):
        chunks[f"han{index + 1:02}"] = remaining_han[index * size:(index + 1) * size]
    assert all(chunks.values()), {name: len(members) for name, members in chunks.items()}
    return chunks


def unicode_range(members, covered):
    """CSS unicode-range for members, bridging short gaps the font lacks entirely."""
    runs = []
    for codepoint in members:
        gap = range(runs[-1][1] + 1, codepoint) if runs else None
        if gap is not None and len(gap) <= MAX_BRIDGE and not any(missing in covered for missing in gap):
            runs[-1][1] = codepoint
        else:
            runs.append([codepoint, codepoint])
    return ", ".join(f"U+{start:X}" if start == end else f"U+{start:X}-{end:X}" for start, end in runs)


def subset_options():
    options = subset.Options()
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.name_legacy = True
    options.legacy_kern = True
    options.symbol_cmap = True
    options.notdef_glyph = True
    options.notdef_outline = True
    options.passthrough_tables = True
    options.drop_tables = []
    options.prune_unicode_ranges = False
    options.prune_codepage_ranges = False
    options.recalc_bounds = False
    options.recalc_timestamp = False
    options.recalc_average_width = False
    options.recalc_max_context = False
    options.flavor = "woff2"
    return options


def metrics(font):
    os2 = font["OS/2"]
    hhea = font["hhea"]
    return (font["head"].unitsPerEm, hhea.ascent, hhea.descent, hhea.lineGap,
            os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap,
            os2.usWinAscent, os2.usWinDescent, os2.xAvgCharWidth, font["post"].isFixedPitch)


def drawing(glyphs, glyph_name):
    pen = DecomposingRecordingPen(glyphs)
    glyphs[glyph_name].draw(pen)
    return pen.value


def verify_chunk(original, chunk, members):
    """Every member must keep its exact advance, side bearing and outline."""
    assert metrics(chunk) == metrics(original), (metrics(chunk), metrics(original))
    source_cmap = original.getBestCmap()
    chunk_cmap = chunk.getBestCmap()
    assert set(chunk_cmap) == set(members), "chunk cmap differs from its plan"
    source_glyphs = original.getGlyphSet()
    chunk_glyphs = chunk.getGlyphSet()
    for codepoint in members:
        before = source_cmap[codepoint]
        after = chunk_cmap[codepoint]
        assert chunk["hmtx"][after] == original["hmtx"][before], hex(codepoint)
        assert drawing(chunk_glyphs, after) == drawing(source_glyphs, before), hex(codepoint)


def advance(font, char):
    return font["hmtx"][font.getBestCmap()[ord(char)]][0]


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
written = set()
rules = []
manifest = []
with zipfile.ZipFile(args.archive) as archive:
    files = archive.namelist()
    plan = None
    for style, weight in STYLES:
        source_name = next(name for name in files if name.endswith(f"MapleMono-NF-CN-{style}.ttf"))
        data = archive.read(source_name)
        original = TTFont(io.BytesIO(data), recalcTimestamp=False)
        cmap = original.getBestCmap()
        widths = {char: advance(original, char) for char in ("W", "i", "m", "中", "文", "\uf306", "\ue0b0")}
        assert widths["W"] == widths["i"] == widths["m"], widths
        assert widths["中"] == widths["文"] == 2 * widths["W"], widths
        covered = set(cmap)
        if plan is None:
            plan = plan_chunks(covered)
        assert covered == {codepoint for members in plan.values() for codepoint in members}, "styles differ in coverage"
        for chunk_name, members in plan.items():
            font = TTFont(io.BytesIO(data), recalcTimestamp=False)
            subsetter = subset.Subsetter(subset_options())
            subsetter.populate(unicodes=members)
            subsetter.subset(font)
            font.flavor = "woff2"
            target = args.output / f"MapleMonoNFCN-{style}-{VERSION}-{chunk_name}.woff2"
            font.save(target, reorderTables=False)
            chunk = TTFont(target, recalcTimestamp=False)
            verify_chunk(original, chunk, members)
            if chunk_name == "base":
                cell = advance(chunk, "W")
                assert cell == widths["W"], (cell, widths)
            if chunk_name == "cjk":
                assert advance(chunk, "中") == advance(chunk, "文") == 2 * widths["W"], widths
            written.add(target.name)
            manifest.append({"file": target.name, "codepoints": len(members), "bytes": target.stat().st_size})
            rules.append(
                "@font-face {\n"
                f'  font-family: "{FAMILY}";\n'
                f'  src: url("/fonts/{target.name}") format("woff2");\n'
                "  font-style: normal;\n"
                f"  font-weight: {weight};\n"
                "  font-display: swap;\n"
                f"  unicode-range: {unicode_range(members, covered)};\n"
                "}\n"
            )
            print(f"{target.name}: {len(members)} codepoints, {target.stat().st_size} bytes", flush=True)
        print(f"{style} glyph widths={widths}")
    licenses = [name for name in files if Path(name).name.lower().startswith(("license", "ofl")) and not name.endswith("/")]
    if not licenses:
        raise SystemExit("Official font license missing")
    for name in licenses:
        (args.output / Path(name).name).write_bytes(archive.read(name))
for stale in args.output.glob("*.woff2"):
    if stale.name not in written:
        stale.unlink()
(args.output / STYLESHEET).write_text(
    "/* Generated by scripts/build-terminal-fonts.py. Do not edit. */\n\n" + "\n".join(rules),
    encoding="utf8",
)
(args.output / "source.json").write_text(json.dumps({
    "project": "https://github.com/subframe7536/maple-font",
    "version": VERSION, "archive": "MapleMono-NF-CN-unhinted.zip", "sha256": actual,
    "conversion": "fontTools unicode-range subsets as WOFF2; original outlines, metrics, names and layout preserved",
    "tools": {name: importlib.metadata.version(name) for name in ("fonttools", "brotli")},
    "chunks": manifest,
}, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
