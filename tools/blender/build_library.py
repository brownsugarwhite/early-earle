"""
Baut die Blender-Bibliothek von early earle aus dem Export der Spiel-Generatoren (tools/export3d).

  /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
      --python tools/blender/build_library.py -- --export assets/blender/_export \
      --out assets/blender/early-earle-bibliothek.blend [--only wesen,module] [--no-previews]

Oder alles in einem Schritt: `pnpm assets:blender` (Export + Bau + Vorschaubilder). Details: docs/BLENDER.md.
"""
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import bpy  # noqa: E402

from ee_bibliothek import build  # noqa: E402


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []

    def opt(name, default=None):
        return argv[argv.index(name) + 1] if name in argv and argv.index(name) + 1 < len(argv) else default

    root = os.path.abspath(os.path.join(HERE, "..", ".."))
    only = opt("--only")
    return {
        "root": root,
        "export": os.path.abspath(opt("--export", os.path.join(root, "assets/blender/_export"))),
        "out": os.path.abspath(opt("--out", os.path.join(root, "assets/blender/early-earle-bibliothek.blend"))),
        "only": set(only.split(",")) if only else None,
        "previews": "--no-previews" not in argv,
        "renders": opt("--renders"),
    }


def main():
    args = parse_args()
    t0 = time.time()
    print(f"early earle Bibliothek: {args['export']} → {args['out']}")
    report = build.build_all(args)
    print(f"fertig in {time.time() - t0:.1f} s")
    for line in report:
        print("  " + line)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        import traceback

        traceback.print_exc()
        sys.exit(1)
