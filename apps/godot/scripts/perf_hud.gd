extends CanvasLayer
## Shared performance overlay for all lab scenes (P1-G / P2-G).
## Shows fps, frame time p50/p99 over the last second, draw calls / objects /
## primitives (RenderingServer.get_rendering_info), physics step time and a
## renderer badge (Mobile / Compatibility / Forward+ plus driver name).

@onready var label: Label = $Panel/Label
@onready var badge: Label = $Badge

var _frames := PackedFloat64Array()
var _acc := 0.0
var fps := 0.0
var p50_ms := 0.0
var p99_ms := 0.0
var draw_calls := 0
var objects := 0
var primitives := 0
var phys_ms := 0.0
var gpu_ms := 0.0
var cpu_ms := 0.0
## Free text a lab can set (current configuration); refreshes the label immediately.
var extra := "":
	set(value):
		extra = value
		if is_node_ready():
			_refresh()


static func renderer_name() -> String:
	var m := RenderingServer.get_current_rendering_method()
	match m:
		"mobile":
			return "Mobile"
		"gl_compatibility":
			return "Compatibility"
		"forward_plus":
			return "Forward+"
	return m


static func renderer_badge() -> String:
	return "%s · %s" % [renderer_name(), RenderingServer.get_current_rendering_driver_name()]


func _ready() -> void:
	RenderingServer.viewport_set_measure_render_time(get_viewport().get_viewport_rid(), true)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.06, 0.08, 0.1, 0.8)
	sb.content_margin_left = 12.0
	sb.content_margin_right = 12.0
	sb.content_margin_top = 8.0
	sb.content_margin_bottom = 8.0
	$Panel.add_theme_stylebox_override("panel", sb)
	label.add_theme_color_override("font_color", Color(0.86, 0.97, 0.92))
	badge.add_theme_color_override("font_color", Color(0.86, 0.97, 0.92))
	badge.add_theme_color_override("font_outline_color", Color(0.06, 0.08, 0.1, 0.9))
	badge.add_theme_constant_override("outline_size", 8)
	badge.text = renderer_badge()
	label.text = "…"


func _process(delta: float) -> void:
	_frames.append(delta * 1000.0)
	_acc += delta
	if _acc < 1.0:
		return
	var sorted := _frames.duplicate()
	sorted.sort()
	var n := sorted.size()
	p50_ms = sorted[int(floor((n - 1) * 0.5))]
	p99_ms = sorted[int(floor((n - 1) * 0.99))]
	fps = float(n) / _acc
	draw_calls = RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME)
	objects = RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_OBJECTS_IN_FRAME)
	primitives = RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_PRIMITIVES_IN_FRAME)
	phys_ms = Performance.get_monitor(Performance.TIME_PHYSICS_PROCESS) * 1000.0
	var rid := get_viewport().get_viewport_rid()
	gpu_ms = RenderingServer.viewport_get_measured_render_time_gpu(rid)
	cpu_ms = RenderingServer.viewport_get_measured_render_time_cpu(rid)
	_frames.clear()
	_acc = 0.0
	_refresh()


func _refresh() -> void:
	label.text = "%4.0f fps   p50 %5.2f ms   p99 %5.2f ms   gpu %.2f ms   cpu %.2f ms\ndraw %d   obj %d   tris %dk   phys %.2f ms\n%s" % [
		fps, p50_ms, p99_ms, gpu_ms, cpu_ms, draw_calls, objects, int(primitives / 1000), phys_ms, extra]
