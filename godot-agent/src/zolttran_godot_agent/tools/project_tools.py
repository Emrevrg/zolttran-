"""Project tools — create/configure Godot projects."""
from __future__ import annotations
import os
import re
from ..models import ToolCallResponse


def _write(path: str, content: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def _read(path: str) -> str | None:
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        return f.read()


def project_create(
    *,
    path: str,
    name: str,
    renderer: str = "gl_compatibility",
) -> ToolCallResponse:
    """Create a minimal Godot 4 project directory."""
    os.makedirs(path, exist_ok=True)

    renderer_map = {
        "forward_plus": "Forward Plus",
        "mobile": "Mobile",
        "gl_compatibility": "GL Compatibility",
    }
    renderer_display = renderer_map.get(renderer, "GL Compatibility")

    project_godot = (
        f'; Engine configuration file.\n'
        f'config_version=5\n\n'
        f'[application]\n\n'
        f'config/name="{name}"\n'
        f'config/version="0.1.0"\n'
        f'run/main_scene="res://scenes/main.tscn"\n'
        f'config/features=PackedStringArray("4.3", "{renderer_display}")\n\n'
        f'[rendering]\n\n'
        f'renderer/rendering_method="{renderer}"\n'
    )
    _write(os.path.join(path, "project.godot"), project_godot)

    for d in ["scenes", "scripts", "assets/sprites", "assets/audio", "assets/shaders", "tests"]:
        os.makedirs(os.path.join(path, d), exist_ok=True)

    # Minimal main scene
    main_scene = '[gd_scene load_steps=1 format=3]\n\n[node name="Main" type="Node2D"]\n'
    _write(os.path.join(path, "scenes", "main.tscn"), main_scene)

    return ToolCallResponse(
        success=True,
        data={"path": path, "name": name, "renderer": renderer},
    )


def project_get_info(
    *,
    project_path: str,
) -> ToolCallResponse:
    """Read project.godot and return structured project info."""
    content = _read(os.path.join(project_path, "project.godot"))
    if content is None:
        return ToolCallResponse(success=False, error="project.godot not found")

    def extract(pattern: str) -> str | None:
        m = re.search(pattern, content, re.MULTILINE)
        return m.group(1) if m else None

    scenes = []
    for root, _, files in os.walk(project_path):
        for f in files:
            if f.endswith(".tscn"):
                rel = os.path.relpath(os.path.join(root, f), project_path).replace("\\", "/")
                scenes.append(f"res://{rel}")

    scripts = []
    for root, _, files in os.walk(project_path):
        for f in files:
            if f.endswith(".gd") or f.endswith(".cs"):
                rel = os.path.relpath(os.path.join(root, f), project_path).replace("\\", "/")
                scripts.append(f"res://{rel}")

    return ToolCallResponse(
        success=True,
        data={
            "name": extract(r'config/name="([^"]+)"'),
            "version": extract(r'config/version="([^"]+)"'),
            "main_scene": extract(r'run/main_scene="([^"]+)"'),
            "renderer": extract(r'renderer/rendering_method="([^"]+)"'),
            "scenes": scenes,
            "scripts": scripts,
            "path": project_path,
        },
    )


def project_set_setting(
    *,
    project_path: str,
    key: str,
    value: str | int | float | bool,
) -> ToolCallResponse:
    """Set a project setting in project.godot."""
    cfg_path = os.path.join(project_path, "project.godot")
    content = _read(cfg_path)
    if content is None:
        return ToolCallResponse(success=False, error="project.godot not found")

    serialized = f'"{value}"' if isinstance(value, str) else str(value).lower() if isinstance(value, bool) else str(value)
    pattern = re.compile(rf'^{re.escape(key)}=.*', re.MULTILINE)

    if pattern.search(content):
        new_content = pattern.sub(f"{key}={serialized}", content)
    else:
        new_content = content.rstrip() + f"\n{key}={serialized}\n"

    _write(cfg_path, new_content)
    return ToolCallResponse(success=True, data={"key": key, "value": value})


def project_add_autoload(
    *,
    project_path: str,
    name: str,
    path: str,
) -> ToolCallResponse:
    """Add an autoload singleton to project.godot."""
    cfg_path = os.path.join(project_path, "project.godot")
    content = _read(cfg_path)
    if content is None:
        return ToolCallResponse(success=False, error="project.godot not found")

    autoload_line = f'{name}="*{path}"'

    if "[autoload]" in content:
        if name in content:
            return ToolCallResponse(success=True, data={"name": name, "note": "already exists"})
        content = content.replace("[autoload]", f"[autoload]\n{autoload_line}")
    else:
        content += f"\n[autoload]\n\n{autoload_line}\n"

    _write(cfg_path, content)
    return ToolCallResponse(success=True, data={"name": name, "path": path})


def project_add_input_action(
    *,
    project_path: str,
    action: str,
    physical_key: int | None = None,
    key_unicode: int | None = None,
) -> ToolCallResponse:
    """Add an InputMap action to project.godot."""
    cfg_path = os.path.join(project_path, "project.godot")
    content = _read(cfg_path)
    if content is None:
        return ToolCallResponse(success=False, error="project.godot not found")

    if action in content:
        return ToolCallResponse(success=True, data={"action": action, "note": "already exists"})

    pk = physical_key or 0
    ku = key_unicode or 0

    action_entry = (
        f'{action}={{\n'
        f'"deadzone": 0.5,\n'
        f'"events": [Object(InputEventKey,"resource_local_to_scene":false,"device":-1,"window_id":0,'
        f'"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,'
        f'"pressed":false,"keycode":0,"physical_keycode":{pk},"key_label":0,'
        f'"unicode":{ku},"location":0,"echo":false,"script":null)]\n'
        f'}}\n'
    )

    if "[input]" in content:
        content = content.replace("[input]\n", f"[input]\n\n{action_entry}")
    else:
        content += f"\n[input]\n\n{action_entry}"

    _write(cfg_path, content)
    return ToolCallResponse(success=True, data={"action": action})
