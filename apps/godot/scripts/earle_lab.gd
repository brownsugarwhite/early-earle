extends Node3D
## P2-G Earle-Lab (Godot 4.7).
## Spherical cap patch (R = 40, +-32 deg, 96x96) with 2-octave low-frequency fbm hills in an
## ArrayMesh; terrain shader: lit = min(aaStep(N.L), shadow) -> ink or 3-4 palette bands, stepped
## fog by distance. One DirectionalLight3D at 10 deg elevation, 70 deg azimuth off the view axis,
## hard shadow edge (project filter = Hard, angular distance 0, single orthogonal split), no ambient.
## Trees: MultiMesh Cezanne primitives (dome / cone / stacked cones) with hull-centre normals,
## 60-200 hexagon dot billboards per tree (MultiMesh, lit-side biased, tinted by dot(N_hull, L)),
## thin trunk strips. Banded sky shader, 4 fog stripe planes. Trackball drag with inertia
## (mouse + emulated touch), growth slider (visible_instance_count + scale), sun elevation slider.

const R := 40.0
const HALF_ANGLE := 32.0
const GRID := 96
const SUN_AZIMUTH := 70.0
const N_MESH_TYPES := 3 # 0 dome, 1 cone, 2 stacked cones
enum Kind { BUSH, UMBRELLA, CONE, STACK }

# Tjorizo palette (plan section 2) shifted toward Florian's map draft 06 (neon sky, khaki hills,
# near-black shadow wedges, purple distance).
const PAL := {
	"ink": Color("141a0c"),
	"t0": Color("6f7350"), "t1": Color("9a9a6e"), "t2": Color("b3b47c"), "t3": Color("d3cf9d"),
	"canopy1": Color("2c3a18"), "canopy2": Color("3e5124"),
	"dot_a": Color("b8ff2a"), "dot_b": Color("d9e87a"), "dot_shade": Color("4e5c3b"),
	"fog1": Color("8e8c78"), "fog2": Color("9186b3"), "fog3": Color("7e70b0"), "fog4": Color("8fc3e6"),
	"sky0": Color("b8ff2a"), "sky1": Color("dcf58a"), "sky2": Color("c5eee0"), "sky3": Color("a9dff0"), "sky4": Color("8fc3e6"),
	"sun": Color("f6ffd0"), "stripe": Color("e4f8ee"),
}

const MeshFactory := preload("res://scripts/mesh_factory.gd")
const PerfHud := preload("res://scripts/perf_hud.gd")

@onready var planet: Node3D = $Planet
@onready var surface: Node3D = $Planet/Surface
@onready var sun: DirectionalLight3D = $Sun
@onready var cam: Camera3D = $Camera3D
@onready var env_node: WorldEnvironment = $WorldEnvironment
@onready var hud: PerfHud = $PerfHud
@onready var ui_root: Control = $UI/Root
@onready var growth_slider: HSlider = $UI/Root/Bottom/GrowthRow/Growth
@onready var sun_slider: HSlider = $UI/Root/Bottom/SunRow/Sun
@onready var growth_label: Label = $UI/Root/Bottom/GrowthRow/GrowthLabel
@onready var sun_label: Label = $UI/Root/Bottom/SunRow/SunLabel

var noise := FastNoiseLite.new()
var grove := FastNoiseLite.new()
var rng := RandomNumberGenerator.new()
var all_mats: Array[ShaderMaterial] = []
var dot_mats: Array[ShaderMaterial] = []
var canopy_mm: Array[MultiMesh] = []
var dot_mm: Array[MultiMesh] = []
var trunk_mm: MultiMesh
var type_cum: Array[PackedInt32Array] = []
var dot_cum: Array[PackedInt32Array] = []
var trunk_cum := PackedInt32Array()
var n_trees := 0
var n_dots := 0
var n_trunks := 0
var growth := 1.0
var sun_elev := 10.0
var to_sun := Vector3.UP
var dragging := false
var drag_accum := Vector2.ZERO
var drag_vel := Vector2.ZERO
var stripes: Array[MeshInstance3D] = []
var stripe_x := PackedFloat32Array()
var sky_mat: ShaderMaterial


func _ready() -> void:
	rng.seed = 42
	noise.seed = 7
	noise.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	noise.fractal_type = FastNoiseLite.FRACTAL_FBM
	noise.fractal_octaves = 2
	noise.fractal_gain = 0.42
	noise.frequency = 0.8
	grove.seed = 11
	grove.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	grove.fractal_octaves = 1
	grove.frequency = 1.0
	var th := Theme.new()
	th.default_font_size = 30
	ui_root.theme = th
	cam.fov = 40.0
	cam.look_at_from_position(Vector3(0.0, 12.0, 27.0), Vector3(0.0, -1.5, -1.0), Vector3.UP)
	sky_mat = env_node.environment.sky.sky_material
	for i in range(5):
		sky_mat.set_shader_parameter("u_c%d" % i, PAL["sky%d" % i])
	sky_mat.set_shader_parameter("u_sun_col", PAL.sun)
	to_sun = _sun_vector(sun_elev)
	_setup_sun()
	_build_terrain()
	_build_trees()
	_build_stripes()
	_wire_ui()
	set_growth(1.0)
	set_sun_elevation(10.0)


# ---------------------------------------------------------------- geometry helpers

func _height(u: float, v: float) -> float:
	var h := noise.get_noise_2d(u * 2.0, v * 2.0) * 3.4
	h += noise.get_noise_2d(u * 0.7 + 30.0, v * 0.7 + 30.0) * 1.6
	return h


func _cap_dir(u: float, v: float) -> Vector3:
	var au := deg_to_rad(u * HALF_ANGLE)
	var av := deg_to_rad(v * HALF_ANGLE)
	return Vector3(sin(au), cos(au) * cos(av), cos(au) * sin(av))


func _cap_point(u: float, v: float) -> Vector3:
	return Vector3(0.0, -R, 0.0) + _cap_dir(u, v) * (R + _height(u, v))


func _mat(path: String) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = load(path)
	m.set_shader_parameter("u_fog_c1", PAL.fog1)
	m.set_shader_parameter("u_fog_c2", PAL.fog2)
	m.set_shader_parameter("u_fog_c3", PAL.fog3)
	m.set_shader_parameter("u_fog_c4", PAL.fog4)
	all_mats.append(m)
	return m


func _build_terrain() -> void:
	var n := GRID
	var verts := PackedVector3Array()
	verts.resize((n + 1) * (n + 1))
	var normals := PackedVector3Array()
	normals.resize(verts.size())
	var indices := PackedInt32Array()
	for j in range(n + 1):
		for i in range(n + 1):
			var u := float(i) / float(n) * 2.0 - 1.0
			var v := float(j) / float(n) * 2.0 - 1.0
			verts[j * (n + 1) + i] = _cap_point(u, v)
	var center := Vector3(0.0, -R, 0.0)
	for j in range(n):
		for i in range(n):
			var a := j * (n + 1) + i
			var b := a + 1
			var c := a + (n + 1)
			var d := c + 1
			MeshFactory.push_tri(verts, indices, a, b, c, center)
			MeshFactory.push_tri(verts, indices, b, d, c, center)
	for k in range(0, indices.size(), 3):
		var i0 := indices[k]
		var i1 := indices[k + 1]
		var i2 := indices[k + 2]
		var fn := (verts[i1] - verts[i0]).cross(verts[i2] - verts[i0])
		if fn.dot(verts[i0] - center) < 0.0:
			fn = -fn
		normals[i0] += fn
		normals[i1] += fn
		normals[i2] += fn
	for k in range(normals.size()):
		normals[k] = normals[k].normalized()
	var mi := MeshInstance3D.new()
	mi.mesh = MeshFactory.make_mesh(verts, normals, PackedVector2Array(), indices)
	var mat := _mat("res://shaders/earle_terrain.gdshader")
	mat.set_shader_parameter("u_ink", PAL.ink)
	mat.set_shader_parameter("u_b0", PAL.t0)
	mat.set_shader_parameter("u_b1", PAL.t1)
	mat.set_shader_parameter("u_b2", PAL.t2)
	mat.set_shader_parameter("u_b3", PAL.t3)
	mi.material_override = mat
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	surface.add_child(mi)


func _rand_dir() -> Vector3:
	var z := rng.randf_range(-1.0, 1.0)
	var a := rng.randf_range(0.0, TAU)
	var r := sqrt(maxf(1.0 - z * z, 0.0))
	return Vector3(r * cos(a), z, r * sin(a))


func _cone_point(scale: float, y_off: float) -> Vector3:
	var f := 1.0 - sqrt(rng.randf())
	var phi := rng.randf_range(0.0, TAU)
	var rad := 0.65 * (1.0 - f) * scale
	var p := Vector3(cos(phi) * rad, (-0.9 + 1.8 * f) * scale + y_off, sin(phi) * rad)
	return p + p.normalized() * 0.1


func _hull_point(mesh_type: int) -> Vector3:
	match mesh_type:
		0:
			var d := _rand_dir()
			d.y = maxf(absf(d.y), 0.08)
			return d.normalized() * 1.08
		1:
			return _cone_point(1.0, 0.0)
		_:
			var r := rng.randf()
			if r < 0.25:
				return _cone_point(0.6, 0.62)
			elif r < 0.6:
				return _cone_point(0.85, 0.0)
			return _cone_point(1.0, -0.55)


func _dots(mesh_type: int, s: float, frame: Basis) -> Array[Vector3]:
	var n := clampi(int(60.0 + 140.0 * (s - 0.55) / 1.35), 60, 200)
	var sun_local := frame.inverse() * to_sun
	var out: Array[Vector3] = []
	var tries := 0
	while out.size() < n and tries < n * 8:
		tries += 1
		var p := _hull_point(mesh_type)
		var bias := 0.22 + 0.78 * maxf(p.normalized().dot(sun_local), 0.0)
		if rng.randf() < bias:
			out.append(p)
	return out


func _make_tree(u: float, v: float) -> Dictionary:
	var t := {}
	var r := rng.randf()
	var kind: int
	if r < 0.42:
		kind = Kind.BUSH
	elif r < 0.68:
		kind = Kind.UMBRELLA
	elif r < 0.84:
		kind = Kind.CONE
	else:
		kind = Kind.STACK
	var dir := _cap_dir(u, v)
	var base := _cap_point(u, v)
	var x := dir.cross(Vector3(0.0, 0.0, 1.0)).normalized()
	var z := x.cross(dir).normalized()
	var s := 1.0
	var ys := 1.0
	var crown_h := 0.0
	var mesh_type := 0
	var trunk := false
	match kind:
		Kind.BUSH:
			s = rng.randf_range(0.55, 1.4)
			ys = rng.randf_range(0.75, 1.0)
			crown_h = s * 0.12
		Kind.UMBRELLA:
			s = rng.randf_range(1.0, 1.9)
			ys = rng.randf_range(0.55, 0.8)
			crown_h = rng.randf_range(1.8, 3.8)
			trunk = true
		Kind.CONE:
			s = rng.randf_range(0.8, 1.5)
			crown_h = s * 0.9 + rng.randf_range(0.0, 1.2)
			mesh_type = 1
			trunk = crown_h > s * 0.95
		Kind.STACK:
			s = rng.randf_range(0.9, 1.6)
			crown_h = s * 1.05 + rng.randf_range(0.0, 1.4)
			mesh_type = 2
			trunk = crown_h > s * 1.1
	t.kind = kind
	t.mesh_type = mesh_type
	t.s = s
	t.sy = s * ys
	t.crown_h = crown_h
	t.trunk = trunk
	t.trunk_w = rng.randf_range(0.03, 0.06)
	t.basis = Basis(x * s, dir * s * ys, z * s)
	t.frame = Basis(x, dir, z)
	t.origin = base + dir * crown_h
	t.base = base
	t.dots = _dots(mesh_type, s, t.frame)
	return t


func _build_trees() -> void:
	var trees: Array[Dictionary] = []
	var step := 0.06
	var u := -0.93
	while u <= 0.93:
		var v := -0.93
		while v <= 0.93:
			var uu := u + rng.randf_range(-0.022, 0.022)
			var vv := v + rng.randf_range(-0.022, 0.022)
			var m := grove.get_noise_2d(uu * 3.0, vv * 3.0)
			var p_keep := clampf(m * 1.5 + 0.3, 0.0, 1.0) * 0.8 + 0.04
			if rng.randf() < p_keep:
				trees.append(_make_tree(uu, vv))
			v += step
		u += step
	for i in range(trees.size() - 1, 0, -1):
		var j := rng.randi_range(0, i)
		var tmp: Dictionary = trees[i]
		trees[i] = trees[j]
		trees[j] = tmp
	n_trees = trees.size()

	var dome := SphereMesh.new()
	dome.radius = 1.0
	dome.height = 2.0
	dome.is_hemisphere = true
	dome.radial_segments = 24
	dome.rings = 12
	var cone := CylinderMesh.new()
	cone.top_radius = 0.0
	cone.bottom_radius = 0.65
	cone.height = 1.8
	cone.radial_segments = 16
	cone.rings = 1
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.append_from(cone, 0, Transform3D(Basis.IDENTITY.scaled(Vector3.ONE * 0.6), Vector3(0.0, 0.62, 0.0)))
	st.append_from(cone, 0, Transform3D(Basis.IDENTITY.scaled(Vector3.ONE * 0.85), Vector3(0.0, 0.0, 0.0)))
	st.append_from(cone, 0, Transform3D(Basis.IDENTITY, Vector3(0.0, -0.55, 0.0)))
	var stack := st.commit()
	var meshes: Array[Mesh] = [dome, cone, stack]
	var hex := MeshFactory.hexagon()
	var big_aabb := AABB(Vector3(-45.0, -20.0, -45.0), Vector3(90.0, 40.0, 90.0))

	for ty in range(N_MESH_TYPES):
		var list: Array[Dictionary] = []
		var dots_total := 0
		for t in trees:
			if t.mesh_type == ty:
				list.append(t)
				dots_total += t.dots.size()
		var cmm := MultiMesh.new()
		cmm.transform_format = MultiMesh.TRANSFORM_3D
		cmm.use_custom_data = true
		cmm.mesh = meshes[ty]
		cmm.instance_count = list.size()
		var dmm := MultiMesh.new()
		dmm.transform_format = MultiMesh.TRANSFORM_3D
		dmm.use_custom_data = true
		dmm.mesh = hex
		dmm.instance_count = dots_total
		var k := 0
		for idx in range(list.size()):
			var t: Dictionary = list[idx]
			var tf := Transform3D(t.basis, t.origin)
			var pivot: float = t.crown_h / t.sy
			cmm.set_instance_transform(idx, tf)
			cmm.set_instance_custom_data(idx, Color(pivot, 0.0, 0.0, 0.0))
			for off in t.dots:
				dmm.set_instance_transform(k, tf)
				dmm.set_instance_custom_data(k, Color(off.x, off.y, off.z, pivot))
				k += 1
		canopy_mm.append(cmm)
		dot_mm.append(dmm)
		n_dots += dots_total

		var cmi := MultiMeshInstance3D.new()
		cmi.multimesh = cmm
		var cmat := _mat("res://shaders/earle_canopy.gdshader")
		cmat.set_shader_parameter("u_ink", PAL.ink)
		cmat.set_shader_parameter("u_lit1", PAL.canopy1)
		cmat.set_shader_parameter("u_lit2", PAL.canopy2)
		cmi.material_override = cmat
		cmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		cmi.custom_aabb = big_aabb
		surface.add_child(cmi)

		var dmi := MultiMeshInstance3D.new()
		dmi.multimesh = dmm
		var dmat := _mat("res://shaders/earle_dots.gdshader")
		dmat.set_shader_parameter("u_lit_a", PAL.dot_a)
		dmat.set_shader_parameter("u_lit_b", PAL.dot_b)
		dmat.set_shader_parameter("u_shade", PAL.dot_shade)
		dmat.set_shader_parameter("u_viewport_h", float(get_viewport().get_visible_rect().size.y))
		dot_mats.append(dmat)
		dmi.material_override = dmat
		dmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		dmi.custom_aabb = big_aabb
		surface.add_child(dmi)

	# trunks (one MultiMesh for all types)
	var trunk_list: Array[Dictionary] = []
	for t in trees:
		if t.trunk:
			trunk_list.append(t)
	trunk_mm = MultiMesh.new()
	trunk_mm.transform_format = MultiMesh.TRANSFORM_3D
	trunk_mm.use_custom_data = true
	trunk_mm.mesh = MeshFactory.strip()
	trunk_mm.instance_count = trunk_list.size()
	for idx in range(trunk_list.size()):
		var t: Dictionary = trunk_list[idx]
		trunk_mm.set_instance_transform(idx, Transform3D(t.frame, t.base))
		trunk_mm.set_instance_custom_data(idx, Color(t.crown_h, t.trunk_w, 0.0, 0.0))
	n_trunks = trunk_list.size()
	var tmi := MultiMeshInstance3D.new()
	tmi.multimesh = trunk_mm
	var tmat := _mat("res://shaders/earle_trunk.gdshader")
	tmat.set_shader_parameter("u_ink", PAL.ink)
	tmi.material_override = tmat
	tmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	tmi.custom_aabb = big_aabb
	surface.add_child(tmi)

	# prefix tables over the growth order (tree k appears once growth >= k / n)
	var cnt := PackedInt32Array()
	cnt.resize(N_MESH_TYPES)
	var dcnt := PackedInt32Array()
	dcnt.resize(N_MESH_TYPES)
	var tcnt := 0
	for ty in range(N_MESH_TYPES):
		var a := PackedInt32Array()
		a.resize(n_trees + 1)
		type_cum.append(a)
		var b := PackedInt32Array()
		b.resize(n_trees + 1)
		dot_cum.append(b)
	trunk_cum.resize(n_trees + 1)
	for k in range(n_trees + 1):
		for ty in range(N_MESH_TYPES):
			type_cum[ty][k] = cnt[ty]
			dot_cum[ty][k] = dcnt[ty]
		trunk_cum[k] = tcnt
		if k < n_trees:
			var t: Dictionary = trees[k]
			cnt[t.mesh_type] += 1
			dcnt[t.mesh_type] += t.dots.size()
			if t.trunk:
				tcnt += 1


func _build_stripes() -> void:
	var shader := load("res://shaders/fog_stripe.gdshader")
	var defs := [[-16.0, 0.9, 1.1, 70.0], [-9.0, 1.4, 0.7, 60.0], [-3.5, 0.9, 0.55, 50.0], [4.0, 0.6, 0.45, 40.0]]
	for i in range(defs.size()):
		var q := QuadMesh.new()
		q.size = Vector2(defs[i][3], defs[i][2])
		var mi := MeshInstance3D.new()
		mi.mesh = q
		var m := ShaderMaterial.new()
		m.shader = shader
		m.set_shader_parameter("u_col", PAL.stripe)
		m.set_shader_parameter("u_alpha", 0.62 - 0.06 * i)
		mi.material_override = m
		mi.position = Vector3(0.0, defs[i][1], defs[i][0])
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		add_child(mi)
		stripes.append(mi)
		stripe_x.append(0.0)


func _sun_vector(elev_deg: float) -> Vector3:
	var el := deg_to_rad(elev_deg)
	var az := deg_to_rad(SUN_AZIMUTH)
	return Vector3(cos(el) * sin(az), sin(el), -cos(el) * cos(az)).normalized()


func _setup_sun() -> void:
	sun.shadow_enabled = true
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_ORTHOGONAL
	sun.directional_shadow_max_distance = 58.0
	sun.light_angular_distance = 0.0
	sun.shadow_blur = 0.0
	sun.shadow_bias = 0.05
	sun.shadow_normal_bias = 2.0
	sun.light_energy = 1.0


# ---------------------------------------------------------------- public API (UI + Bench)

func set_growth(g: float) -> void:
	growth = clampf(g, 0.0, 1.0)
	var k := int(round(growth * float(n_trees)))
	for ty in range(N_MESH_TYPES):
		canopy_mm[ty].visible_instance_count = type_cum[ty][k]
		dot_mm[ty].visible_instance_count = dot_cum[ty][k]
	trunk_mm.visible_instance_count = trunk_cum[k]
	for m in all_mats:
		m.set_shader_parameter("u_growth", growth)
	growth_label.text = "Wachstum %.2f" % growth
	if absf(growth_slider.value - growth) > 0.001:
		growth_slider.set_value_no_signal(growth)
	_update_hud()


func set_sun_elevation(deg: float) -> void:
	sun_elev = deg
	to_sun = _sun_vector(deg)
	sun.look_at_from_position(to_sun * 60.0, Vector3.ZERO, Vector3.UP)
	for m in dot_mats:
		m.set_shader_parameter("u_sun_dir", to_sun)
	sky_mat.set_shader_parameter("u_sun_dir", to_sun)
	sun_label.text = "Sonne %d°" % int(round(deg))
	if absf(sun_slider.value - deg) > 0.01:
		sun_slider.set_value_no_signal(deg)
	_update_hud()


func set_shadow(on: bool) -> void:
	sun.shadow_enabled = on
	_update_hud()


## Gives the trackball an angular velocity (rad/s) - used by the bench for a "rolled" screenshot.
func nudge(v: Vector2) -> void:
	drag_vel = v


func _update_hud() -> void:
	var k := int(round(growth * float(n_trees)))
	hud.extra = "%d/%d Bäume · %d Punkte · Wachstum %.2f · Sonne %d° · Schatten %s" % [
		k, n_trees, n_dots, growth, int(round(sun_elev)), "hart" if sun.shadow_enabled else "aus"]


func _wire_ui() -> void:
	growth_slider.value_changed.connect(set_growth)
	sun_slider.value_changed.connect(set_sun_elevation)
	$UI/Root/Bottom/Row3/Shadow.pressed.connect(func() -> void: set_shadow(not sun.shadow_enabled))
	$UI/Root/Bottom/Row3/Back.pressed.connect(func() -> void: get_tree().change_scene_to_file("res://scenes/main.tscn"))


# ---------------------------------------------------------------- trackball

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		dragging = event.pressed
		if dragging:
			drag_vel = Vector2.ZERO
			drag_accum = Vector2.ZERO
	elif event is InputEventMouseMotion and dragging:
		drag_accum += event.relative


func _process(delta: float) -> void:
	var k := 0.0022
	if dragging:
		drag_vel = drag_accum * k / maxf(delta, 0.0001)
		drag_accum = Vector2.ZERO
	else:
		drag_vel *= exp(-delta / 0.4)
		if drag_vel.length() < 0.0005:
			drag_vel = Vector2.ZERO
	if drag_vel != Vector2.ZERO:
		var b := cam.global_transform.basis
		planet.rotate(b.y.normalized(), drag_vel.x * delta)
		planet.rotate(b.x.normalized(), drag_vel.y * delta)
	var t := float(Time.get_ticks_msec()) / 1000.0
	for i in range(stripes.size()):
		stripes[i].position.x = sin(t * 0.06 + float(i) * 1.3) * 2.5
