extends Node3D
## P1-G Blob-Lab (Godot 4.7).
## 1 / 9 / 36 blobs in ONE MultiMesh draw call: an icosphere (frequency 6, 362 verts) is displaced
## in the vertex shader by a smooth-min-of-spheres SDF + noise + breathing + volume-preserving
## squash (INSTANCE_CUSTOM = seed, squash, phase). Fragment: diagonal gradient, hard crescent
## highlight, translucent inner organs, flat bubbles, vesica eye slit, fresnel rim, no outline.
## Hero variant: Jolt SoftBody3D with the same look (Poke = impulse on the top vertices).
## Merge: two blobs blend through a box-raymarched smooth-min SDF for 300 ms, then pop.
## Materials: jelly / liquid (+ drips) / gas (translucent + GPUParticles3D puffs) / fire
## (emissive noise + additive GPUParticles3D flames). Palette: plan section 2 / reference 03.

const CELL := 1.0
const RADIUS := 0.42
const BASE_Y := 0.95 # flat base of the unit blob, see blob_common.gdshaderinc
const MERGE_DURATION := 0.3
const MAX_BLOBS := 36
const MAT_NAMES := ["Jelly", "Flüssig", "Gas", "Feuer"]

const MeshFactory := preload("res://scripts/mesh_factory.gd")
const PerfHud := preload("res://scripts/perf_hud.gd")

@onready var cam: Camera3D = $Camera3D
@onready var sun: DirectionalLight3D = $Sun
@onready var hud: PerfHud = $PerfHud
@onready var ui_root: Control = $UI/Root

var count := 36
var material_kind := 0
var zoom := false
var mm: MultiMesh
var mmi: MultiMeshInstance3D
var mat_opaque: ShaderMaterial
var mat_gas: ShaderMaterial
var seeds := PackedFloat32Array()
var phases := PackedFloat32Array()
var positions: Array[Vector3] = []
var hidden := {}
var soft: SoftBody3D
var soft_mat: ShaderMaterial
var soft_point_count := 0
var merge_box: MeshInstance3D
var merge_mat: ShaderMaterial
var merge_t := -1.0
var pop_t := -1.0
var p_gas: GPUParticles3D
var p_fire: GPUParticles3D
var p_drips: GPUParticles3D
var p_merge: GPUParticles3D
var disc_tex: ImageTexture
var rng := RandomNumberGenerator.new()
var pokes := 0


func _ready() -> void:
	rng.seed = 7
	var th := Theme.new()
	th.default_font_size = 30
	ui_root.theme = th
	disc_tex = MeshFactory.soft_disc_texture(32)
	cam.fov = 50.0
	_setup_sun()
	_build_plate()
	_build_blobs()
	_build_particles()
	_build_merge()
	_wire_ui()
	set_count(36)
	set_material(0)


func _setup_sun() -> void:
	sun.look_at_from_position(Vector3(6.0, 3.2, -2.5), Vector3.ZERO, Vector3.UP)
	sun.shadow_enabled = true
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_ORTHOGONAL
	sun.directional_shadow_max_distance = 30.0
	sun.light_angular_distance = 0.0
	sun.shadow_blur = 0.0
	sun.shadow_bias = 0.03
	sun.shadow_normal_bias = 1.5


func _apply_camera() -> void:
	if zoom and positions.size() > 0:
		var target := positions[0] + Vector3(0.0, RADIUS * 0.9, 0.0)
		cam.look_at_from_position(target + Vector3(0.0, 1.35, 2.5), target, Vector3.UP)
	else:
		cam.look_at_from_position(Vector3(0.0, 10.5, 10.0), Vector3(0.0, 0.0, 0.6), Vector3.UP)


func _build_plate() -> void:
	var flat := load("res://shaders/flat_lit.gdshader")
	var box := BoxMesh.new()
	box.size = Vector3(7.4, 0.5, 7.4)
	var plate := MeshInstance3D.new()
	plate.mesh = box
	plate.position = Vector3(0.0, -0.25, 0.0)
	var pm := ShaderMaterial.new()
	pm.shader = flat
	pm.set_shader_parameter("u_lit", Color("b3bb6d"))
	pm.set_shader_parameter("u_shade", Color("242c0b"))
	plate.material_override = pm
	add_child(plate)
	var body := StaticBody3D.new()
	var cs := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = box.size
	cs.shape = shape
	body.add_child(cs)
	body.position = plate.position
	add_child(body)
	var ground := MeshInstance3D.new()
	var pl := PlaneMesh.new()
	pl.size = Vector2(60.0, 60.0)
	ground.mesh = pl
	ground.position = Vector3(0.0, -1.6, 0.0)
	var gm := ShaderMaterial.new()
	gm.shader = flat
	gm.set_shader_parameter("u_lit", Color("1b2c33"))
	gm.set_shader_parameter("u_shade", Color("0b141a"))
	ground.material_override = gm
	add_child(ground)


func _apply_palette(mat: ShaderMaterial, pale: bool) -> void:
	if pale:
		mat.set_shader_parameter("u_col_light", Color("e6fbf3"))
		mat.set_shader_parameter("u_col_base", Color("b9f2e8"))
		mat.set_shader_parameter("u_col_deep", Color("7ce6d5"))
		mat.set_shader_parameter("u_col_organ", Color("5ab8ad"))
		mat.set_shader_parameter("u_col_bubble", Color("e6fbf3"))
	else:
		mat.set_shader_parameter("u_col_light", Color("a6f5e6"))
		mat.set_shader_parameter("u_col_base", Color("7ce6d5"))
		mat.set_shader_parameter("u_col_deep", Color("22baa9"))
		mat.set_shader_parameter("u_col_organ", Color("2f7f7a"))
		mat.set_shader_parameter("u_col_bubble", Color("5fd6ca"))
	mat.set_shader_parameter("u_col_eye", Color("0f1c22"))
	mat.set_shader_parameter("u_col_fire_a", Color("c8542a"))
	mat.set_shader_parameter("u_col_fire_b", Color("ffd43f"))


func _build_blobs() -> void:
	var mesh := MeshFactory.icosphere(6, 1.0)
	mat_opaque = ShaderMaterial.new()
	mat_opaque.shader = load("res://shaders/blob.gdshader")
	mat_gas = ShaderMaterial.new()
	mat_gas.shader = load("res://shaders/blob_gas.gdshader")
	_apply_palette(mat_opaque, false)
	_apply_palette(mat_gas, true)
	mm = MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = false
	mm.use_custom_data = true
	mm.mesh = mesh
	mm.instance_count = MAX_BLOBS
	mmi = MultiMeshInstance3D.new()
	mmi.multimesh = mm
	mmi.material_override = mat_opaque
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	mmi.custom_aabb = AABB(Vector3(-5.0, -1.0, -5.0), Vector3(10.0, 4.0, 10.0))
	add_child(mmi)
	for i in range(MAX_BLOBS):
		seeds.append(rng.randf_range(1.0, 50.0))
		phases.append(rng.randf_range(0.0, 20.0))


func _build_merge() -> void:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var box := BoxMesh.new()
	box.size = Vector3(5.6, 3.2, 3.2)
	st.append_from(box, 0, Transform3D(Basis.IDENTITY, Vector3(1.2, 0.0, 0.0)))
	merge_box = MeshInstance3D.new()
	merge_box.mesh = st.commit()
	merge_mat = ShaderMaterial.new()
	merge_mat.shader = load("res://shaders/blob_merge.gdshader")
	_apply_palette(merge_mat, false)
	merge_box.material_override = merge_mat
	merge_box.visible = false
	merge_box.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(merge_box)


func _ramp(colors: Array) -> GradientTexture1D:
	var g := Gradient.new()
	g.set_color(0, colors[0])
	g.set_color(1, colors[colors.size() - 1])
	for i in range(1, colors.size() - 1):
		g.add_point(float(i) / float(colors.size() - 1), colors[i])
	var gt := GradientTexture1D.new()
	gt.gradient = g
	return gt


func _make_particles(amount: int, life: float, pm: ParticleProcessMaterial, size: float, additive: bool) -> GPUParticles3D:
	var p := GPUParticles3D.new()
	p.amount = amount
	p.lifetime = life
	p.emitting = false
	p.process_material = pm
	p.visibility_aabb = AABB(Vector3(-6.0, -3.0, -6.0), Vector3(12.0, 10.0, 12.0))
	var quad := QuadMesh.new()
	quad.size = Vector2(size, size)
	var sm := StandardMaterial3D.new()
	sm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	sm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	sm.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	sm.vertex_color_use_as_albedo = true
	sm.albedo_texture = disc_tex
	sm.cull_mode = BaseMaterial3D.CULL_DISABLED
	if additive:
		sm.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	quad.material = sm
	p.draw_pass_1 = quad
	p.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(p)
	return p


func _build_particles() -> void:
	var gas := ParticleProcessMaterial.new()
	gas.direction = Vector3(0.0, 1.0, 0.0)
	gas.spread = 55.0
	gas.initial_velocity_min = 0.25
	gas.initial_velocity_max = 0.6
	gas.gravity = Vector3(0.0, 0.3, 0.0)
	gas.damping_min = 0.2
	gas.damping_max = 0.5
	gas.scale_min = 0.6
	gas.scale_max = 1.3
	gas.turbulence_enabled = true
	gas.turbulence_noise_strength = 0.9
	gas.turbulence_noise_scale = 3.0
	gas.color_ramp = _ramp([Color(0.79, 0.96, 0.89, 0.0), Color(0.79, 0.96, 0.89, 0.42), Color(0.55, 0.9, 0.85, 0.0)])
	p_gas = _make_particles(MAX_BLOBS * 10, 2.0, gas, 0.42, false)

	var fire := ParticleProcessMaterial.new()
	fire.direction = Vector3(0.0, 1.0, 0.0)
	fire.spread = 18.0
	fire.initial_velocity_min = 1.2
	fire.initial_velocity_max = 2.2
	fire.gravity = Vector3(0.0, 2.2, 0.0)
	fire.scale_min = 0.5
	fire.scale_max = 1.0
	fire.color_ramp = _ramp([Color(1.0, 0.85, 0.3, 0.9), Color(0.85, 0.35, 0.1, 0.7), Color(0.3, 0.05, 0.02, 0.0)])
	p_fire = _make_particles(MAX_BLOBS * 14, 0.65, fire, 0.30, true)

	var drip := ParticleProcessMaterial.new()
	drip.direction = Vector3(0.0, -1.0, 0.0)
	drip.spread = 60.0
	drip.initial_velocity_min = 0.4
	drip.initial_velocity_max = 1.2
	drip.gravity = Vector3(0.0, -9.8, 0.0)
	drip.scale_min = 0.6
	drip.scale_max = 1.0
	drip.color_ramp = _ramp([Color(0.486, 0.902, 0.835, 1.0), Color(0.486, 0.902, 0.835, 1.0), Color(0.133, 0.729, 0.663, 0.0)])
	p_drips = _make_particles(MAX_BLOBS * 5, 0.8, drip, 0.11, false)

	var burst := ParticleProcessMaterial.new()
	burst.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
	burst.emission_sphere_radius = 0.3
	burst.direction = Vector3(0.0, 1.0, 0.0)
	burst.spread = 180.0
	burst.initial_velocity_min = 1.5
	burst.initial_velocity_max = 3.5
	burst.gravity = Vector3(0.0, -9.8, 0.0)
	burst.scale_min = 0.5
	burst.scale_max = 1.0
	burst.color_ramp = _ramp([Color(0.65, 0.96, 0.9, 1.0), Color(0.486, 0.902, 0.835, 1.0), Color(0.133, 0.729, 0.663, 0.0)])
	p_merge = _make_particles(48, 0.9, burst, 0.14, false)
	p_merge.one_shot = true
	p_merge.explosiveness = 0.95


func _update_emission_points() -> void:
	var pts := PackedVector3Array()
	var lrng := RandomNumberGenerator.new()
	lrng.seed = 3
	for i in range(count):
		if hidden.has(i):
			continue
		for k in range(4):
			pts.append(positions[i] + Vector3(lrng.randf_range(-0.5, 0.5), 0.35 + lrng.randf_range(0.0, 1.2), lrng.randf_range(-0.5, 0.5)) * RADIUS)
	if pts.is_empty():
		pts.append(Vector3(0.0, -100.0, 0.0))
	var img := Image.create_empty(pts.size(), 1, false, Image.FORMAT_RGBF)
	for i in range(pts.size()):
		img.set_pixel(i, 0, Color(pts[i].x, pts[i].y, pts[i].z))
	var tex := ImageTexture.create_from_image(img)
	for p in [p_gas, p_fire, p_drips]:
		var m: ParticleProcessMaterial = p.process_material
		m.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_POINTS
		m.emission_point_texture = tex
		m.emission_point_count = pts.size()


func _compute_positions(n: int) -> void:
	positions.clear()
	var side := int(ceil(sqrt(float(n))))
	var c := float(side - 1) / 2.0
	var ci := floori(side / 2.0) if side % 2 == 1 else floori(side / 2.0) - 1
	var cj := floori(side / 2.0)
	var order: Array[Vector2i] = [Vector2i(ci, cj)]
	if side > 1:
		order.append(Vector2i(ci + 1, cj))
	for j in range(side):
		for i in range(side):
			var cell := Vector2i(i, j)
			if not order.has(cell):
				order.append(cell)
	for k in range(n):
		var cell: Vector2i = order[k]
		positions.append(Vector3((float(cell.x) - c) * CELL, 0.0, (float(cell.y) - c) * CELL))


func _layout() -> void:
	var squash := 0.72 if material_kind == 1 else 1.0
	for i in range(MAX_BLOBS):
		var visible := i < count and not hidden.has(i)
		var tf: Transform3D
		if visible:
			tf = Transform3D(Basis.IDENTITY.scaled(Vector3.ONE * RADIUS), positions[i] + Vector3(0.0, BASE_Y * RADIUS, 0.0))
		else:
			tf = Transform3D(Basis.IDENTITY.scaled(Vector3.ONE * 0.0001), Vector3(0.0, -50.0, 0.0))
		mm.set_instance_transform(i, tf)
		mm.set_instance_custom_data(i, Color(seeds[i], squash, phases[i], 0.0))
	_update_emission_points()
	_update_hud()


func _update_hud() -> void:
	hud.extra = "%d Blobs (1 MultiMesh-Draw) · %s · SoftBody %s · Pokes %d" % [
		count, MAT_NAMES[material_kind], "an" if soft != null else "aus", pokes]


# ---------------------------------------------------------------- public API (UI + Bench)

func set_count(n: int) -> void:
	count = clampi(n, 1, MAX_BLOBS)
	hidden.clear()
	merge_t = -1.0
	pop_t = -1.0
	merge_box.visible = false
	if soft != null:
		soft.queue_free()
		soft = null
	_compute_positions(count)
	_layout()
	_apply_camera()


func set_material(k: int) -> void:
	material_kind = clampi(k, 0, 3)
	mmi.material_override = mat_gas if material_kind == 2 else mat_opaque
	var smin_k: float = [0.35, 0.5, 0.45, 0.35][material_kind]
	var amp: float = [0.04, 0.02, 0.07, 0.06][material_kind]
	for m in [mat_opaque, mat_gas, merge_mat]:
		m.set_shader_parameter("u_material", material_kind)
		m.set_shader_parameter("u_smin_k", smin_k)
		m.set_shader_parameter("u_noise_amp", amp)
	if soft_mat != null:
		soft_mat.set_shader_parameter("u_material", material_kind)
	p_gas.emitting = material_kind == 2
	p_fire.emitting = material_kind == 3
	p_drips.emitting = material_kind == 1
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF if material_kind == 2 else GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	_layout()


func set_zoom(on: bool) -> void:
	zoom = on
	_apply_camera()


func set_shadow(on: bool) -> void:
	sun.shadow_enabled = on


func set_softbody(on: bool) -> void:
	if on == (soft != null):
		return
	if on:
		soft = SoftBody3D.new()
		var sm := SphereMesh.new()
		sm.radius = RADIUS
		sm.height = RADIUS * 2.0
		sm.radial_segments = 20
		sm.rings = 10
		soft_point_count = sm.get_mesh_arrays()[Mesh.ARRAY_VERTEX].size()
		soft.mesh = sm
		soft.simulation_precision = 5
		soft.total_mass = 1.0
		soft.linear_stiffness = 0.55
		soft.pressure_coefficient = 160.0
		soft.damping_coefficient = 0.01
		soft.drag_coefficient = 0.0
		soft_mat = mat_opaque.duplicate()
		soft_mat.set_shader_parameter("u_displace", 0.0)
		soft_mat.set_shader_parameter("u_radius_ws", RADIUS)
		soft_mat.set_shader_parameter("u_material", material_kind)
		soft.material_override = soft_mat
		soft.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		soft.position = positions[0] + Vector3(0.0, RADIUS + 0.6, 0.0)
		add_child(soft)
		hidden[0] = true
	else:
		soft.queue_free()
		soft = null
		hidden.erase(0)
	_layout()


func _soft_center() -> Vector3:
	var c := Vector3.ZERO
	var samples := 12
	for k in range(samples):
		c += soft.get_point_transform(int(float(k) / float(samples) * float(soft_point_count)))
	return c / float(samples)


func poke() -> void:
	if soft == null:
		return
	var c := _soft_center()
	for i in range(soft_point_count):
		var p := soft.get_point_transform(i)
		if p.y > c.y + RADIUS * 0.45:
			soft.apply_impulse(i, Vector3(0.0, -0.02, 0.0))
	pokes += 1
	_update_hud()


func start_merge() -> void:
	if count < 2 or merge_t >= 0.0 or hidden.has(0) or hidden.has(1):
		return
	hidden[0] = true
	hidden[1] = true
	_layout()
	merge_box.position = positions[0] + Vector3(0.0, BASE_Y * RADIUS, 0.0)
	merge_box.scale = Vector3.ONE * RADIUS
	var off := (positions[1] - positions[0]) / RADIUS
	merge_mat.set_shader_parameter("u_b_offset", Vector3(off.x, 0.0, off.z))
	merge_mat.set_shader_parameter("u_seed_a", seeds[0])
	merge_mat.set_shader_parameter("u_seed_b", seeds[1])
	merge_mat.set_shader_parameter("u_t", 0.0)
	merge_box.visible = true
	merge_t = 0.0


func _process(delta: float) -> void:
	if merge_t >= 0.0:
		merge_t += delta
		merge_mat.set_shader_parameter("u_t", clampf(merge_t / MERGE_DURATION, 0.0, 1.0))
		if merge_t >= MERGE_DURATION:
			merge_t = -1.0
			merge_box.visible = false
			hidden.erase(0)
			_layout()
			pop_t = 0.0
			p_merge.position = positions[0] + Vector3(0.0, RADIUS, 0.0)
			p_merge.restart()
	if pop_t >= 0.0:
		pop_t += delta
		var s := 1.0 + 0.38 * exp(-pop_t * 6.0) * cos(pop_t * 18.0)
		if pop_t > 0.7:
			pop_t = -1.0
			s = 1.0
		var base_squash := 0.72 if material_kind == 1 else 1.0
		mm.set_instance_custom_data(0, Color(seeds[0], base_squash * s, phases[0], 0.0))
	if soft != null and soft_mat != null:
		soft_mat.set_shader_parameter("u_center_ws", _soft_center())


func _wire_ui() -> void:
	var b := $UI/Root/Bottom
	b.get_node("Row1/Count1").pressed.connect(func() -> void: set_count(1))
	b.get_node("Row1/Count9").pressed.connect(func() -> void: set_count(9))
	b.get_node("Row1/Count36").pressed.connect(func() -> void: set_count(36))
	b.get_node("Row2/MatJelly").pressed.connect(func() -> void: set_material(0))
	b.get_node("Row2/MatLiquid").pressed.connect(func() -> void: set_material(1))
	b.get_node("Row2/MatGas").pressed.connect(func() -> void: set_material(2))
	b.get_node("Row2/MatFire").pressed.connect(func() -> void: set_material(3))
	b.get_node("Row3/Soft").pressed.connect(func() -> void: set_softbody(soft == null))
	b.get_node("Row3/Poke").pressed.connect(poke)
	b.get_node("Row3/Merge").pressed.connect(start_merge)
	b.get_node("Row3/Zoom").pressed.connect(func() -> void: set_zoom(not zoom))
	b.get_node("Row4/Shadow").pressed.connect(func() -> void: set_shadow(not sun.shadow_enabled))
	b.get_node("Row4/Back").pressed.connect(func() -> void: get_tree().change_scene_to_file("res://scenes/main.tscn"))


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		poke()
