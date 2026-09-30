"""
Headless glTF export for early-earle creature modules (P4 pipeline).

Usage:
  /Applications/Blender.app/Contents/MacOS/Blender -b path/to/parts.blend -P tools/blender/export_assets.py -- --out content/genome/assets
  # aus der Bibliothek (Module liegen in der Szene „Module“ unter der Collection „Module“):
  /Applications/Blender.app/Contents/MacOS/Blender -b assets/blender/early-earle-bibliothek.blend -P tools/blender/export_assets.py -- \
      --collection Module --only eye_round,horn_curl --out content/genome/assets

Conventions (see docs/GDD.md "Genom", tools/blender/README.md):
  * One collection per asset; the collection name is the asset id (e.g. "eye_slit", "horn_curl", "wing_leaf").
    Default: the top-level collections of the scene. With --collection <name>: every collection below <name>
    that holds exactly one root mesh with the custom property "slot" (nested groups such as
    "Module · Augen" are searched through).
  * Attachment points are Empties named SOCKET_<slot> (e.g. SOCKET_root, SOCKET_tip). Every asset needs SOCKET_root.
  * Custom properties on the collection's root object are exported as glTF extras
    (slot, scale_min, scale_max, tintable, material_family).
  * Meshes should be low-poly, no outlines, palette colours via vertex colour or a single flat material.
The script validates conventions, then exports one .glb per collection with named animations (NLA tracks) and morph targets.
With --only / --collection the existing _manifest.json is updated (other entries stay).
"""
import bpy, sys, os, json, re

def parse_args():
    argv = sys.argv
    args = argv[argv.index("--") + 1:] if "--" in argv else []
    out = "content/genome/assets"
    if "--out" in args:
        out = args[args.index("--out") + 1]
    collection = args[args.index("--collection") + 1] if "--collection" in args else None
    only = set(args[args.index("--only") + 1].split(",")) if "--only" in args else None
    return {"out": os.path.abspath(out), "collection": collection, "only": only}

def collection_objects(col):
    objs = list(col.objects)
    for child in col.children:
        objs += collection_objects(child)
    return objs

def validate(col):
    problems = []
    objs = collection_objects(col)
    sockets = [o for o in objs if o.type == "EMPTY" and o.name.startswith("SOCKET_")]
    if not any(o.name == "SOCKET_root" or o.name.startswith("SOCKET_root.") for o in sockets):
        problems.append("missing SOCKET_root empty")
    for s in sockets:
        if not re.match(r"^SOCKET_[a-z][a-z0-9_]*(\.\d+)?$", s.name):
            problems.append(f"bad socket name {s.name}")
    meshes = [o for o in objs if o.type == "MESH"]
    if not meshes:
        problems.append("no mesh")
    for m in meshes:
        if len(m.data.polygons) > 4000:
            problems.append(f"{m.name}: {len(m.data.polygons)} faces (> 4000)")
    roots = [o for o in col.objects if o.parent is None and o.type != "EMPTY"]
    if len(roots) != 1:
        problems.append(f"expected exactly one root object, found {len(roots)}")
    return problems, sockets

def select_only(objs, view_layer):
    for o in view_layer.objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    if objs:
        view_layer.objects.active = objs[0]

def export_collection(col, out_dir, view_layer):
    objs = collection_objects(col)
    select_only(objs, view_layer)
    path = os.path.join(out_dir, f"{col.name}.glb")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_extras=True,
        export_animations=True,
        export_nla_strips=True,
        export_morph=True,
        export_skins=True,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
    )
    return path

def is_module(col):
    roots = [o for o in col.objects if o.parent is None and o.type == "MESH"]
    return len(roots) == 1 and "slot" in roots[0].keys()

def module_collections(parent):
    """Alle Modul-Collections unterhalb von `parent` (verschachtelte Gruppen werden durchsucht)."""
    out = []
    for c in parent.children:
        if is_module(c):
            out.append(c)
        else:
            out += module_collections(c)
    return out

def main():
    a = parse_args()
    os.makedirs(a["out"], exist_ok=True)
    report = {"exported": [], "skipped": []}
    scene = bpy.context.scene
    view_layer = bpy.context.view_layer
    if a["collection"]:
        parent = bpy.data.collections.get(a["collection"])
        if parent is None:
            print(f"EXPORT_REPORT Collection {a['collection']} nicht gefunden")
            sys.exit(2)
        top = module_collections(parent)
    else:
        top = [c for c in scene.collection.children]
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    for col in top:
        if col.name.startswith("_"):
            continue
        if a["only"] is not None and col.name not in a["only"]:
            continue
        problems, sockets = validate(col)
        if problems:
            report["skipped"].append({"asset": col.name, "problems": problems})
            continue
        # Modul-Collections aus einer anderen Szene (Bibliothek: Szene „Module“) kurz in die aktive Szene hängen,
        # damit Auswahl und Export im aktiven View-Layer laufen.
        linked = col.name not in [c.name for c in scene.collection.children_recursive]
        if linked:
            scene.collection.children.link(col)
            view_layer.update()
        try:
            path = export_collection(col, a["out"], view_layer)
        finally:
            if linked:
                scene.collection.children.unlink(col)
        root = [o for o in col.objects if o.parent is None and o.type != "EMPTY"][0]
        extras = {k: root[k] for k in root.keys() if not k.startswith("_") and not k.startswith("ee_")}
        report["exported"].append({
            "asset": col.name,
            "file": os.path.relpath(path, os.getcwd()),
            "sockets": sorted(s.name for s in sockets),
            "extras": {k: (v if isinstance(v, (int, float, str, bool)) else str(v)) for k, v in extras.items()},
        })
    manifest_path = os.path.join(a["out"], "_manifest.json")
    merged = report
    if (a["only"] is not None or a["collection"]) and os.path.exists(manifest_path):
        # Teil-Export: bestehende Einträge behalten, die neu exportierten ersetzen
        with open(manifest_path) as f:
            old = json.load(f)
        fresh = {e["asset"] for e in report["exported"]}
        merged = {
            "exported": sorted([e for e in old.get("exported", []) if e["asset"] not in fresh] + report["exported"], key=lambda e: e["asset"]),
            "skipped": report["skipped"],
        }
    with open(manifest_path, "w") as f:
        json.dump({"schemaVersion": 1, **merged}, f, indent=2)
    print("EXPORT_REPORT " + json.dumps(report))
    if report["skipped"]:
        sys.exit(2)

main()
