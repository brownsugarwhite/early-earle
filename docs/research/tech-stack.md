# Technik-Recherche: Stack für App-first + Browser (Agent-Report, 2026-09-29)

> Roh-Report eines Recherche-Agenten. Sprache: Englisch. Aussagen mit *(unverified)* sind nicht belegt. Kondensierte Fassung: `docs/RESEARCH.md`.

# Tech stack research: premium 3D merge/2048 puzzle game (app-first, also runs in the browser), status 29 Sep 2026

## TL;DR
- **Top pick:** a TypeScript core running inside a native shell. three.js renders it, using WebGPURenderer with TSL shaders; three.js falls back to WebGL2 automatically. Capacitor 8 wraps it for iOS and Android. On iOS 26 a thin native SwiftUI layer draws the Liquid Glass menus and HUD. This is the best fit for one designer plus an AI agent: everything is text and code, changes show up instantly on a phone, the same build runs in the browser, and an in-app editor is easy to build.
- **Main trade-off:** on iPhones, the embedded web view (WKWebView) limits game drawing to **60 fps**. There is no public API to raise it. Native glass UI on top can still run at 120 Hz, and Android web views can run at 90/120 Hz.
- **Runner-up:** **Godot 4.7** (GDScript). It renders natively with Metal/Vulkan and can do 120 Hz. It has strong particles, IK and spring bones, text-based scene files, headless export and MCP servers. Its weak spot is the web build: WebGL2 "Compatibility" renderer only, and no C# on the web.
- **Jelly blobs:** don't simulate everything. Use the Slime Rancher recipe: a low-poly mesh, procedural jiggle and SDF face textures. Use real soft-body physics only for pokes and squishes; Rapier.js got soft bodies four days ago. Use SDF smooth-min blending only for the merge animation.
- **Backend:** Firebase (Auth, Firestore, Remote Config, Crashlytics) plus PostHog (analytics, feature flags, experiments). Both are free at launch scale.

---

## 1. Engine / renderer options

### 1.1 Platform facts that decide the architecture

| Topic | Status Sep 2026 |
|---|---|
| WebGPU in Safari 26 | Ships on macOS, iOS, iPadOS and visionOS; three.js, Babylon, PlayCanvas and Unity are all listed as working ([WebKit](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/), [gpuweb status](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status)) |
| WebGPU in WKWebView | Earlier Safari feature flags did not apply to web views. An Apple engineer says web views get WebGPU once it is on by default, and it is on by default in iOS 26 ([Apple forums](https://developer.apple.com/forums/thread/770862)). Check on a real device. |
| Chrome on Android | Since Chrome 121 on Android 12+ (Qualcomm/ARM GPUs). Imagination GPUs since 139. **Samsung Xclipse GPUs expected around 154** ([gpuweb](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status)) |
| Android WebView | Chromium's release notices name Android WebView as a WebGPU platform (a feature shipping in M139; compatibility mode in WebView 146) ([1](https://groups.google.com/a/chromium.org/g/blink-dev/c/8Fy8vnSyNic), [2](https://groups.google.com/a/chromium.org/g/blink-dev/c/N3RlLGCOTJ4)). Capacitor users still report WebGPU missing ([issue](https://github.com/ionic-team/capacitor/issues/8044)). **Check at runtime and keep WebGL2 as the baseline.** |
| Firefox | Windows since 141, macOS 145/147; Linux and Android planned for 2026 |
| Frame rate in WKWebView | **Capped at 60 Hz on iPhone.** WebKit bug [294338](https://www2.webkit.org/show_bug.cgi?id=294338) is still open. The only workarounds use private APIs ([plugin README](https://github.com/anthonyjuarezsolis/capacitor-high-refresh-rate) calls this "not zero risk"; App Review 2.5.1 forbids private APIs). CSS transform/opacity animations still run at 120 Hz. |
| JavaScript speed | WKWebView has a JIT compiler. Using JavaScriptCore directly in an app has no JIT and is reported ~12–15× slower on CPU-heavy JavaScript ([forum](https://developer.apple.com/forums/thread/728165)) |
| three.js WebGPURenderer | Import-and-go since r171, with automatic WebGL2 fallback ([utsubo](https://www.utsubo.com/blog/threejs-2026-what-changed)). Known reports: slower than the classic WebGLRenderer when drawing many separate meshes, and very slow first-time material setup ([#31055](https://github.com/mrdoob/three.js/issues/31055), [#30560](https://github.com/mrdoob/three.js/issues/30560), [#33821](https://github.com/mrdoob/three.js/issues/33821)). **Benchmark before committing.** |

### 1.2 Recommendation matrix

| Option (version) | 3D + particles | Custom shaders | Soft body / physics | Web export | iOS/Android app | In-app editor | AI-agent fit | Verdict |
|---|---|---|---|---|---|---|---|---|
| **three.js** (+R3F 9 stable; [v10 alpha](https://github.com/pmndrs/react-three-fiber/discussions/3665) adds WebGPU/TSL) | Strong 3D. Particles are do-it-yourself (TSL compute demo runs [500k particles](https://threejs.org/examples/webgpu_compute_particles.html)) or three.quarks (WebGL only) | TSL, which compiles to WGSL or GLSL | Rapier.js (soft bodies since Sep 2026) or custom XPBD | Native to the web, smallest | Through a web view; 60 Hz on iOS | Easiest: HTML overlay in the same app | **Best**: plain TypeScript, most training data, headless browser tests | **Top pick** |
| **Babylon.js 9** ([Mar 2026](https://blogs.windows.com/windowsdeveloper/2026/03/26/announcing-babylon-js-9-0/)) | Strong. GPU particles, Node Particle Editor, flow maps, attractors | Node Material Editor, WGSL/GLSL | Havok (rigid only); Rapier possible | Native | Web view, or [Babylon React Native](https://github.com/BabylonJS/BabylonReactNative) (maintained, limited) | Built-in inspector plus web node editors | Very good (TypeScript) | Equal alternative if the designer wants visual node editors |
| PlayCanvas | Good; mature WebGPU | GLSL/WGSL | Rigid + joints | Excellent | Web view | Cloud editor with [built-in MCP](https://github.com/playcanvas/editor); can't be embedded in your app | Good | Viable if you like its editor |
| Phaser 4 ([Apr 2026](https://phaser.io/news/2025/12/phaser-v4-release-candidate-6-is-out)) / PixiJS 8 | 2D only | 2D filters | Matter / Box2D | Excellent | Web view | Easy | Very good | Only for a 2.5D design; the globe needs 3D |
| **Godot 4.7** ([Jun 2026](https://80.lv/articles/godot-4-7-has-been-released)) | Very good. GPUParticles with a visual editor, CPU fallback | Godot shader language + visual shaders | Jolt is the default ([4.6](https://godotengine.org/releases/4.6/)), including SoftBody3D ([docs](https://docs.godotengine.org/en/stable/tutorials/physics/using_jolt_physics.html)); [SoftBody2D add-on](https://github.com/appsinacup/godot-softbody2d); [SpringBoneSimulator3D](https://gamefromscratch.com/godot-4-4-gets-jiggle-physics/); new IK system (4.6) | **WebGL2 Compatibility renderer only, no C#** ([docs](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)) | Native Metal/Vulkan, 120 Hz possible | Build it from Control nodes; [Xogot](https://godotengine.org/article/godot-showcase-xogot/) = Godot editor on iPad/iPhone | Good: GDScript, text `.tscn` files, headless CLI, [MCP servers](https://github.com/hi-godot/godot-ai) | **Runner-up** |
| Unity 6.6 ([Sep 2026](https://alternativeto.net/news/2026/9/unity-6-6-adds-webgpu-build-analysis-and-coreclr-prep/)) | Best tooling. VFX Graph needs compute shaders and Vulkan on Android ([reqs](https://docs.unity3d.com/Packages/com.unity.visualeffectgraph@13.1/manual/System-Requirements.html)) | Shader Graph | Obi Softbody (paid) | WebGPU production-ready in 6.6, but heavy; iOS out-of-memory issues ([forum](https://discussions.unity.com/t/webgpu-out-of-experimental-in-unity-6-6/1734694)) | Excellent | Runtime UI only | Weakest of the top tier: asset files are YAML with GUID references, slow edit/compile loop | Safe choice if the browser were optional. Runtime Fee is gone; free under $200K revenue ([Unity](https://unity.com/products/pricing-updates)) |
| Unreal 5 | AAA-grade | – | Chaos | No maintained web export | Overkill for casual | – | Weak | No |
| Defold 1.13 | 3D improving (morph targets, new lighting); particles are CPU-based | GLSL | No soft bodies | Excellent (~1 MB empty project) | Excellent | Editor HTTP API with `/eval` ([H1 2026](https://defold.com/2026/06/30/Defold-H1-2026/)) | Good (Lua, text files) | Great for 2D, too thin for 3D jelly |
| Cocos Creator 3.8 / COCOS 4 | Good | GLSL | Rigid only | Excellent | Good | Moving from the old editor to a new "PinK" IDE ([news](https://itsfoss.com/news/cocos-4-game-engine/)) | Roadmap is AI/MCP-first | Watch |
| Bevy 0.19 ([Jun 2026](https://bevy.org/news/bevy-0-19/)) | Modern renderer | WGSL | Rapier | WebAssembly | Rough | No editor yet | Medium (slow Rust compiles) | Too early |
| Flutter Flame / flutter_scene | 2D is great; 3D is still preview-only ([pub.dev](https://pub.dev/packages/flutter_scene)) | GLSL | Forge2D | OK | Good | Flutter UI | Good | Not for 3D |
| Apple-native (SpriteKit, RealityKit) | Good; SceneKit is being phased out ([WWDC25](https://developer.apple.com/videos/play/wwdc2025/288/)) | Metal | Built in | None | iOS only | – | – | Use only for UI chrome |
| Expo/React Native + [react-native-wgpu](https://github.com/wcandillon/react-native-webgpu) | Same three.js/TSL code, rendered natively through Dawn to Metal/Vulkan ([Shopify](https://shopify.engineering/webgpu-skia-web-graphics)) | TSL | WebAssembly libraries need native bindings (Hermes has no JIT on iOS) | Through react-native-web | Native surfaces; native Liquid Glass | React Native UI | Very good | Hedge; immature |

### 1.3 Wrappers
- **Capacitor 8**: uses Swift Package Manager by default, and 8.5 adopts UIScene ([Ionic](https://ionic.io/blog/capacitor-8-5-released)). It has ready plugins for Firebase ([Capawesome](https://capawesome.io/docs/sdks/capacitor/firebase/)), Sentry (with native crash reports) and Liquid Glass. **Recommended.**
- **Tauri 2 mobile**: uses the same web views with a Rust backend and has fewer mobile plugins. No advantage for a game.
- **Cordova**: legacy.
- **A fully custom WKWebView shell**: only worth it if Capacitor gets in the way. Capacitor already is a thin shell, and you can add your own Swift plugin to it.

### 1.4 Verdict
For "app-first but also browser" with one designer and an AI agent, **three.js + Capacitor** wins on the factors that matter most day to day:
- The agent can run the game in a browser, take screenshots and read the console.
- Content is plain TypeScript/JSON in git.
- The phone loads the dev server with live reload, so there is no build/sign/install cycle while iterating.
- The in-app editor is just another screen of the web app.
- The browser version is the same code, not a port.

The cost is 60 fps on iPhone and some web-view overhead: JavaScript garbage-collection pauses, extra cost per draw call, and memory limits. That is acceptable for a board of ~16–36 blobs, a few particle systems and an instanced globe.

**Pick Godot instead** if a prototype on a mid-range device can't hold a stable 60 fps, or if 120 Hz on iOS is a must-have.

---

## 2. Apple Liquid Glass (iOS 26)

**What it is.** A translucent material introduced at WWDC 2025. It bends and refracts what is behind it and adapts to the content underneath ([Apple Newsroom](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/)). It comes in two variants: *regular*, and *clear* (clear needs a dimming layer). Apple's guidance is to reserve it for the navigation layer that floats above content and to avoid stacking glass on glass. Reduce Transparency, Increase Contrast and Reduce Motion adjust it automatically ([WWDC25 "Meet Liquid Glass"](https://developer.apple.com/videos/play/wwdc2025/219/)).

**How apps adopt it.**
- Building with Xcode 26 gives standard system controls the glass look automatically.
- **SwiftUI** custom views: `.glassEffect(_:in:)` with tint and interactive options; `GlassEffectContainer` to group shapes (glass can't sample other glass, and grouped shapes can morph into each other); `glassEffectID` for morph transitions ([docs](https://developer.apple.com/documentation/SwiftUI/Applying-Liquid-Glass-to-custom-views)).
- **UIKit**: `UIVisualEffectView(effect: UIGlassEffect())` with `tintColor` and `isInteractive`; `UIGlassContainerEffect` for groups ([UIGlassEffect](https://developer.apple.com/documentation/uikit/uiglasseffect), [WWDC25 UIKit](https://developer.apple.com/videos/play/wwdc2025/284/)).

**In a hybrid app or a game.** Web content cannot use the material; there is no CSS for it. The only real option is a **native layer on top of the web view**. Community plugins already do this:
- [capacitor-liquid-glass](https://github.com/anthonyjuarezsolis/capacitor-liquid-glass) uses `UIGlassEffect` for a tab bar and search bar. It falls back to a blur material on iOS 15–25, does nothing on Android, and doesn't animate along with your web page transitions.
- Others: [stay-liquid](https://github.com/alistairheath/stay-liquid), [@capgo/capacitor-native-navigation](https://capgo.app/docs/plugins/native-navigation/).
- Expo has [expo-glass-effect](https://docs.expo.dev/versions/latest/sdk/glass-effect/) (`GlassView` / `GlassContainer`, iOS 26+, plain View fallback).

**Recommendation:** write a small custom Capacitor plugin that places a SwiftUI HUD above the web view. It would hold the score/moves pill, pause button, booster tray and sheets, and exchange state with the game as JSON messages. The game board stays the "content layer." Transparent areas must let touches pass through to the game. Unity and Godot can use the same overlay pattern through native iOS plugins, or imitate the look with a shader ([godot-liquid-glass](https://github.com/1234igor/godot-liquid-glass) needs 4.7 with the Compatibility renderer).

**Fallback for Android and web.**
- **Best option:** draw glass panels *inside the game canvas* as a TSL effect. A rounded-rectangle shape function provides the surface normal; offset the background sample using a squircle profile and Snell's law ([kube.io](https://kube.io/blog/liquid-glass-css-svg/)); add a slight colour split and a rim highlight. It is cheap (only a few rectangles) and looks the same everywhere.
- **For HTML menus:** `backdrop-filter: blur() saturate()` plus an inner highlight. Refraction through SVG `feDisplacementMap` in `backdrop-filter` **works only in Chromium**; Safari and Firefox fall back to plain blur.

**App Store implications.**
- Since **28 April 2026**, uploads must be built with Xcode 26 / the iOS 26 SDK ([Stora](https://stora.sh/blog/2026-04-01-ios-26-sdk-deadline-liquid-glass-ready)).
- The `UIDesignRequiresCompatibility` opt-out was temporary ([Donny Wals](https://www.donnywals.com/opting-your-app-out-of-the-liquid-glass-redesign-with-xcode-26/)). Reports say the iOS 27 SDK ignores it ([ecorpit](https://ecorpit.com/ios-27-liquid-glass-xcode-27-migration-guide-2026/)).
- No guideline requires custom game UI to use glass. The relevant rules are elsewhere:
  - **2.5.1**: public APIs only. This rules out the 120 Hz WebKit hacks.
  - **4.2**: an app must be more than a repackaged website. Native chrome, haptics and Game Center help here.
  - **2.5.2**: ship the code inside the app; don't download new functionality.
  - **5.2.5**: don't imitate Apple's own apps.
  
  ([Guidelines](https://developer.apple.com/app-store/review/guidelines/))

---

## 3. Soft-body / jelly characters on mobile

**How Slime Rancher does it** ([frame breakdown](https://pixelalchemy.dev/posts/a-frame-of-slime-rancher/)):
- A shared 238-vertex body mesh, deformed per vertex on the CPU. Special effects use vertex shaders.
- Faces are drawn in extra passes using small **SDF textures** (~64×64), so eyes and mouths stay crisp at any size.
- "Extra bits" (ears, tails, wings) are separate meshes.
- Hybrid "largo" slimes combine features of two slime types. That maps directly onto merge mechanics.

**Recommended layers, cheapest first:**
1. **Mesh plus procedural jiggle (default).** A few hundred vertices. Spring-damper squash and stretch that preserves volume, and a few low-frequency wobble modes driven by impacts and speed. Lighting: fresnel rim, "wrap" diffuse as fake subsurface scattering, specular highlight, an inner gradient, and background refraction for translucent species. SDF face textures on top. Costs almost nothing.
2. **Physical squish where touch matters.** A coarse soft-body "cage" that drives the visible mesh. **Rapier 0.36 (25 Sep 2026)** added shape matching, spring/XPBD constraints, FEM, pressurized blobs, plasticity, tearing and cage skinning, in 2D and 3D, including the JavaScript/WebAssembly packages ([Dimforge](https://dimforge.com/blog/2026/09/25/advanced-soft-bodies-for-games-in-the-rapier-physics-engine/), [docs](https://rapier.rs/docs/user_guides/c/soft_bodies/)). A custom alternative in TypeScript is shape matching ([Müller 2005](https://dl.acm.org/doi/10.1145/1073204.1073216)) or XPBD ([Ten Minute Physics](https://matthias-research.github.io/pages/tenMinutePhysics/10-softBodies.pdf)); JellyCar-style pressure springs are the same idea.
   - Other engines: Godot SoftBody3D (Jolt) and the SoftBody2D add-on (a lattice of 2D rigid bodies driving a Skeleton2D); Unity's paid [Obi Softbody](https://obi.virtualmethodstudio.com/performance.html) (722 particles / 33.5k vertices ≈ 2.2 ms on desktop).
   - Matter.js soft-body composites are 2D and CPU-only.
   - Box2D v3 has no dedicated soft-body type.
   - LiquidFun is legacy.
3. **The "viscous merge" moment.** For ~300 ms, draw both blobs as signed distance fields inside a bounding quad. Blend them with Inigo Quilez's **smooth minimum** ([smin](https://iquilezles.org/articles/smin/)) while animating the blend radius *k* and pulling the centres together. Then cross-fade to the merged mesh. On a mostly top-down board, a **2D SDF with a height-derived normal** gives a near-free 3D look. The three.js `MarchingCubes` add-on ([example](https://threejs.org/examples/#webgl_marching_cubes)) also works but costs more CPU.
4. **Hero liquid effects (WebGPU only).** MLS-MPM fluid simulation on the GPU handles ~100k particles on integrated GPUs and runs on an iPad Air 3 at "small" settings ([WebGPU-Ocean](https://github.com/matsuoka-601/WebGPU-Ocean)). Use it only for celebrations, with a fallback.

**Attaching accessories:**
- Store each anchor in rest pose: either a direction from the blob centre, or a triangle plus barycentric weights.
- Each frame, compute the deformed surface point and normal. On a mesh, interpolate them. On an SDF, find the surface along the anchor ray and take the normal as `normalize(∇f)`.
- Build a stable orientation frame from the normal and the body's forward direction, and parent the part to it.
- Add spring bones for follow-through motion.
- Keep a single SDF definition that runs both on the CPU (TypeScript) and on the GPU (TSL), so anchors match what is drawn.

---

## 4. Procedural character systems

**How Spore did it:**
- **Skin** was built from metaballs (4th-order polynomial blobs) placed along the spine and limbs, then turned into a mesh. Bone weights came from which body part created which metaball ([Hecker's notes](https://chrishecker.com/My_Liner_Notes_for_Spore)).
- **Parts** were pre-authored, adjustable "Rigblocks."
- **Texturing:** automatic UV layout in ~10 ms, and procedural paint applied by particles moving across the mesh.
- **Animation** was authored once on sample creatures and stored in a general form: semantic tags (graspers, feet) and body-relative coordinates. A particle-based IK solver then played it on any body shape ([SIGGRAPH 2008 paper](https://www.chrishecker.com/images/c/cb/Sporeanim-siggraph08.pdf)).

**Modern equivalents:**
- **Rigs built in code.** Blobs don't need Rigify or Mixamo; those are humanoid-centric. Create a small rig in code at load time: root, core, top, bottom and radial bones.
- **Follow-through motion:** the VRM spring-bone standard ([VRMC_springBone](https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_springBone-1.0/README.md)), its runtimes [three-vrm springbone](https://pixiv.github.io/three-vrm/docs/modules/three-vrm-springbone.html) and [wiggle bones](https://wiggle.three.tools/), and Godot's SpringBoneSimulator3D (a port of VRM spring bones).
- **IK:** Godot 4.6 includes TwoBoneIK3D, FABRIK3D, CCDIK3D and others; three.js has CCDIKSolver.

**Genome / DNA approach.** Describe each creature as `{tier, bodyShape, palette, pattern, material{gloss, translucency}, eyes{type, count}, mouth, accessories[{slot, partId, scale, tint}], motion{bounciness, blinkRate}}`.
- Generate it from `hash(seed, tier, id)` with a fixed-seed random generator, so the same seed always gives the same creature.
- Add compatibility tables so incompatible parts never combine.
- On a merge, the child gets the next tier's signature species and **inherits cosmetic genes from both parents**, like Slime Rancher's largos. That makes every blob unique while staying authored.

**Blender pipeline:**
- Author the parts library in one `.blend` file, with `SOCKET_<slot>` empties as attachment points.
- With *Include → Custom Properties* enabled, custom properties are exported as glTF `extras`. Shape keys become morph targets, and actions/NLA tracks become named animations ([exporter docs](https://github.com/KhronosGroup/glTF-Blender-IO/blob/main/docs/blender_docs/scene_gltf2.rst)).
- Automate exports with headless Blender (`blender -b parts.blend -P export.py -- …`) in CI, then optimize with glTF-Transform (meshopt, KTX2).
- The official **[Blender Lab MCP](https://www.blender.org/lab/mcp-server/)** (v1.0.3, Blender 5.1+) runs code an AI generates inside Blender with no safeguards. Use it in a sandbox or VM.

---

## 5. Particles and VFX
- **three.js:**
  - TSL compute particles on WebGPU (examples for compute particles, attractors, fire/smoke).
  - [three.quarks](https://github.com/Alchemist0823/three.quarks): mature, has an editor, JSON export, trails and sub-emitters, R3F support, but **no WebGPU yet**.
  - [Three-VFX](https://github.com/mustache-dev/Three-VFX): WebGPU-first with a CPU fallback, but a young project.
  - Recommendation: write your own ~500-line TSL particle module (easy for the agent) with an instanced CPU fallback.
- **Babylon 9**: GPU particles, Node Particle Editor, flow maps and attractors, all built in. The best out-of-the-box web VFX tooling.
- **Godot**: GPUParticles2D/3D (compute on Metal/Vulkan, also works in the Compatibility renderer); official [Effekseer plugin](https://github.com/effekseer/EffekseerForGodot4) for 4.4+.
- **Unity**: the Shuriken particle system is the safe mobile default; VFX Graph needs compute shaders.
- **Effekseer**: free MIT effects tool with runtimes for Unity, Unreal, Godot and WebGL ([EffekseerForWebGL](https://github.com/effekseer/EffekseerForWebGL)). Good if the designer wants to author effects.
- **Rive**: official MIT runtimes for Web, React, Apple, Android, React Native, Flutter, Unity, Unreal and C++ ([docs](https://rive.app/docs/runtimes/getting-started)); Defold has an [official extension](https://defold.com/extension-rive/); Godot only has unofficial ones ([RiveGD](https://github.com/maidopi-usagi/RiveGD)). **The free plan can't export for runtime.** Cadet costs about $9/seat/month billed annually (about $17 month-to-month); Voyager about $32–39 ([pricing](https://rive.app/docs/account-admin/pricing), [announcement](https://community.rive.app/c/announcements/free-to-create-9-to-ship-cadet-is-live)).
- **Lottie / dotLottie**: free. State machines and theming. Runtime built on ThorVG, with WebGL2/WebGPU web backends ([dotlottie-web](https://github.com/lottiefiles/dotlottie-web)).
- **Spine**: Essential $69 (no meshes), Professional $379, Enterprise required above $500K revenue. Integrating the runtimes into a new product requires an editor license ([purchase page](https://esotericsoftware.com/spine-purchase)).
- **My pick**: dotLottie or Rive for UI polish, SDF textures for faces, TSL particles for the game itself.

---

## 6. Procedural spherical / "infinite" world map
- **Fake curvature (cheapest, truly infinite).** Keep the world flat and bend it in the vertex shader: lower each vertex by `y -= k·(x²+z²)` for a planet-like fall-off ([Animal Crossing "rolling log" write-up](https://alastaira.wordpress.com/2013/10/25/animal-crossing-curved-world-shader/), [Godot version](https://github.com/lynnpepin/rollinglogshader)). Three things must bend too: object bounding boxes (or objects get culled too early), the shadow/depth passes, and tap raycasts.
- **Real small sphere (for the "rotate the globe" view).**
  - Cube-sphere split into 6 quadtrees for chunked level of detail ([Lague](https://www.patreon.com/posts/behind-scenes-21195932), [Godot example](https://github.com/cuberact/godot-cuberact-planet-chunked-lod)). A small stylized planet barely needs LOD.
  - Or a geodesic grid with modular tiles, like Stålberg's *Planet* ([breakdown](https://www.boristhebrave.com/2022/12/18/how-does-planet-work/)). WFC isn't required; his later work uses it.
  - For uniform points: a Fibonacci lattice (with a tweak that improves spacing by up to 8.3% ([Roberts](https://extremelearning.com.au/evenly-distributing-points-on-a-sphere/))) plus Delaunay/Voronoi on the sphere ([Red Blob](https://www.redblobgames.com/x/1842-delaunay-voronoi-sphere/)).
- **Recommended hybrid.** Each planet is a chapter of roughly 50–100 levels.
  - **Level path:** a spiral from pole to pole (loxodrome or constant-speed spiral). Fibonacci-lattice points in index order already form one.
  - **Terrain and biomes:** 3D simplex noise sampled on the sphere, so there are no seams. Biome = `hash(seed, planet, cell)`.
  - **Decoration:** Poisson-disc scattering with rules. Authored set pieces every 10 levels keep it feeling designed.
  - **Endless content:** new planets are generated from the seed, so content never repeats.
  - **Camera:** trackball rotation with inertia, and auto-rotation to the next level.
  - **Zooming in:** switch to the curved-plane view.
- **Existing examples:** Super Mario Odyssey's spinnable kingdom globe ([guide](https://www.supercheats.com/super-mario-odyssey/walkthrough/how-to-unlock-odyssey-globe-secret)), Mario Galaxy's planetoids, Stålberg's Planet, and Before We Leave's hex planets. Big casual puzzlers use vertical scrolling maps, so a globe is a differentiator. The "next level" button must stay one thumb-tap away.

---

## 7. Minimal backend for a solo developer
- **Saves:**
  - Game Center saved games (GKSavedGame) require iCloud and are Apple-only ([Apple](https://developer.apple.com/documentation/gamekit/saving-the-player-s-game-data-to-an-icloud-account)). CloudKit would force Android players to use an Apple ID.
  - Use **Firebase**: Auth free up to 50K MAU; Firestore free for 1 GiB, 50K reads/day and 20K writes/day ([pricing](https://firebase.google.com/pricing)).
  - Save locally first and sync when possible. Merge conflicts per field; progress only ever moves forward.
  - Start with anonymous sign-in and add Sign in with Apple / Google later. Guideline 4.8 applies once you offer a third-party login.
- **Supabase** is the alternative: 500 MB database, 50K MAU; free projects pause after 7 days of inactivity ([pricing](https://supabase.com/pricing)).
- **Remote config and A/B tests on difficulty:**
  - [PostHog free tier](https://posthog.com/pricing): 1M events, 1M flag requests (experiments share this quota), 5K session replays, 100K error events. It behaves the same in the web view and in the browser.
  - Firebase Remote Config and A/B Testing are also free.
- **Crash reporting:**
  - Crashlytics is free but native-only; web support is announced ([I/O 2026](https://firebase.blog/posts/2026/05/google-io-2026-announcements/)).
  - Sentry's free Developer plan covers ~5K errors/month. Its [Capacitor SDK](https://github.com/getsentry/sentry-capacitor) includes native crashes, and there is a [Godot SDK](https://github.com/getsentry/sentry-godot).
- Game Center leaderboards and the new Challenges feature are optional extras on iOS.

---

## 8. Recommended stack

**Primary: web core in a native shell**
- **Code:** TypeScript + Vite monorepo. The game simulation is deterministic, has no DOM dependencies and is kept separate from rendering: board, merges, seeded random numbers, genomes, globe generator.
- **Rendering:** three.js WebGPURenderer + TSL (WebGPU on iOS 26 and Chrome, WebGL2 fallback). Postprocessing kept minimal (half-resolution bloom), KTX2 textures, render resolution capped at 2× on 3× screens.
- **Jelly:** jiggle mesh + SDF faces. Rapier.js soft bodies only where squish matters. SDF smooth-min for merges.
- **Effects:** custom TSL particles. dotLottie or Rive for UI flourishes.
- **UI:** HTML menus plus the in-app editor at an `?edit` route: touch-friendly panels that save JSON through a dev-server endpoint into git. On iOS 26, a custom Capacitor plugin draws SwiftUI Liquid Glass chrome. Android and web get TSL/CSS glass.
- **Shell:** Capacitor 8.5 with Haptics, Filesystem, Firebase (Capawesome), Sentry and in-app purchases.
- **Content:** Blender 5.x + Blender Lab MCP + headless export to glTF with sockets and extras.
- **Automated tests:** Playwright screenshot comparisons on fixed seeds, plus bot players that solve levels to tune difficulty. TestFlight and Play builds from CI.
- **Backend:** Firebase + PostHog.

**Fallback: Godot 4.7.** GDScript. Mobile renderer (Metal/Vulkan) for the apps, Compatibility renderer (single-threaded) for the web. Jolt, SpringBoneSimulator3D, the IK system, GPUParticles, Effekseer, Sentry Godot. Liquid Glass through a custom iOS plugin overlay or a shader. Godot MCP servers and headless export for automation.

**Hedge that keeps the same code:** because the core has no DOM dependencies, the three.js/TSL rendering could move to Expo + react-native-wgpu for native frame rates and native `expo-glass-effect`. This only works if physics stays in TypeScript, since WebAssembly libraries would need native bindings.

---

## 9. Risks and unknowns to test in a prototype (with pass/fail gates)
1. **Frame rate in WKWebView:** 60 fps stable, with 99th-percentile frame time under 20 ms, for 10 minutes. Test case: 36 blobs + particles + globe on an iPhone 12-class device and a mid-range Android. Also check Low Power Mode and heat build-up.
2. **three.js WebGPURenderer's WebGL2 fallback vs the classic WebGLRenderer** on Android web views and on iOS devices below 26, plus shader-compile stalls on first use. Warm shaders up at load with `compileAsync`.
3. **WebGPU in the Android WebView** on real devices, especially Samsung Exynos/Xclipse. Check at runtime and fall back.
4. **Rapier soft bodies are four days old:** API changes and stability. Measure cost for 16–36 blobs; a custom spring or shape-matching fallback should be ready.
5. **Liquid Glass overlay:** touch pass-through, keeping it in sync with canvas animations, GPU cost of glass over a constantly animating canvas, and changes in iOS 27.
6. **Memory:** stay under the point where iOS kills the WKWebView content process. Target under ~400 MB and test 30-minute sessions.
7. **App Review:** 4.2 (more than a website) and 2.5.x (no private APIs, no downloaded code). Plan native features from day one.
8. **Globe usability:** can players always find the next level? Also the curved-world side effects on culling, shadows and tap picking.
9. **Pipeline and licensing:** stable socket and naming conventions from Blender to glTF; sandboxing the Blender MCP; Rive and Spine license costs; availability of ad and purchase SDKs as Capacitor plugins (not researched here).
10. **If you switch to Godot:** size of the WebAssembly build, Safari WebGL2 quirks, and visual differences between the Mobile and Compatibility renderers.

### Sources (not linked above)
[Safari feature flags / TypeGPU](https://docs.swmansion.com/TypeGPU/blog/troubleshooting/) · [WebKit bug 272165](https://bugs.webkit.org/show_bug.cgi?id=272165) · [Android Jetpack WebGPU](https://developer.android.com/develop/ui/views/graphics/webgpu) · [Capacitor 8](https://ionic.io/blog/announcing-capacitor-8) · [Tauri 2](https://v2.tauri.app/blog/tauri-20/) · [Unity: canceling the Runtime Fee](https://unity.com/blog/unity-is-canceling-the-runtime-fee) · [Godot 4.3](https://godotengine.org/releases/4.3/) · [Godot GPUParticles in Compatibility renderer, issue #97903](https://github.com/godotengine/godot/issues/97903) · [Godot WebGPU fork](https://godotwebgpu.com/) · [Expo SDK 54 changelog](https://expo.dev/changelog/sdk-54) · [Expo Liquid Glass blog](https://expo.dev/blog/liquid-glass-app-with-expo-ui-and-swiftui) · [GlassEffectContainer docs](https://developer.apple.com/documentation/swiftui/glasseffectcontainer) · [MLS-MPM article on Codrops](https://tympanus.net/codrops/2025/02/26/webgpu-fluid-simulations-high-performance-real-time-rendering/) · [Spore paper page](https://www.chrishecker.com/Real-time_Motion_Retargeting_to_Highly_Varied_User-Created_Morphologies) · [Red Blob planet generation code](https://github.com/redblobgames/1843-planet-generation) · [Sentry pricing](https://sentrypricing.com/free-plan) · [Sentry Godot SDK announcement](https://blog.sentry.io/introducing-sentrys-godot-sdk-1-0-alpha-with-support-for-godot-4-5-beta/)
