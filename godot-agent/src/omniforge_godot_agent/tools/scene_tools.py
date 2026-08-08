"""Scene tree tools — create, modify, read Godot scenes."""
from __future__ import annotations
import os
import re
import json
from typing import Any
from ..models import ToolCallResponse


# ---------------------------------------------------------------------------
# .tscn helpers
# ---------------------------------------------------------------------------

def _read_tscn(path: str) -> str | None:
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        return f.read()


def _write_tscn(path: str, content: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def _serialize_value(v: Any) -> str:
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, str):
        if v.startswith(("ExtResource", "SubResource", "Vector", "Color", "Rect")):
            return v
        return f'"{v}"'
    if isinstance(v, list):
        return f"[{', '.join(_serialize_value(i) for i in v)}]"
    if isinstance(v, dict):
        pairs = ", ".join(f'"{k}": {_serialize_value(val)}' for k, val in v.items())
        return "{" + pairs + "}"
    return str(v)


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

def scene_create(
    *,
    project_path: str,
    name: str,
    root_type: str = "Node2D",
    save_path: str,
) -> ToolCallResponse:
    """Create a new empty .tscn scene."""
    full_path = os.path.join(project_path, save_path.lstrip("res://"))
    content = (
        f'[gd_scene load_steps=1 format=3]\n\n'
        f'[node name="{name}" type="{root_type}"]\n'
    )
    _write_tscn(full_path, content)
    return ToolCallResponse(success=True, data={"path": save_path})


def scene_add_node(
    *,
    project_path: str,
    scene: str,
    parent: str,
    type: str,
    name: str,
    properties: dict[str, Any] | None = None,
) -> ToolCallResponse:
    """Add a node to an existing scene."""
    full_path = os.path.join(project_path, scene.lstrip("res://"))
    content = _read_tscn(full_path)
    if content is None:
        return ToolCallResponse(success=False, error=f"Scene not found: {scene}")

    node_block = f'\n[node name="{name}" type="{type}" parent="{parent}"]\n'
    if properties:
        for k, v in properties.items():
            node_block += f"{k} = {_serialize_value(v)}\n"

    content += node_block
    _write_tscn(full_path, content)
    return ToolCallResponse(success=True, data={"node": name, "parent": parent})


def scene_remove_node(
    *,
    project_path: str,
    scene: str,
    node_path: str,
) -> ToolCallResponse:
    """Remove a node from a scene by its path."""
    full_path = os.path.join(project_path, scene.lstrip("res://"))
    content = _read_tscn(full_path)
    if content is None:
        return ToolCallResponse(success=False, error=f"Scene not found: {scene}")

    node_name = node_path.split("/")[-1]
    # Remove the node block
    pattern = re.compile(
        rf'\[node name="{re.escape(node_name)}"[^\]]*\]\n(?:[^\[]*\n)*', re.MULTILINE
    )
    new_content = pattern.sub("", content)
    _write_tscn(full_path, new_content)
    return ToolCallResponse(success=True, data={"removed": node_path})


def scene_set_property(
    *,
    project_path: str,
    scene: str,
    node_path: str,
    property: str,
    value: Any,
) -> ToolCallResponse:
    """Set a property on a node in a scene."""
    full_path = os.path.join(project_path, scene.lstrip("res://"))
    content = _read_tscn(full_path)
    if content is None:
        return ToolCallResponse(success=False, error=f"Scene not found: {scene}")

    node_name = node_path.split("/")[-1]
    serialized = _serialize_value(value)

    # Check if property already exists after this node header
    prop_pattern = re.compile(
        rf'(\[node name="{re.escape(node_name)}"[^\]]*\]\n(?:.*\n)*?)'
        rf'{re.escape(property)} = [^\n]+',
        re.MULTILINE,
    )
    if prop_pattern.search(content):
        new_content = prop_pattern.sub(
            lambda m: m.group(1) + f"{property} = {serialized}", content
        )
    else:
        # Append after node header
        node_header = re.compile(
            rf'\[node name="{re.escape(node_name)}"[^\]]*\]\n', re.MULTILINE
        )
        new_content = node_header.sub(
            lambda m: m.group(0) + f"{property} = {serialized}\n", content, count=1
        )

    _write_tscn(full_path, new_content)
    return ToolCallResponse(success=True, data={"property": property, "value": value})


def scene_get_tree(
    *,
    project_path: str,
    scene: str,
) -> ToolCallResponse:
    """Return the node tree of a scene as JSON."""
    full_path = os.path.join(project_path, scene.lstrip("res://"))
    content = _read_tscn(full_path)
    if content is None:
        return ToolCallResponse(success=False, error=f"Scene not found: {scene}")

    nodes = []
    for match in re.finditer(
        r'\[node name="([^"]+)" type="([^"]+)"(?:\s+parent="([^"]*)")?\]',
        content,
    ):
        nodes.append({
            "name": match.group(1),
            "type": match.group(2),
            "parent": match.group(3) or ".",
        })

    return ToolCallResponse(success=True, data={"nodes": nodes, "count": len(nodes)})


def scene_connect_signal(
    *,
    project_path: str,
    scene: str,
    source: str,
    signal: str,
    target: str,
    method: str,
) -> ToolCallResponse:
    """Append a signal connection record (metadata only, not runtime connect)."""
    full_path = os.path.join(project_path, scene.lstrip("res://"))
    content = _read_tscn(full_path)
    if content is None:
        return ToolCallResponse(success=False, error=f"Scene not found: {scene}")

    connection = (
        f'\n[connection signal="{signal}" from="{source}" '
        f'to="{target}" method="{method}"]\n'
    )
    content += connection
    _write_tscn(full_path, content)
    return ToolCallResponse(
        success=True,
        data={"signal": signal, "from": source, "to": target, "method": method},
    )


def scene_instantiate(
    *,
    project_path: str,
    scene: str,
    subscene: str,
    parent: str,
    name: str | None = None,
) -> ToolCallResponse:
    """Add a subscene instance as a child node."""
    full_path = os.path.join(project_path, scene.lstrip("res://"))
    content = _read_tscn(full_path)
    if content is None:
        return ToolCallResponse(success=False, error=f"Scene not found: {scene}")

    inst_name = name or subscene.split("/")[-1].replace(".tscn", "")
    ext_id = abs(hash(subscene)) % 9999

    # Add ext_resource if not already present
    if subscene not in content:
        content = content.replace(
            "\n[node",
            f'\n[ext_resource type="PackedScene" path="{subscene}" id="{ext_id}"]\n\n[node',
            1,
        )

    node_block = (
        f'\n[node name="{inst_name}" parent="{parent}" '
        f'instance=ExtResource("{ext_id}")]\n'
    )
    content += node_block
    _write_tscn(full_path, content)
    return ToolCallResponse(success=True, data={"instance": inst_name, "scene": subscene})
