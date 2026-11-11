// Prints SF Symbols as SVG path data (JSON lines: name, bounds, d), taken from the symbol's own vector glyph.
// usage: swift sym2svg.swift <weight> name1 name2 ...
import AppKit

typealias PathFn = @convention(c) (AnyObject, Selector) -> Unmanaged<CGPath>?
let weights: [String: NSFont.Weight] = ["regular": .regular, "medium": .medium, "semibold": .semibold, "bold": .bold]
let args = CommandLine.arguments
let weight = weights[args[1]] ?? .semibold
let fmt = { (v: CGFloat) -> String in String(format: "%.2f", Double(v)).replacingOccurrences(of: ".00", with: "") }
for name in args.dropFirst(2) {
    guard let base = NSImage(systemSymbolName: name, accessibilityDescription: nil),
          let img = base.withSymbolConfiguration(NSImage.SymbolConfiguration(pointSize: 100, weight: weight)),
          let rep = img.representations.first,
          let glyph = rep.value(forKey: "_vectorGlyph") as AnyObject? else {
        print("{\"name\":\"\(name)\",\"missing\":true}"); continue
    }
    let sel = NSSelectorFromString("CGPath")
    guard let imp = glyph.method(for: sel), let path = unsafeBitCast(imp, to: PathFn.self)(glyph, sel)?.takeUnretainedValue() else {
        print("{\"name\":\"\(name)\",\"nopath\":true}"); continue
    }
    let b = path.boundingBoxOfPath
    var d = ""
    // the glyph's path is already y-down, like SVG: only move it to the origin
    let fx = { (x: CGFloat) -> CGFloat in x - b.minX }
    let fy = { (y: CGFloat) -> CGFloat in y - b.minY }
    path.applyWithBlock { el in
        let p = el.pointee.points
        switch el.pointee.type {
        case .moveToPoint: d += "M\(fmt(fx(p[0].x))) \(fmt(fy(p[0].y)))"
        case .addLineToPoint: d += "L\(fmt(fx(p[0].x))) \(fmt(fy(p[0].y)))"
        case .addQuadCurveToPoint: d += "Q\(fmt(fx(p[0].x))) \(fmt(fy(p[0].y))) \(fmt(fx(p[1].x))) \(fmt(fy(p[1].y)))"
        case .addCurveToPoint: d += "C\(fmt(fx(p[0].x))) \(fmt(fy(p[0].y))) \(fmt(fx(p[1].x))) \(fmt(fy(p[1].y))) \(fmt(fx(p[2].x))) \(fmt(fy(p[2].y)))"
        case .closeSubpath: d += "Z"
        @unknown default: break
        }
    }
    print("{\"name\":\"\(name)\",\"x\":\(fmt(b.minX)),\"y\":\(fmt(b.minY)),\"w\":\(fmt(b.width)),\"h\":\(fmt(b.height)),\"d\":\"\(d)\"}")
}
