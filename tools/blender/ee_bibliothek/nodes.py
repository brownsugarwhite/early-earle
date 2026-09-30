"""Knoten-Baukasten für Shader- und Geometry-Nodes-Bäume (lesbar statt Socket-Indizes)."""
import bpy


class NT:
    """Wrapper um einen Knotenbaum: Knoten anlegen, verbinden, Mathe/Mix/Rampen als Einzeiler."""

    def __init__(self, tree):
        self.t = tree
        self.col = 0
        self.row = 0

    def _loc(self):
        self.row += 1
        return (self.col * 220, -self.row * 160)

    def node(self, kind, label=None, loc=None, **settings):
        n = self.t.nodes.new(kind)
        n.location = loc if loc is not None else self._loc()
        if label:
            n.label = label
        for k, v in settings.items():
            setattr(n, k, v)
        return n

    def link(self, out_socket, in_socket):
        self.t.links.new(out_socket, in_socket)

    def feed(self, sock, val):
        if isinstance(val, bpy.types.NodeSocket):
            self.link(val, sock)
        elif val is not None:
            try:
                sock.default_value = val
            except (TypeError, ValueError):
                if isinstance(val, (int, float)) and hasattr(sock.default_value, "__len__"):
                    n = len(sock.default_value)
                    sock.default_value = tuple([float(val)] * (3 if n == 3 else 3) + ([1.0] if n == 4 else []))
                else:
                    raise

    @staticmethod
    def inp(node, name, kind=None):
        for s in node.inputs:
            if s.name == name and (kind is None or s.type == kind):
                return s
        raise KeyError(f"{node.bl_idname}: Eingang {name} ({kind}) fehlt")

    @staticmethod
    def out(node, name=None, kind=None):
        for s in node.outputs:
            if (name is None or s.name == name) and (kind is None or s.type == kind):
                return s
        raise KeyError(f"{node.bl_idname}: Ausgang {name} ({kind}) fehlt")

    # --- Mathe -------------------------------------------------------------------------------------
    def math(self, op, a, b=0.0, c=None, clamp=False):
        n = self.node("ShaderNodeMath" if self.t.bl_idname == "ShaderNodeTree" else "ShaderNodeMath", operation=op, use_clamp=clamp)
        self.feed(n.inputs[0], a)
        self.feed(n.inputs[1], b)
        if c is not None:
            self.feed(n.inputs[2], c)
        return n.outputs[0]

    def add(self, a, b):
        return self.math("ADD", a, b)

    def mul(self, a, b):
        return self.math("MULTIPLY", a, b)

    def sub(self, a, b):
        return self.math("SUBTRACT", a, b)

    def gt(self, a, edge):
        """1 wenn a > edge."""
        return self.math("GREATER_THAN", a, edge)

    def lt(self, a, edge):
        return self.math("LESS_THAN", a, edge)

    def eq(self, a, value):
        """1 wenn |a − value| < 0.5 (für Ganzzahl-Auswahl)."""
        return self.math("COMPARE", a, value, 0.5)

    def smooth(self, x, e0, e1):
        """smoothstep(e0, e1, x) über Map Range."""
        n = self.node("ShaderNodeMapRange", interpolation_type="SMOOTHSTEP", clamp=True)
        self.feed(n.inputs["Value"], x)
        n.inputs["From Min"].default_value = e0
        n.inputs["From Max"].default_value = e1
        n.inputs["To Min"].default_value = 0.0
        n.inputs["To Max"].default_value = 1.0
        return n.outputs["Result"]

    def remap(self, x, a0, a1, b0, b1, clamp=True):
        n = self.node("ShaderNodeMapRange", interpolation_type="LINEAR", clamp=clamp)
        self.feed(n.inputs["Value"], x)
        self.feed(n.inputs["From Min"], a0)
        self.feed(n.inputs["From Max"], a1)
        self.feed(n.inputs["To Min"], b0)
        self.feed(n.inputs["To Max"], b1)
        return n.outputs["Result"]

    def mix(self, fac, a, b, blend="MIX"):
        """Farbmischung (RGBA)."""
        n = self.node("ShaderNodeMix", data_type="RGBA", blend_type=blend)
        self.feed(self.inp(n, "Factor", "VALUE"), fac)
        self.feed(self.inp(n, "A", "RGBA"), a)
        self.feed(self.inp(n, "B", "RGBA"), b)
        return self.out(n, kind="RGBA")

    def mixf(self, fac, a, b):
        n = self.node("ShaderNodeMix", data_type="FLOAT")
        self.feed(self.inp(n, "Factor", "VALUE"), fac)
        self.feed(self.inp(n, "A", "VALUE"), a)
        self.feed(self.inp(n, "B", "VALUE"), b)
        return self.out(n, kind="VALUE")

    def vmath(self, op, a, b=None, scale=None):
        n = self.node("ShaderNodeVectorMath", operation=op)
        self.feed(n.inputs[0], a)
        if b is not None:
            self.feed(n.inputs[1], b)
        if scale is not None:
            self.feed(n.inputs["Scale"], scale)
        return n.outputs["Value"] if op in ("DOT_PRODUCT", "LENGTH", "DISTANCE") else n.outputs["Vector"]

    def sep(self, v):
        n = self.node("ShaderNodeSeparateXYZ")
        self.feed(n.inputs[0], v)
        return n.outputs[0], n.outputs[1], n.outputs[2]

    def xyz(self, x, y, z):
        n = self.node("ShaderNodeCombineXYZ")
        self.feed(n.inputs[0], x)
        self.feed(n.inputs[1], y)
        self.feed(n.inputs[2], z)
        return n.outputs[0]

    def rgb(self, color):
        n = self.node("ShaderNodeRGB")
        n.outputs[0].default_value = color
        return n.outputs[0]

    def value(self, v):
        n = self.node("ShaderNodeValue")
        n.outputs[0].default_value = v
        return n.outputs[0]


def new_group(name, kind="ShaderNodeTree"):
    old = bpy.data.node_groups.get(name)
    if old:
        bpy.data.node_groups.remove(old)
    return bpy.data.node_groups.new(name, kind)


def group_socket(ng, name, in_out, socket_type, default=None, min_value=None, max_value=None, description=""):
    s = ng.interface.new_socket(name=name, in_out=in_out, socket_type=socket_type, description=description)
    if default is not None and hasattr(s, "default_value"):
        s.default_value = default
    if min_value is not None and hasattr(s, "min_value"):
        s.min_value = min_value
    if max_value is not None and hasattr(s, "max_value"):
        s.max_value = max_value
    return s


def new_material(name):
    old = bpy.data.materials.get(name)
    if old:
        bpy.data.materials.remove(old)
    mat = bpy.data.materials.new(name)
    if mat.node_tree is None:
        mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    return mat


def set_blend(mat, blended):
    """Transparenz-Modus (EEVEE Next: surface_render_method)."""
    if hasattr(mat, "surface_render_method"):
        mat.surface_render_method = "BLENDED" if blended else "DITHERED"
    elif hasattr(mat, "blend_method"):
        mat.blend_method = "BLEND" if blended else "OPAQUE"
