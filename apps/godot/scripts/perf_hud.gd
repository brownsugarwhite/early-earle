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
## Free text a lab can set (current configuration).
var extra := ""


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
	_frames.clear()
	_acc = 0.0
	label.text = "%4.0f fps   p50 %5.2f ms   p99 %5.2f ms\ndraw %d   obj %d   tris %dk   phys %.2f ms\n%s" % [
		fps, p50_ms, p99_ms, draw_calls, objects, int(primitives / 1000), phys_ms, extra]
