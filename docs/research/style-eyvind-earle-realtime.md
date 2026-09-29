# Stil-Recherche: Eyvind Earle in Echtzeit (Agent-Report, 2026-09-29)

> Roh-Report eines Recherche-Agenten. Sprache: Englisch. Aussagen mit *(unverified)* sind nicht belegt. Kondensierte Fassung: `docs/RESEARCH.md`.

I found enough to build a concrete recipe, though some gaps remain (listed at the end). Four points drive it. Earle's prints were literally stacks of flat, hard-edged ink layers, so banded, palette-indexed shading is faithful to his work rather than a compromise. His long shadows imply a sun about 11° above the horizon. The most useful prior art is a Texas A&M thesis that gave each tree its own smooth shadow geometry. Tree dots should be real instanced shapes, not a screen-space pattern.

# Eyvind Earle in real time: research report

## 1. Style analysis

**Composition**
- **Horizontals and verticals.** Disney art director Michael Giaimo says most Earle compositions are built from horizontal and vertical planes and are strongly driven by shape ([Disney History 101](https://www.disneyhistory101.com/disneyhistory101guidedtours/tag/Eyvind+Earle)). For *Sleeping Beauty* Earle wanted "stylized, simplified Gothic": tall perpendicular lines like cathedral piers. He straightened trees that would have curved and arranged bushes into geometric, tapestry-like patterns ([Artsy](https://www.artsy.net/article/artsy-editorial-artist-made-disneys-sleeping-beauty-enchanting-impossible-animate)).
- **Flat but deep.** In a 1979 interview Earle said he followed van Eyck: a foreground object and a tree miles away are painted equally sharp, with no photographic focus falloff ([Elise Sigh](https://elisesigh.substack.com/p/eyvind-earle-the-artist-behind-sleeping)).
  - The perspective reads as flat and static, like a manuscript, built from opaque geometric shapes in close tones ([ANIMaD](https://animad.gr/2024/12/18/my-favorites-eyvind-earles-background-art-for-sleeping-beauty/)).
  - Depth comes from overlap, relative scale and line weight rather than strict perspective ([Joshua Elek](https://joshuaelek.com/water-color/master-study-eyvind-earle/)). He laid in the lighter distant shapes first ([Hi-Fructose](https://hifructose.com/2026/03/12/uncanny-valley-the-oil-paintings-of-the-late-eyvind-earle-still-have-a-resounding-influence-on-artists-viewers-today/)).
- **Influences.** The Très Riches Heures, Dürer, Bruegel, van Eyck, Gothic art and Persian miniatures, plus modernism as filtered through the UPA studio ([D23](https://d23.com/sleeping-beauty-stunning-art/), [Walt Disney Family Museum](https://www.waltdisney.org/blog/eyvind-earle-artistic-devotion-distinction-sleeping-beauty)). The forests echo millefleurs tapestries such as *The Lady and the Unicorn* ([DailyArt](https://www.dailyartmagazine.com/sleeping-beauty-medieval-tapestry/)).

**Shape first, then dots**
- He started with a dark underpainting and strong silhouettes. Each big shape was then split into smaller, calligraphic detail: a blob for a bush, worked up with smaller and smaller leaves ([Gurney Journey](http://gurneyjourney.blogspot.com/2019/02/eyvind-earle-video-bio.html)). Layers go from dark to light within one hue ([Peruchi](https://charleneperuchi.substack.com/p/eyvind-earle-the-artist-who-made-sleeping-beauty-a-visual-masterpiece)).
- In his late oils he used:
  - an acrylic underpainting;
  - oil for hard graphic edges and high-contrast color planes;
  - tens of thousands of tiny bright dots from a fine brush, the finest made with a pen tip;
  - glazes to finish ([Hi-Fructose](https://hifructose.com/2026/03/12/uncanny-valley-the-oil-paintings-of-the-late-eyvind-earle-still-have-a-resounding-influence-on-artists-viewers-today/)).
- Foliage reduces to Cézanne-like cubes, pyramids and spheres. Trees become thin threads, bushes become ordered shapes, and hills have soft, body-like contours ([Mencarelli](https://www.elenamencarelli.com/awaking-beauty-the-art-of-eyvind-earle/)).

**Shadow and light**
- His shadows are knife-edged, ink-dark shapes lying across soft fields, and the darkness is what gives the landscapes their grandeur ([Hi-Fructose](https://hifructose.com/2026/03/12/uncanny-valley-the-oil-paintings-of-the-late-eyvind-earle-still-have-a-resounding-influence-on-artists-viewers-today/); [Brian Sibley](http://briansibleysblog.blogspot.com/2008/11/man-who-drew-trees.html)).
- In one painting that Elek studied, small figures cast shadows about 5× their height ([Elek](https://joshuaelek.com/water-color/master-study-eyvind-earle/)). That puts the sun about 11° above the horizon.
- In fully lit areas, detail disappears into flat light (same source).
- Stoic's *The Banner Saga* copied this directly: long shadows as if the sun were always setting, and palettes anchored by near-black ([Polygon Treehouse](https://www.polygon-treehouse.com/blog/2018/3/7/inspiration-corner-eyvind-earle)).

**Color**
- Giaimo describes the colors as jewel-like, with analogous hues blended together ([Disney History 101](https://www.disneyhistory101.com/disneyhistory101guidedtours/tag/Eyvind+Earle)).
- Key hues came from the Très Riches Heures: lapis blue, yellow-green, shell pink and pale blue ([D23](https://d23.com/sleeping-beauty-stunning-art/)).
- Disney's paint lab mixed new gem-like hues for him ([Hi-Fructose](https://hifructose.com/2026/03/12/uncanny-valley-the-oil-paintings-of-the-late-eyvind-earle-still-have-a-resounding-influence-on-artists-viewers-today/)).
- His palettes are often tightly restricted, e.g. blues, yellows and blacks ([Elek](https://joshuaelek.com/water-color/master-study-eyvind-earle/)).
- A background could take up to 10 days, against about one day for a typical Disney background ([Walt Disney Family Museum](https://www.waltdisney.org/blog/eyvind-earle-artistic-devotion-distinction-sleeping-beauty)).

**Serigraphs (from 1974)**
- Earle treated screen printing as a medium in its own right and made new works in it rather than copying paintings ([About Serigraphs](https://eyvindearle.com/about-serigraphs/)). He made his own color separations and later printed in his own studio ([Saper Galleries](https://www.sapergalleries.com/Earle.html)).
- Each color needs its own separation (opaque ink on acetate, or cut rubylith), which is exposed onto a photo-stencil screen. The print *Fire Magic* needed 200 screens ([Glossary](https://eyvindearle.com/glossary/)).
- I found no source for a typical color count per print, so the "30+" figure is unverified.
- **What this means for rendering:** each print is a stack of flat, opaque, hard-edged layers, and gradients are many stepped layers.

**Earle trait → real-time translation**

| Earle trait | Real-time translation |
|---|---|
| Horizontal bands, Gothic verticals | Stacked terrain bands through stepped distance fog; straight, thin trunks; low, level camera |
| Same sharpness near and far | No depth of field, blur or bloom; depth from value steps only |
| Silhouette first, then dots | Dark simple canopy shape plus instanced light dots |
| Knife-edged long shadows | Sun at 8–12°; anti-aliased hard shadows merged with the shading terminator |
| Jewel tones and near-black | 16–24-color palette; tinted near-black, never pure black |
| Serigraph layers | Quantized color ramps, flat fills, stepped sky |

## 2. Prior art

| Project | How it works | Engine | Takeaway / mobile note |
|---|---|---|---|
| *The Banner Saga* | Hand-painted 2D in Earle's style; long sunset shadows as world-building | 2D | Shape discipline matters more than technology ([80.lv](https://80.lv/articles/the-banner-saga-background-artist-interview)) |
| Murphy & Galanter, Texas A&M (SIGGRAPH 2014/15) | Trees from L-systems and noise; toon shading; dots and linework as real point/line geometry; **separate smooth shadow geometry per tree**; level of detail | Houdini | Proxy shadow casters and geometric dots carry over directly ([SIGGRAPH history](https://history.siggraph.org/experience/developing-stylized-trees-and-landscapes-inspired-by-eyvind-earle-by-murphy-and-galanter/), [thesis](https://oaktrust.library.tamu.edu/items/a6a75e61-6f79-4aa2-bc54-18a61fbedfcd)) |
| Daniel Fernandez NPR study; BlenderArtists tribute | Procedural EEVEE shaders; toon-shaded flat areas | Blender | Bake before shipping ([ArtStation](https://www.artstation.com/artwork/68EKnO), [BlenderArtists](https://blenderartists.org/t/eyvind-earle-tribute/1239039)) |
| Tyler Parker's Earle bush | Earle's blob-then-leaves method, painted in VR | Quill | About 271k triangles, so bake it to an impostor ([Sketchfab](https://sketchfab.com/3d-models/eyvind-earle-bush-081c0a51cce341b78d4050be23a256c6)) |
| *Open Season* (Sony Imageworks) | Earle-influenced design; pines as stacked cones; needle clumps on cards arranged into tree shapes | Film CG | Card-cluster trees work well on mobile ([AWN](https://www.awn.com/animationworld/open-season-diary-2d-3d-production-design)) |
| *Röki* (Polygon Treehouse) | No lights or lightmaps, only color choices; proximity-based tint/brightness pseudo-lights; noise on background gradients to stop banding | 3D, flat-shaded | Cheapest possible shading ([blog](https://www.polygon-treehouse.com/blog/2017/6/23/the-art-style-of-roki-part-one)) |
| *Firewatch* (Campo Santo) | Fog color read from a 1D gradient indexed by depth, giving layered silhouettes | Unity | One texture read ([Alisavakis](https://halisavakis.com/my-take-on-shaders-firewatch-multi-colored-fog/), [GDC Vault](https://gdcvault.com/play/1022295/The-Art-of), [Thumbsticks](https://www.thumbsticks.com/gdc-2015-the-art-of-firewatch/)) |
| *Sable* (Shedworks), as reproduced by others | Two-tone lit/shadow shading from one directional light; screen-space edges from depth and normals; hatching | Unity / three.js | The extra normal buffer and full-screen edge filter cost bandwidth on mobile ([colesloow](https://github.com/colesloow/moebius_shaders), [Heckel](https://blog.maximeheckel.com/posts/moebius-style-post-processing/)) |
| *Pentiment* (Obsidian) | Woodcut/manuscript look; camera on fixed tracks; characters not scaled with distance | Unity | Flat medieval perspective comes from constraining the camera ([Game Developer](https://www.gamedeveloper.com/art/deep-dive-the-art-of-pentiment)) |
| *Cuphead* (Studio MDHR) | Hand-inked frames, watercolor backgrounds | Unity | The look lives in the assets, not in shaders ([GamesRadar](https://www.gamesradar.com/the-making-of-cuphead/)) |

Media Molecule's *A Long Climb Ago* also names Earle and Mary Blair as influences ([Dreams docs](https://docs.indreams.me/en/game-info/mm-originals/a-long-climb-ago/world)).

## 3. Techniques

### (a) Razor-sharp, elongated shadows

**Why low sun is hard for shadow maps**
- Shadow length is h / tan θ, so at θ = 11° a shadow is about 5× the caster's height.
- Shadow-map texels on the ground stretch by about 1/sin θ (roughly 5×) along the light direction, but not across it. The long sides of a shadow therefore stay sharp and only the tip gets coarse.
- Surfaces hit at grazing angles add aliasing and "shadow acne" (speckled self-shadowing) ([Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/dxtecharts/common-techniques-to-improve-shadow-depth-maps)).

**Options**

| Technique | Edge quality | Cost on mobile | Best use |
|---|---|---|---|
| Shadow map, re-sharpened after filtering | Clean and anti-aliased, looks vector-drawn | One depth pass; one comparison read per pixel | Default |
| Horizon map | Hard | Two RGBA8 textures; bake once; moving sun is fine | Terrain self-shadowing |
| Analytic proxy shapes (sphere, ellipsoid, capsule) | Mathematically exact | Arithmetic per caster tested; needs a spatial grid | Tree shadows; low-end tier |
| Planar projection (three.js `ShadowMesh`) | Exact | Very cheap | Flat ground only ([example](https://threejs.org/examples/webgl_shadowmesh.html)) |
| Stencil shadow volumes | Pixel-exact | Very heavy fill rate; low sun makes volumes long | Avoid ([GameDev.net](https://www.gamedev.net/forums/topic/708439-stencil-shadow-volumes/)) |
| Ray-marched signed distance fields | Hardness tunable with k | Many scene evaluations per pixel | Offline baking ([iq](https://iquilezles.org/articles/rmshadows/)) |

**Re-sharpened shadow maps**
- Fit the light's orthographic view tightly to what is visible, plus an extra margin toward the sun of h_max / tan θ.
- Move the light view in whole-texel steps to stop shimmering, and use slope-scaled bias plus normal offset ([Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/dxtecharts/common-techniques-to-improve-shadow-depth-maps)).
- Read the shadow map once through a comparison sampler: `sampler2DShadow` in WebGL2, or `textureSampleCompare` with a linear comparison sampler in WebGPU. The hardware returns a 2×2 filtered result ([WebGPU Unleashed](https://shi-yan.github.io/webgpuunleashed/Advanced/shadow_mapping.html), [MDN](https://developer.mozilla.org/en-US/docs/Web/API/GPUSampler)).
- Then threshold that result again with `smoothstep(0.5 ± fwidth)`. You get straight-segment edges with no stair-steps and no blur.
- In three.js, `BasicShadowMap` is unfiltered and jagged, and PCF is the default ([docs](https://threejs.org/docs/#api/en/renderers/WebGLRenderer.shadowMap)). The WebGPU renderer implements its filters as swappable shader nodes, so a re-sharpening filter is a small custom node ([ShadowFilterNode notes](https://github.com/oneilltomhq/three-rs/issues/168)).
- Toon RP, a Unity pipeline verified on Android (GLES3/Vulkan) and WebGL2, exposes crisp shadows with threshold and smoothness controls ([Toon RP](https://github.com/Delt06/toon-rp)).

**Horizon maps**
- For each texel, store the maximum horizon angle in 8 directions, packed into two RGBA8 textures. At runtime, a pixel is shadowed if the sun is below that angle ([dasilvagf](https://dasilvagf.github.io/posts/2020/08/fun-with-horizon-maps/)).
- The data lives in the planet's own texture space, so rotating ("rolling") the planet never forces a recompute.

**Analytic proxy shapes**
- Represent each tree canopy as an ellipsoid. In the ground shader, cast a ray toward the sun and test only the casters in grid cells on the sun side.
- Inigo Quilez's sphere-shadow formula gives the test, and a large k makes the result hard-edged ([iq](https://iquilezles.org/articles/sphereshadow/)). Naughty Dog used ellipsoid and capsule approximations in *The Last of Us* ([Iwanicki](http://miciwan.com/SIGGRAPH2013/Lighting%20Technology%20of%20The%20Last%20Of%20Us.pdf)).

**One ink shape per object.** Compute `lit = min(aaStep(t, N·L), shadow)`, so an object's dark side and its cast shadow merge into a single dark shape, as Earle paints them.

### (b) Dot (pointillist) foliage

1. **Instanced dot geometry (highest fidelity).**
   - Scatter points on the canopy with even spacing (Poisson-disk sampling in Blender Geometry Nodes), then render each as an instance with its own offset and tint.
   - WebGPU draws points only 1 pixel wide, so use instanced quads ([WebGPU Fundamentals](https://webgpufundamentals.org/webgpu/lessons/webgpu-points.html)).
   - WebGL's maximum `gl_PointSize` varies: the spec only guarantees 1, and Apple M1/M2 cap it at 64 ([WebGL Fundamentals](https://webglfundamentals.org/webgl/lessons/webgl-qna-working-around-gl_pointsize-limitations-webgl.html), [Apple forums](https://developer.apple.com/forums/thread/714831)).
   - *My recommendation:* on mobile GPUs, use tiny opaque hexagon meshes rather than alpha-tested sprites, because `discard` defeats the GPU's hidden-surface removal. The alternative is alpha-to-coverage with MSAA ([three.js Material](https://threejs.org/docs/pages/Material.html)).
2. **Baked dot textures** on canopy meshes or cards. Store them as signed distance fields so the dots stay round and sharp when magnified ([Green 2007](https://www.realtimerendering.com/advances/s2007/Green-Improved_Alpha-Tested_Magnification_for_Vector_Textures_and_Special_Effects(Siggraph07).pdf)).
3. **Procedural dots in world or object space.** Use a jittered grid mapped triplanar or onto a sphere, with dot radius driven by lighting (halftone). Anti-alias with `fwidth` ([Heckel](https://blog.maximeheckel.com/posts/shades-of-halftone/), [Ronja](https://www.ronja-tutorials.com/post/040-halftone-shading/)). Fade to the average color once a cell is under about 2 px, to avoid moiré.
4. **Surface-stable fractal dithering (Dither3D).**
   - Dots stay attached to surfaces while keeping roughly constant screen size, using a 3D Bayer-pattern texture and UV derivatives. It supports grayscale, RGB and CMYK modes and is MPL-2.0 licensed, with Godot and Unreal ports ([runevision](https://runevision.com/tech/dither3d/), [GitHub](https://github.com/runevision/Dither3D)).
   - Each pixel costs one 3D texture read plus several pow/exp2/log2/sqrt operations ([Aras](https://aras-p.info/blog/2025/02/09/Surface-Stable-Fractal-Dither-on-Playdate/)). Use it on selected surfaces only.
5. **Screen-space blue-noise stippling.** One texture read and a comparison, but the pattern swims when the camera moves. Incremental Voronoi sets keep it stable between frames ([Ma et al. 2018](http://jianweiguo.net/publications/papers/2018_PG_InstantStippling.pdf)).

**Canopy shading:** copy normals from an enclosing sphere onto the canopy so it lights as one mass ([Alisavakis](https://halisavakis.com/my-take-on-shaders-stylized-tree-leaves/), [aVersion of Reality](http://www.aversionofreality.com/blog/2022/8/7/stylized-tree-shader)).

### (c) Posterization

- Quantizing each color channel separately shifts hues. Quantize a brightness value and rescale RGB instead ([lettier](https://lettier.github.io/3d-game-shaders-for-beginners/posterization.html)).
- To snap to a fixed palette, pick the nearest color in the perceptual OKLab color space ([OKLab](https://en.wikipedia.org/wiki/Oklab_color_space)), or bake a 3D lookup table with nearest-neighbour sampling ([pmndrs LUT3DEffect](https://pmndrs.github.io/postprocessing/public/docs/class/src/effects/LUT3DEffect.js~LUT3DEffect.html)).
- *My recommendation:* quantize inside the materials (light value → band → palette color) rather than as a post effect. It needs no extra pass, and edges smoothed by MSAA don't get re-jagged.
- Add noise only where you want smooth gradients (as *Röki* does). Keep the bands visible where you want the serigraph effect.

### (d) Hard edges and flat color with 3D depth

- **Unlit shading lit by color choice**, as in *Röki*.
- **Toon ramps.** three.js `MeshToonMaterial` needs its `gradientMap` set to `NearestFilter` ([docs](https://threejs.org/docs/pages/MeshToonMaterial.html)). For smooth band edges, use an `fwidth`-based `smoothstep` ([Roystan](https://roystan.net/articles/toon-shader/)).
- **Matcaps** bake lighting into a sphere image and need no lights ([docs](https://threejs.org/docs/pages/MeshMatcapMaterial.html)). They are relative to the view, though, so they can't match cast shadows from a fixed sun. Use them for props or UI objects only.
- **Depth** comes from Firewatch-style ramp fog quantized into 4–6 steps, which produces stacked, receding bands. No depth of field.
- **Field furrows**: anti-aliased stripes from `fract(height*k)` ([Evan Wallace](https://madebyevan.com/shaders/grid/)).
- **Outlines**: Earle mostly relies on value contrast. If you need them, inverted-hull outlines are cheap on mobile ([Toon RP](https://github.com/Delt06/toon-rp)).

### (e) Neo-Brutalism rules and how to merge them with Earle

Nielsen Norman Group's rules ([NN/g](https://www.nngroup.com/articles/neobrutalism/)):
- High contrast and blocky grid layouts.
- 2–3 bold colors, thick borders, no gradients.
- Solid offset shadows, e.g. black at 4 px.
- Chunky sans-serif headlines with a clean body typeface.
- 24–32 px padding.
- Clearly visible hover and focus states, and WCAG-compliant contrast.

**Merged with Earle:**
- Borders and shadows use the scene's tinted near-black; fills use the jewel tones.
- The offset-shadow direction is the in-game sun direction projected onto the screen, mostly horizontal, so UI shadows echo the long shadows in the world.
- Stepped serigraph gradients are the only gradients allowed.
- At most one Gothic accent, such as a drop cap.

## 4. Blender for authoring and baking

- **Toon bands in EEVEE.** Shader to RGB feeding a Color Ramp set to Constant gives toon bands, but only in EEVEE ([manual](https://docs.blender.org/manual/en/latest/render/shader_nodes/color/shader_to_rgb.html)). Baking only works in Cycles, where Shader to RGB doesn't function.
  - Bake data maps instead (AO, curvature, height, shadow masks, dot masks) and apply the color ramps in the game shader.
- **Dots with Geometry Nodes.** Use Distribute Points on Faces in Poisson Disk mode (minimum spacing), then Instance on Points ([manual](https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/point/distribute_points_on_faces.html)). Export the points as instance data (glTF/JSON) or bake them to textures.
- **Canopy normals.** Use the Data Transfer modifier to copy sphere normals onto canopies.
- **Lines.** The Grease Pencil Line Art modifier draws silhouettes and contours live in the viewport ([manual](https://docs.blender.org/manual/en/latest/grease_pencil/modifiers/generate/line_art.html)). Blender 5.0 improved Grease Pencil, and the 2026 plans focus on fills ([blender.org](https://www.blender.org/development/projects-to-look-forward-to-in-2026/)).
- **BEER/Malt.** A real-time NPR renderer (cel, halftone, hatching) written in GLSL, which makes it easy to port to WebGL. **It runs on Windows and Linux only, not macOS** ([Malt](https://github.com/bnpr/Malt), [BEER](https://github.com/bnpr/BEER)).
- **Blender's NPR project.** It was redesigned around multi-stage compositing that works in both EEVEE and Cycles. Development was planned to start after 5.0 (November 2025), with Dillon Goo Studio ([code.blender.org](https://code.blender.org/2025/05/npr-project/)). Check the current release notes for what has shipped.

## 5. Recommended shader recipe: Earle-style rolling planet map on mobile WebGL/WebGPU

This assumes three.js `WebGPURenderer` (which falls back to WebGL2 automatically) or raw WebGL2/WebGPU, a small planet, and 60 fps on a mid-range phone.

1. **Sun set-up.** Use one directional light, defined relative to the point the camera is looking at:
   - Elevation 9–12°, so shadows are 5–6× the caster's height.
   - Direction about 60–80° off the view axis, so shadows cross the screen as horizontal bands.
   - No ambient light, environment lighting, specular highlights or bloom.
2. **Palette.** 16–24 jewel tones chosen in OKLab, stored in one small texture with nearest filtering:
   - Per biome: one tinted "ink" color plus 3–4 lit steps.
   - Sky: 8–12 steps. Fog: 4–6 steps.
3. **Render passes.**
   - **Shadow depth pass.** Draw the terrain and smooth low-poly proxy shapes per tree type (the Murphy approach), never the dot meshes. Use 2048² (1024² on low-end devices), fitted and snapped as described in 3(a). Only re-render it while the planet, sun or camera is moving.
   - **Main pass.** Everything opaque, 4× MSAA, all quantization done inside the materials.
   - **No post-processing chain.** utsubo advises dropping MSAA when you run post effects; with no post chain, MSAA on mobile GPUs is usually the cheapest way to clean edges. That is my judgment, so profile it.
4. **Terrain fragment shader core:**
```glsl
uniform highp sampler2DShadow uShadow; // LINEAR compare sampler: 1 tap = 2x2 hardware PCF
uniform sampler2D uPal;   // NEAREST atlas; row = biome/fog ramp; x=0 ink, x=1..N lit steps (a = fog amount)
uniform vec3 uSun; uniform float uSteps, uTerm, uFogSteps, uFogScale; uniform int uFogRow;
in vec3 vN; in vec3 vShadowCoord; in float vDist; flat in int vBiome; out vec4 outColor;
float aaStep(float e, float x){ float w = max(fwidth(x), 1e-4); return smoothstep(e - w, e + w, x); }
vec4 pal(int x, int r){ return texelFetch(uPal, ivec2(x, r), 0); }
vec4 bands(float x, int r, int b){ // exact palette colours, ~1px blend only at band borders
  float i = floor(x), t = smoothstep(1.0 - fwidth(x), 1.0, fract(x));
  return mix(pal(b + int(i), r), pal(b + int(i) + 1, r), t); }
void main(){
  float ndl = dot(normalize(vN), uSun);
  float lit = min(aaStep(uTerm, ndl), aaStep(0.5, texture(uShadow, vShadowCoord))); // one ink shape
  vec3 col  = mix(pal(0, vBiome).rgb, bands(clamp(ndl,0.,.999)*(uSteps-1.), vBiome, 1).rgb, lit);
  vec4 fog  = bands(clamp(vDist*uFogScale,0.,.999)*(uFogSteps-1.), uFogRow, 0); // stepped aerial bands
  outColor  = vec4(mix(col, fog.rgb, fog.a), 1.0);
}
```
   In WGSL the shadow read is `textureSampleCompare(tex, cmpSampler, uv, depth)`, which must be called in uniform control flow.

5. **Trees.**
   - **Canopy:** a Cézanne-style primitive (cone, ellipsoid or stacked cones) with sphere-copied normals. Color is the ink plus 1–2 anti-aliased lit bands; trees don't sample the shadow map.
   - **Dots:** 60–200 instanced opaque hexagons per tree, placed from baked Poisson points. Tint each by `dot(N_sphere, L)`: the sunlit side gets the two lightest steps and the shaded side a sparse darker tint. Collapse dots smaller than about 0.75 px in the vertex shader.
   - **Trunks:** straight, thin vertical Gothic "threads".
6. **Sky.** A stepped sunset dome (peach → rose → violet → lapis) with a flat sun disc. No blur anywhere, following the van Eyck rule.
7. **Tiers.**
   - **Low-end:** drop the shadow pass entirely. Use horizon-mapped terrain shadows (which survive the planet rolling) and analytic ellipsoid tree shadows.
   - **High-end:** Dither3D-style dots in meadows.
8. **Budget ([utsubo](https://www.utsubo.com/blog/threejs-best-practices-100-tips)).** Device pixel ratio ≤ 2 (1.5 on low-end), one `InstancedMesh` per tree type, around 100 draw calls maximum, KTX2 textures.
9. **Curved-world variant.** If the map is flat and bent in the vertex shader instead of a real sphere, apply the bend only to the final projection. Compute shadow coordinates from the unbent position, since the bend is purely visual ([Aitchison](https://alastaira.wordpress.com/2013/10/25/animal-crossing-curved-world-shader/)).
10. **UI.** 3 px ink borders, `box-shadow: 8px 3px 0 var(--ink)` aligned with the sun direction, jewel-tone fills, and chunky grotesque headings.

**Gaps and caveats**
- I couldn't open the ArtStation study, the thesis PDF or the Artsy article; the Earle quote comes from Artsy via search snippets.
- The source for "30+ colors" per serigraph is still missing.
- Mobile advice marked "my recommendation" or "my judgment" is engineering opinion, not sourced.
- I haven't checked what Blender's NPR project has actually shipped as of September 2026.
- The Walt Disney Family Museum's reworked Earle exhibition runs 23 October 2026 – 18 April 2027, with about 200 works ([Laughing Place](https://www.laughingplace.com/disney-entertainment/awaking-beauty-eyvind-earle-walt-disney-family-museum/)). It would be a good chance to study originals.

## Sources

**Earle:**
- https://eyvindearle.com/about-serigraphs/
- https://eyvindearle.com/glossary/
- https://eyvindearle.com/bio/
- https://www.sapergalleries.com/Earle.html
- https://d23.com/sleeping-beauty-stunning-art/
- https://www.waltdisney.org/blog/eyvind-earle-artistic-devotion-distinction-sleeping-beauty
- https://www.artsy.net/article/artsy-editorial-artist-made-disneys-sleeping-beauty-enchanting-impossible-animate
- https://www.disneyhistory101.com/disneyhistory101guidedtours/tag/Eyvind+Earle
- https://elisesigh.substack.com/p/eyvind-earle-the-artist-behind-sleeping
- https://www.dailyartmagazine.com/sleeping-beauty-medieval-tapestry/
- https://animad.gr/2024/12/18/my-favorites-eyvind-earles-background-art-for-sleeping-beauty/
- https://hifructose.com/2026/03/12/uncanny-valley-the-oil-paintings-of-the-late-eyvind-earle-still-have-a-resounding-influence-on-artists-viewers-today/
- http://gurneyjourney.blogspot.com/2019/02/eyvind-earle-video-bio.html
- https://charleneperuchi.substack.com/p/eyvind-earle-the-artist-who-made-sleeping-beauty-a-visual-masterpiece
- https://joshuaelek.com/water-color/master-study-eyvind-earle/
- https://www.elenamencarelli.com/awaking-beauty-the-art-of-eyvind-earle/
- http://briansibleysblog.blogspot.com/2008/11/man-who-drew-trees.html
- https://www.laughingplace.com/disney-entertainment/awaking-beauty-eyvind-earle-walt-disney-family-museum/

**Prior art:**
- https://www.polygon-treehouse.com/blog/2018/3/7/inspiration-corner-eyvind-earle
- https://80.lv/articles/the-banner-saga-background-artist-interview
- https://history.siggraph.org/experience/developing-stylized-trees-and-landscapes-inspired-by-eyvind-earle-by-murphy-and-galanter/
- https://oaktrust.library.tamu.edu/items/a6a75e61-6f79-4aa2-bc54-18a61fbedfcd
- https://www.artstation.com/artwork/68EKnO
- https://blenderartists.org/t/eyvind-earle-tribute/1239039
- https://sketchfab.com/3d-models/eyvind-earle-bush-081c0a51cce341b78d4050be23a256c6
- https://www.awn.com/animationworld/open-season-diary-2d-3d-production-design
- https://www.polygon-treehouse.com/blog/2017/6/23/the-art-style-of-roki-part-one
- https://halisavakis.com/my-take-on-shaders-firewatch-multi-colored-fog/
- https://gdcvault.com/play/1022295/The-Art-of
- https://www.thumbsticks.com/gdc-2015-the-art-of-firewatch/
- https://github.com/colesloow/moebius_shaders
- https://blog.maximeheckel.com/posts/moebius-style-post-processing/
- https://www.gamedeveloper.com/art/deep-dive-the-art-of-pentiment
- https://www.gamesradar.com/the-making-of-cuphead/
- https://docs.indreams.me/en/game-info/mm-originals/a-long-climb-ago/world

**Techniques:**
- https://learn.microsoft.com/en-us/windows/win32/dxtecharts/common-techniques-to-improve-shadow-depth-maps
- https://threejs.org/docs/#api/en/renderers/WebGLRenderer.shadowMap
- https://github.com/oneilltomhq/three-rs/issues/168
- https://github.com/Delt06/toon-rp
- https://roystan.net/articles/toon-shader/
- https://dasilvagf.github.io/posts/2020/08/fun-with-horizon-maps/
- https://iquilezles.org/articles/sphereshadow/
- https://iquilezles.org/articles/rmshadows/
- http://miciwan.com/SIGGRAPH2013/Lighting%20Technology%20of%20The%20Last%20Of%20Us.pdf
- https://threejs.org/examples/webgl_shadowmesh.html
- https://www.gamedev.net/forums/topic/708439-stencil-shadow-volumes/
- https://shi-yan.github.io/webgpuunleashed/Advanced/shadow_mapping.html
- https://developer.mozilla.org/en-US/docs/Web/API/GPUSampler
- https://webgpufundamentals.org/webgpu/lessons/webgpu-points.html
- https://webglfundamentals.org/webgl/lessons/webgl-qna-working-around-gl_pointsize-limitations-webgl.html
- https://developer.apple.com/forums/thread/714831
- https://threejs.org/docs/pages/Material.html
- https://www.realtimerendering.com/advances/s2007/Green-Improved_Alpha-Tested_Magnification_for_Vector_Textures_and_Special_Effects(Siggraph07).pdf
- https://blog.maximeheckel.com/posts/shades-of-halftone/
- https://www.ronja-tutorials.com/post/040-halftone-shading/
- https://runevision.com/tech/dither3d/
- https://github.com/runevision/Dither3D
- https://aras-p.info/blog/2025/02/09/Surface-Stable-Fractal-Dither-on-Playdate/
- http://jianweiguo.net/publications/papers/2018_PG_InstantStippling.pdf
- https://halisavakis.com/my-take-on-shaders-stylized-tree-leaves/
- http://www.aversionofreality.com/blog/2022/8/7/stylized-tree-shader
- https://lettier.github.io/3d-game-shaders-for-beginners/posterization.html
- https://en.wikipedia.org/wiki/Oklab_color_space
- https://pmndrs.github.io/postprocessing/public/docs/class/src/effects/LUT3DEffect.js~LUT3DEffect.html
- https://threejs.org/docs/pages/MeshToonMaterial.html
- https://threejs.org/docs/pages/MeshMatcapMaterial.html
- https://madebyevan.com/shaders/grid/
- https://www.nngroup.com/articles/neobrutalism/
- https://www.utsubo.com/blog/threejs-best-practices-100-tips
- https://alastaira.wordpress.com/2013/10/25/animal-crossing-curved-world-shader/

**Blender:**
- https://docs.blender.org/manual/en/latest/render/shader_nodes/color/shader_to_rgb.html
- https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/point/distribute_points_on_faces.html
- https://docs.blender.org/manual/en/latest/grease_pencil/modifiers/generate/line_art.html
- https://github.com/bnpr/Malt
- https://github.com/bnpr/BEER
- https://code.blender.org/2025/05/npr-project/
- https://www.blender.org/development/projects-to-look-forward-to-in-2026/
