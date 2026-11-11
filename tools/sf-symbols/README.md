# SF Symbols icons

The app's icons can use Apple's SF Symbols, generated on a Mac that has the
[SF Symbols app](https://developer.apple.com/sf-symbols/) (macOS 13 or later).

SF Symbols are licensed by Apple for use on Apple platforms, so nothing generated from them is committed:
`src/components/ui/sfSymbols.generated.json` is git-ignored. Without it the app falls back to its own simple
glyphs and to moonstone's icon font.

```sh
python3 -m venv .tools/venv
.tools/venv/bin/pip install fonttools
.tools/venv/bin/python tools/sf-symbols/build.py
```

- `sym2svg.swift` reads each symbol's vector glyph through AppKit and prints its SVG path.
- `build.py` writes the JSON with those paths (for `<Icon>` in `src/components/ui/Icons.js`) and an OpenType font,
  "CR Icons", whose glyphs sit at moonstone's icon code points: moonstone's own icons (video player, popups,
  dropdowns) then draw the SF Symbols too, because the build's moonstone patch puts "CR Icons" first
  (`patchMoonstoneTheme` in `gulpfile.mjs`).
