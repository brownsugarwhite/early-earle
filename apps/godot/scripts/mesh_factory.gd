extends RefCounted
## Procedural meshes shared by the labs. Godot expects clockwise front faces
## (seen from outside), so every generated triangle is checked against the
## outward direction and flipped when needed.


## Geodesic icosphere of the given frequency: verts = 10*f*f + 2 (f = 6 -> 362 verts, 720 tris).
static func icosphere(frequency: int, radius: float = 1.0) -> ArrayMesh:
	var t := (1.0 + sqrt(5.0)) / 2.0
	var base: Array[Vector3] = [
		Vector3(-1, t, 0), Vector3(1, t, 0), Vector3(-1, -t, 0), Vector3(1, -t, 0),
		Vector3(0, -1, t), Vector3(0, 1, t), Vector3(0, -1, -t), Vector3(0, 1, -t),
		Vector3(t, 0, -1), Vector3(t, 0, 1), Vector3(-t, 0, -1), Vector3(-t, 0, 1)]
	var faces := [
		[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
		[1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
		[3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
		[4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]]
	var verts := PackedVector3Array()
	var indices := PackedInt32Array()
	var lookup := {}
	var f := float(frequency)
	for face in faces:
		var a: Vector3 = base[face[0]].normalized()
		var b: Vector3 = base[face[1]].normalized()
		var c: Vector3 = base[face[2]].normalized()
		var rows: Array[PackedInt32Array] = []
		for i in range(frequency + 1):
			var row := PackedInt32Array()
			for j in range(frequency + 1 - i):
				var p := (a + (b - a) * (float(i) / f) + (c - a) * (float(j) / f)).normalized()
				var key := Vector3i(roundi(p.x * 20000.0), roundi(p.y * 20000.0), roundi(p.z * 20000.0))
				var idx: int
				if lookup.has(key):
					idx = lookup[key]
				else:
					idx = verts.size()
					verts.append(p)
					lookup[key] = idx
				row.append(idx)
			rows.append(row)
		for i in range(frequency):
			for j in range(frequency - i):
				push_tri(verts, indices, rows[i][j], rows[i + 1][j], rows[i][j + 1], Vector3.ZERO)
				if j < frequency - i - 1:
					push_tri(verts, indices, rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1], Vector3.ZERO)
	var normals := PackedVector3Array()
	normals.resize(verts.size())
	var scaled := PackedVector3Array()
	scaled.resize(verts.size())
	for i in range(verts.size()):
		normals[i] = verts[i]
		scaled[i] = verts[i] * radius
	return make_mesh(scaled, normals, PackedVector2Array(), indices)


## Appends triangle (i0, i1, i2) wound so that its front faces away from `center`.
static func push_tri(verts: PackedVector3Array, indices: PackedInt32Array, i0: int, i1: int, i2: int, center: Vector3) -> void:
	var v0 := verts[i0]
	var v1 := verts[i1]
	var v2 := verts[i2]
	var n := (v1 - v0).cross(v2 - v0)
	var outward := (v0 + v1 + v2) / 3.0 - center
	if n.dot(outward) > 0.0:
		# counter-clockwise from outside -> back face in Godot, flip
		indices.append_array(PackedInt32Array([i0, i2, i1]))
	else:
		indices.append_array(PackedInt32Array([i0, i1, i2]))


## Flat hexagon in the XY plane, radius 1. UV = local XY so a shader can rebuild it as a billboard.
static func hexagon() -> ArrayMesh:
	var verts := PackedVector3Array()
	var uvs := PackedVector2Array()
	var normals := PackedVector3Array()
	for k in range(6):
		var a := deg_to_rad(60.0 * k + 30.0)
		verts.append(Vector3(cos(a), sin(a), 0.0))
		uvs.append(Vector2(cos(a), sin(a)))
		normals.append(Vector3(0, 0, 1))
	var idx := PackedInt32Array([0, 2, 1, 0, 3, 2, 0, 4, 3, 0, 5, 4])
	return make_mesh(verts, normals, uvs, idx)


## Unit strip: x in [-0.5, 0.5], y in [0, 1]; UV = (x + 0.5, y). Used for trunk billboards.
static func strip() -> ArrayMesh:
	var verts := PackedVector3Array([Vector3(-0.5, 0, 0), Vector3(0.5, 0, 0), Vector3(0.5, 1, 0), Vector3(-0.5, 1, 0)])
	var uvs := PackedVector2Array([Vector2(0, 0), Vector2(1, 0), Vector2(1, 1), Vector2(0, 1)])
	var normals := PackedVector3Array([Vector3(0, 0, 1), Vector3(0, 0, 1), Vector3(0, 0, 1), Vector3(0, 0, 1)])
	var idx := PackedInt32Array([0, 2, 1, 0, 3, 2])
	return make_mesh(verts, normals, uvs, idx)


## Soft radial disc (white, alpha falls off to the edge) for particle billboards.
static func soft_disc_texture(size: int = 32, hard: bool = false) -> ImageTexture:
	var img := Image.create(size, size, false, Image.FORMAT_RGBA8)
	for y in range(size):
		for x in range(size):
			var d := Vector2((x + 0.5) / size - 0.5, (y + 0.5) / size - 0.5).length() * 2.0
			var a: float
			if hard:
				a = 1.0 if d < 0.9 else 0.0
			else:
				a = clampf(1.0 - smoothstep(0.35, 1.0, d), 0.0, 1.0)
			img.set_pixel(x, y, Color(1, 1, 1, a))
	return ImageTexture.create_from_image(img)


static func make_mesh(verts: PackedVector3Array, normals: PackedVector3Array, uvs: PackedVector2Array, indices: PackedInt32Array) -> ArrayMesh:
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = verts
	if normals.size() > 0:
		arrays[Mesh.ARRAY_NORMAL] = normals
	if uvs.size() > 0:
		arrays[Mesh.ARRAY_TEX_UV] = uvs
	arrays[Mesh.ARRAY_INDEX] = indices
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	return mesh
