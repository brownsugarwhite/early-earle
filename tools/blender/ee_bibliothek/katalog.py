"""
Asset-Browser: Assets markieren (Beschreibung, Autor, Schlagworte) und die Katalogdatei
`blender_assets.cats.txt` neben die .blend schreiben — stabile UUIDs aus dem Katalogpfad (uuid5), damit ein
Neubau dieselben Kataloge behält und eigene Zuordnungen von Florian nicht ins Leere zeigen.
"""
import os
import uuid

NAMESPACE = uuid.UUID("6f5c3a2e-8b1d-4c7e-9a0f-ee0000000001")
HEADER = """# This is an Asset Catalog Definition file for Blender.
#
# Empty lines and lines starting with `#` will be ignored.
# The first non-ignored line should be the version indicator.
# Other lines are of the format "UUID:catalog/path/for/assets:simple catalog name"
#
# early earle — erzeugt von tools/blender/build_library.py (pnpm assets:blender).

VERSION 1

"""


def catalog_uuid(path):
    return str(uuid.uuid5(NAMESPACE, "early-earle/" + path))


def apply(st, out_dir):
    paths = set()
    for _, cat, _, _ in st.assets:
        parts = cat.split("/")
        for i in range(1, len(parts) + 1):
            paths.add("/".join(parts[:i]))
    lines = []
    for p in sorted(paths):
        simple = p.replace("/", "-")
        lines.append(f"{catalog_uuid(p)}:{p}:{simple}")
    with open(os.path.join(out_dir, "blender_assets.cats.txt"), "w", encoding="utf-8") as f:
        f.write(HEADER + "\n".join(lines) + "\n")
    marked = 0
    for idblock, cat, desc, tags in st.assets:
        try:
            idblock.asset_mark()
        except (AttributeError, RuntimeError):
            continue
        ad = idblock.asset_data
        if ad is None:
            continue
        ad.catalog_id = catalog_uuid(cat)
        ad.description = desc
        ad.author = "early earle · tools/export3d + build_library.py"
        for t in tags:
            if t and t not in ad.tags:
                ad.tags.new(str(t), skip_if_exists=True)
        marked += 1
    st.report.append(f"Assets: {marked} markiert, {len(paths)} Kataloge")
