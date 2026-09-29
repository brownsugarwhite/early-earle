// swift-tools-version: 5.9
import PackageDescription

// Local Capacitor plugin (SPM). The Capacitor CLI links it into ios/App/CapApp-SPM on `cap sync`
// (package name = fixName("@ee/liquid-glass") = "EeLiquidGlass").
let package = Package(
    name: "EeLiquidGlass",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "EeLiquidGlass",
            targets: ["LiquidGlassPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "LiquidGlassPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/LiquidGlassPlugin")
    ]
)
