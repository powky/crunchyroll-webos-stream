#!/usr/bin/env python3
"""Builds the app's icons from Apple's SF Symbols, on a Mac that has them (macOS 13+).

SF Symbols are licensed by Apple for Apple platforms, so nothing generated here is committed: the output,
src/components/ui/sfSymbols.generated.json, is git-ignored and the app falls back to its own simple glyphs without it.

It writes two things into that JSON:
- `glyphs`: SVG path data per symbol, for the app's own <Icon> component;
- `font`: an OpenType font (data URL) named "CR Icons" whose glyphs sit at moonstone's icon code points, so every
  moonstone icon (video player, popups, dropdown arrows...) draws the SF Symbol instead of LG's.

usage: python3 tools/sf-symbols/build.py   (needs `pip install fonttools`; see tools/sf-symbols/README.md)
"""
import base64
import io
import json
import subprocess
import sys
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent.parent / 'src' / 'components' / 'ui' / 'sfSymbols.generated.json'
WEIGHT = 'semibold'

# app <Icon name> -> SF Symbol
GLYPHS = {
    'play': 'play.fill', 'pause': 'pause.fill', 'plus': 'plus', 'check': 'checkmark',
    'checkCircle': 'checkmark.circle', 'star': 'star.fill', 'starOutline': 'star',
    'bubble': 'captions.bubble.fill', 'grid': 'square.grid.2x2.fill', 'note': 'music.note',
    'search': 'magnifyingglass', 'gear': 'gearshape.fill', 'info': 'info.circle', 'power': 'power',
    'sort': 'arrow.up.arrow.down', 'user': 'person.fill', 'logout': 'rectangle.portrait.and.arrow.right',
    'mail': 'envelope.fill', 'qr': 'qrcode', 'key': 'key.fill', 'skip': 'forward.fill', 'back': 'chevron.left',
    'edit': 'pencil', 'globe': 'globe', 'chevronRight': 'chevron.right', 'chevronDown': 'chevron.down',
    'list': 'list.bullet', 'trash': 'trash.fill', 'speaker': 'speaker.wave.2.fill', 'textSize': 'textformat.size',
    'photo': 'photo', 'tv': 'tv', 'sparkles': 'sparkles', 'memory': 'memorychip', 'heart': 'heart.fill',
    'house': 'house.fill', 'xmark': 'xmark', 'eye': 'eye.fill', 'clock': 'clock.fill', 'film': 'film.fill',
    'rows': 'rectangle.grid.1x2.fill', 'refresh': 'arrow.clockwise', 'devtools': 'hammer.fill',
    'thumbsUp': 'hand.thumbsup.fill', 'thumbsDown': 'hand.thumbsdown.fill', 'person2': 'person.2.fill',
}

# moonstone icon code point -> SF Symbol (moonstone/Icon/IconList.js); U+E000 is the app's own "aA"
FONT = {
    0x2B: 'plus', 0x2D: 'minus', 0x21A9: 'arrow.uturn.left', 0x22EF: 'ellipsis', 0x2713: 'checkmark',
    0x0EFFDD: 'play.fill', 0x0EFFDE: 'pause.fill', 0x0EFFDF: 'forward.fill', 0x0EFFE0: 'backward.fill',
    0x0EFFE1: 'forward.end.fill', 0x0EFFE2: 'backward.end.fill',
    0x0EFFE7: 'forward.end.fill', 0x0EFFE8: 'backward.end.fill',
    0x0EFFED: 'chevron.down', 0x0EFFEE: 'chevron.up', 0x0EFFEF: 'chevron.left', 0x0EFFF0: 'chevron.right',
    0x0EFFF1: 'chevron.up', 0x0EFFF2: 'chevron.down', 0x0EFFF3: 'chevron.left', 0x0EFFF4: 'chevron.right',
    0x0EFFF5: 'xmark', 0x0EFFF6: 'magnifyingglass', 0x0EFFFC: 'rectangle.portrait.and.arrow.right',
    0x0F0025: 'trash.fill', 0x0F0028: 'star.fill', 0x0F0029: 'star', 0x0F002B: 'gearshape.fill',
    0x0F002C: 'arrow.right.circle.fill', 0x0F002D: 'lock.fill', 0x0F0061: 'speaker.wave.2.fill',
    0x0F0085: 'captions.bubble.fill', 0x0F00AB: 'info.circle', 0x0F00C4: 'pencil', 0x0F00F4: 'arrow.up.arrow.down',
    0x0F0107: 'checkmark.circle', 0x1F44D: 'hand.thumbsup.fill', 0x1F44E: 'hand.thumbsdown.fill',
    0xE000: 'textformat.size',
}

UPM = 1000
# moonstone's icon glyphs sit around y=250 in a 750/-250 em; a 200-unit symbol (100 pt) becomes ~350 units, a bit
# smaller than LG's so they breathe inside round buttons the way tvOS's do
SCALE = 1.75
CENTER_Y = 250


def export(names):
    """SF Symbol name -> {w, h, d} (100 pt, y down), from the Swift exporter"""
    cmd = ['swift', str(HERE / 'sym2svg.swift'), WEIGHT, *names]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    out = {}
    for line in res.stdout.splitlines():
        item = json.loads(line)
        if 'd' not in item:
            print(f'warning: {item["name"]} not available here', file=sys.stderr)
            continue
        out[item['name']] = {k: item[k] for k in ('w', 'h', 'd')}
    return out


def build_font(symbols):
    fb = FontBuilder(UPM, isTTF=False)
    names = ['.notdef'] + [f'cr{cp:x}' for cp in FONT]
    fb.setupGlyphOrder(names)
    fb.setupCharacterMap({cp: f'cr{cp:x}' for cp in FONT if FONT[cp] in symbols})
    charstrings, metrics = {}, {}
    empty = T2CharStringPen(500, None)
    charstrings['.notdef'], metrics['.notdef'] = empty.getCharString(), (500, 0)
    for cp, sym in FONT.items():
        name = f'cr{cp:x}'
        glyph = symbols.get(sym)
        if not glyph:
            pen = T2CharStringPen(500, None)
            charstrings[name], metrics[name] = pen.getCharString(), (500, 0)
            continue
        width = round(glyph['w'] * SCALE)
        pen = T2CharStringPen(width, None)
        # svg y-down (0..h) -> font y-up, centred on CENTER_Y
        top = CENTER_Y + glyph['h'] * SCALE / 2
        parse_path(glyph['d'], TransformPen(pen, (SCALE, 0, 0, -SCALE, 0, top)))
        charstrings[name], metrics[name] = pen.getCharString(), (width, 0)
    fb.setupCFF('CRIcons', {'FullName': 'CR Icons'}, charstrings, {})
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=750, descent=-250)
    fb.setupNameTable({'familyName': 'CR Icons', 'styleName': 'Regular'})
    fb.setupOS2(sTypoAscender=750, sTypoDescender=-250, usWinAscent=750, usWinDescent=250)
    fb.setupPost()
    buf = io.BytesIO()
    fb.save(buf)
    return 'data:font/otf;base64,' + base64.b64encode(buf.getvalue()).decode('ascii')


def main():
    wanted = sorted(set(GLYPHS.values()) | set(FONT.values()))
    symbols = export(wanted)
    glyphs = {name: symbols[sym] for name, sym in GLYPHS.items() if sym in symbols}
    data = {'weight': WEIGHT, 'glyphs': glyphs, 'font': build_font(symbols)}
    OUT.write_text(json.dumps(data, separators=(',', ':')))
    print(f'{OUT.relative_to(HERE.parent.parent)}: {len(glyphs)} glyphs, {len(FONT)} font code points')


if __name__ == '__main__':
    main()
