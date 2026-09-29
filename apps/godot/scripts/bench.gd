extends Node
## Autoload "Bench": scripted measurement + screenshot run for both labs.
##
##   Godot --path apps/godot -- --bench --out=/abs/dir [--seconds=3]
##   Godot --path apps/godot --rendering-method gl_compatibility -- --bench --out=/abs/dir
##
## For every configuration it prints one JSON line (fps, frame-time p50/p99 in ms,
## draw calls, objects, primitives, physics step ms) and writes PNG screenshots of
## the root viewport into --out. Results are also stored in res://bench/results-<method>-<driver>.json.
## Needs a window (the dummy rasterizer of --headless renders nothing).

var active := false
var out_dir := ""
var seconds := 3.0
var results: Array = []
var renderer := ""


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		if a == "--bench":
			active = true
		elif a.begins_with("--out="):
			out_dir = a.substr(6)
		elif a.begins_with("--seconds="):
			seconds = float(a.substr(10))
	if active:
		_run.call_deferred()


func _run() -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	renderer = RenderingServer.get_current_rendering_method()
	print("[bench] renderer=%s driver=%s gpu=%s viewport=%s" % [
		renderer, RenderingServer.get_current_rendering_driver_name(),
		RenderingServer.get_video_adapter_name(), str(get_viewport().get_visible_rect().size)])
	if out_dir != "":
		DirAccess.make_dir_recursive_absolute(out_dir)
	await _blob_lab()
	await _earle_lab()
	_save()
	print("[bench] done")
	get_tree().quit()


func _blob_lab() -> void:
	var lab = await _load("res://scenes/blob_lab.tscn")
	var names := ["jelly", "liquid", "gas", "fire"]
	lab.set_zoom(false)
	for n in [1, 9, 36]:
		lab.set_count(n)
		lab.set_material(0)
		await _measure("blob", "%02d-jelly" % n)
		if n == 36:
			await _shot("p1g-blobs-36-jelly.png")
		elif n == 9:
			await _shot("p1g-blobs-09-jelly.png")
	lab.set_count(36)
	for k in [1, 2, 3]:
		lab.set_material(k)
		await _measure("blob", "36-" + names[k])
		await _shot("p1g-blobs-36-%s.png" % names[k])
	lab.set_material(0)
	await _measure("blob", "36-jelly-repeat")
	lab.set_softbody(true)
	await _wait(1.2)
	lab.poke()
	await _measure("blob", "36-jelly+softbody-hero(poked)")
	lab.poke()
	await _wait(0.14)
	await _shot("p1g-softbody-poke.png")
	lab.set_softbody(false)
	await _wait(0.3)
	lab.start_merge()
	await _wait(0.15)
	await _shot("p1g-merge-mid.png")
	await _wait(0.25)
	await _shot("p1g-merge-pop.png")
	await _wait(0.6)
	lab.set_count(1)
	lab.set_zoom(true)
	await _wait(0.5)
	await _shot("p1g-blob-01-hero.png")
	lab.set_softbody(true)
	await _wait(1.4)
	lab.poke()
	await _wait(0.14)
	await _shot("p1g-blob-01-hero-softbody.png")
	await _measure("blob", "01-jelly+softbody-hero")
	lab.set_softbody(false)
	lab.set_zoom(false)


func _earle_lab() -> void:
	var lab = await _load("res://scenes/earle_lab.tscn")
	lab.set_growth(0.0)
	await _measure("earle", "growth-0")
	await _shot("p2g-earle-growth-0.png")
	lab.set_growth(0.5)
	await _wait(0.3)
	await _shot("p2g-earle-growth-05.png")
	lab.set_growth(1.0)
	await _measure("earle", "growth-1")
	await _shot("p2g-earle-growth-1.png")
	lab.set_shadow(false)
	await _measure("earle", "growth-1-no-shadow")
	lab.set_shadow(true)
	lab.set_sun_elevation(22.0)
	await _wait(0.3)
	await _shot("p2g-earle-sun-22.png")
	lab.set_sun_elevation(10.0)
	lab.nudge(Vector2(0.0, 0.35))
	await _wait(0.4)
	await _shot("p2g-earle-rolled.png")


func _load(path: String) -> Node:
	get_tree().change_scene_to_file(path)
	for i in range(4):
		await get_tree().process_frame
	return get_tree().current_scene


func _wait(t: float) -> void:
	await get_tree().create_timer(t).timeout


func _measure(scene: String, cfg: String) -> void:
	# 3D only: hide the lab UI and the HUD while sampling (they add ~30 canvas draw calls)
	var cur := get_tree().current_scene
	var ui := cur.get_node_or_null("UI")
	var hud := cur.get_node_or_null("PerfHud")
	if ui:
		ui.visible = false
	if hud:
		hud.visible = false
	var rid := get_viewport().get_viewport_rid()
	RenderingServer.viewport_set_measure_render_time(rid, true)
	await _wait(0.7) # warm-up (pipeline compilation, shadow first frame)
	var samples := PackedFloat64Array()
	var gpu := PackedFloat64Array()
	var cpu := PackedFloat64Array()
	var phys := PackedFloat64Array()
	var t0 := Time.get_ticks_usec()
	var last := t0
	while Time.get_ticks_usec() - t0 < int(seconds * 1000000.0):
		await get_tree().process_frame
		var now := Time.get_ticks_usec()
		samples.append(float(now - last) / 1000.0)
		gpu.append(RenderingServer.viewport_get_measured_render_time_gpu(rid))
		cpu.append(RenderingServer.viewport_get_measured_render_time_cpu(rid))
		phys.append(Performance.get_monitor(Performance.TIME_PHYSICS_PROCESS) * 1000.0)
		last = now
	samples.sort()
	gpu.sort()
	cpu.sort()
	phys.sort()
	var n := samples.size()
	var d := {
		"renderer": renderer,
		"scene": scene,
		"config": cfg,
		"frames": n,
		"fps": snappedf(float(n) / (float(last - t0) / 1000000.0), 0.1),
		"p50_ms": snappedf(samples[int((n - 1) * 0.5)], 0.01),
		"p99_ms": snappedf(samples[int((n - 1) * 0.99)], 0.01),
		"max_ms": snappedf(samples[n - 1], 0.01),
		"gpu_ms_p50": snappedf(gpu[int((n - 1) * 0.5)], 0.01),
		"gpu_ms_p99": snappedf(gpu[int((n - 1) * 0.99)], 0.01),
		"cpu_ms_p50": snappedf(cpu[int((n - 1) * 0.5)], 0.01),
		"draw_calls": RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME),
		"objects": RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_OBJECTS_IN_FRAME),
		"primitives": RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_PRIMITIVES_IN_FRAME),
		"physics_ms_p50": snappedf(phys[int((n - 1) * 0.5)], 0.001),
		"physics_ms_max": snappedf(phys[n - 1], 0.001),
		"static_mem_mb": snappedf(OS.get_static_memory_usage() / 1048576.0, 0.1),
		"video_mem_mb": snappedf(RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_VIDEO_MEM_USED) / 1048576.0, 0.1),
	}
	results.append(d)
	print("[bench] " + JSON.stringify(d))
	if ui:
		ui.visible = true
	if hud:
		hud.visible = true


func _shot(name: String) -> void:
	if out_dir == "":
		return
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	if img == null or img.is_empty():
		print("[bench] shot %s skipped (no rasterizer)" % name)
		return
	var err := img.save_png(out_dir.path_join(name))
	print("[bench] shot %s -> %s" % [name, error_string(err)])


func _save() -> void:
	var f := FileAccess.open("res://bench/results-%s-%s.json" % [renderer, RenderingServer.get_current_rendering_driver_name()], FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(results, "  "))
		f.close()
