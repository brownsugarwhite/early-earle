#!/usr/bin/env bash
# Generates the app icon and the PWA icons from Florian's splash
# (assets/ref-florian/02-splashscreen-illudiy-i.png) with CoreGraphics (no ImageMagick needed).
# The launch image is the loader's first frame instead: `node scripts/launch-frame.mjs` (LaunchLoader.imageset).
#   pnpm ios:icons
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="${1:-../../assets/ref-florian/02-splashscreen-illudiy-i.png}"
ICONSET=ios/App/App/Assets.xcassets/AppIcon.appiconset
PWA=public/icons
mkdir -p "$PWA"

TOOL="$(mktemp -d)/icons.swift"
cat > "$TOOL" <<'EOF'
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

// args: src out size zoom focusX focusY   (focus in source px, top-left origin; lands on the canvas centre)
let a = CommandLine.arguments
let src = URL(fileURLWithPath: a[1]), out = URL(fileURLWithPath: a[2])
let size = Int(a[3])!, zoom = Double(a[4])!, focus = CGPoint(x: Double(a[5])!, y: Double(a[6])!)

guard let source = CGImageSourceCreateWithURL(src as CFURL, nil), let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    FileHandle.standardError.write("cannot read \(src.path)\n".data(using: .utf8)!); exit(1)
}
let space = CGColorSpace(name: CGColorSpace.sRGB)!
let ctx = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0, space: space,
                    bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)! // opaque (App Store icons must not have alpha)
ctx.setFillColor(CGColor(colorSpace: space, components: [8 / 255, 27 / 255, 37 / 255, 1])!) // #081b25, the splash background
ctx.fill(CGRect(x: 0, y: 0, width: size, height: size))
ctx.interpolationQuality = .high
let scale = CGFloat(size) / CGFloat(image.width) * zoom
let w = CGFloat(image.width) * scale, h = CGFloat(image.height) * scale
let x = CGFloat(size) / 2 - focus.x * scale
let y = CGFloat(size) / 2 - (CGFloat(image.height) - focus.y) * scale
ctx.draw(image, in: CGRect(x: x, y: y, width: w, height: h))
let result = ctx.makeImage()!
let dest = CGImageDestinationCreateWithURL(out as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, result, nil)
guard CGImageDestinationFinalize(dest) else { exit(1) }
print("wrote \(out.lastPathComponent) \(size)x\(size)")
EOF

# Emblem centre of the splash (838x1428): x 435, y 655. zoom 1 = full source width fits the canvas.
render() { swift "$TOOL" "$SRC" "$1" "$2" "$3" "$4" "$5"; }
render "$ICONSET/AppIcon-512@2x.png" 1024 1.25 435 655         # App Store / home screen (opaque), emblem ≈ 75 % high
render "$PWA/icon-512.png"           512  1.25 435 655
render "$PWA/icon-192.png"           192  1.25 435 655
render "$PWA/icon-512-maskable.png"  512  0.78 435 655         # keeps the emblem inside the maskable safe zone
render "$PWA/apple-touch-icon-180.png" 180 1.25 435 655
echo "Icons written (launch image: node scripts/launch-frame.mjs)."
