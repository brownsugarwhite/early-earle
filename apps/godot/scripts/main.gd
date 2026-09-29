extends Control
## Menu of the Godot comparison track: P1-G Blob-Lab and P2-G Earle-Lab.

@onready var hud := $PerfHud


func _ready() -> void:
	var th := Theme.new()
	th.default_font_size = 32
	theme = th
	$VBox/BlobBtn.pressed.connect(func() -> void: get_tree().change_scene_to_file("res://scenes/blob_lab.tscn"))
	$VBox/EarleBtn.pressed.connect(func() -> void: get_tree().change_scene_to_file("res://scenes/earle_lab.tscn"))
	hud.extra = "Menü · V = VSync an/aus"


func _unhandled_key_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode == KEY_V:
		var w := get_window()
		var on := DisplayServer.window_get_vsync_mode(w.get_window_id()) != DisplayServer.VSYNC_DISABLED
		DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED if on else DisplayServer.VSYNC_ENABLED, w.get_window_id())
