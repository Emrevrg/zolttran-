"""Script tools — create, validate, attach GDScript/C# files."""
from __future__ import annotations
import os
import re
import subprocess
from typing import Literal
from ..models import ToolCallResponse


def _write_file(path: str, content: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def _read_file(path: str) -> str | None:
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        return f.read()


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

def script_create(
    *,
    project_path: str,
    path: str,
    language: Literal["gdscript", "csharp"] = "gdscript",
    class_name: str | None = None,
    extends: str = "Node",
    content: str = "",
) -> ToolCallResponse:
    """Create a new script file."""
    full_path = os.path.join(project_path, path.lstrip("res://"))

    if content:
        final_content = content
    elif language == "gdscript":
        lines = []
        if class_name:
            lines.append(f"class_name {class_name}")
        lines.append(f"extends {extends}")
        lines.append("")
        lines.append("")
        lines.append("func _ready() -> void:")
        lines.append("\tpass")
        final_content = "\n".join(lines) + "\n"
    else:
        cs_class = class_name or path.split("/")[-1].replace(".cs", "")
        final_content = (
            f"using Godot;\n\n"
            f"public partial class {cs_class} : {extends}\n"
            f"{{\n"
            f"\tpublic override void _Ready()\n"
            f"\t{{\n"
            f"\t}}\n"
            f"}}\n"
        )

    _write_file(full_path, final_content)
    return ToolCallResponse(success=True, data={"path": path, "language": language})


def script_attach(
    *,
    project_path: str,
    scene: str,
    node_path: str,
    script_path: str,
) -> ToolCallResponse:
    """Attach a script to a node in a scene."""
    scene_full = os.path.join(project_path, scene.lstrip("res://"))
    if not os.path.exists(scene_full):
        return ToolCallResponse(success=False, error=f"Scene not found: {scene}")

    with open(scene_full, encoding="utf-8") as f:
        content = f.read()

    node_name = node_path.split("/")[-1]
    ext_id = abs(hash(script_path)) % 9999

    # Add ext_resource for script if not present
    if script_path not in content:
        content = content.replace(
            "\n[node",
            f'\n[ext_resource type="Script" path="{script_path}" id="{ext_id}_script"]\n\n[node',
            1,
        )

    # Add script property to node
    node_pattern = re.compile(
        rf'(\[node name="{re.escape(node_name)}"[^\]]*\]\n)',
        re.MULTILINE,
    )
    if node_pattern.search(content):
        content = node_pattern.sub(
            lambda m: m.group(0) + f'script = ExtResource("{ext_id}_script")\n',
            content,
            count=1,
        )

    with open(scene_full, "w", encoding="utf-8") as f:
        f.write(content)

    return ToolCallResponse(success=True, data={"node": node_path, "script": script_path})


def script_validate(
    *,
    project_path: str,
    path: str,
    godot_executable: str = "godot4",
) -> ToolCallResponse:
    """Run syntax validation on a GDScript file using Godot headless."""
    full_path = os.path.join(project_path, path.lstrip("res://"))
    if not os.path.exists(full_path):
        return ToolCallResponse(success=False, error=f"Script not found: {path}")

    # Write a minimal validator script
    validator = os.path.join(project_path, ".omniforge_validate.gd")
    validator_code = (
        f'extends SceneTree\n'
        f'func _init():\n'
        f'\tvar s = load("{path}")\n'
        f'\tif s == null:\n'
        f'\t\tprint("VALIDATION_ERROR: Cannot load script")\n'
        f'\tquit()\n'
    )
    _write_file(validator, validator_code)

    try:
        result = subprocess.run(
            [godot_executable, "--headless", "--script", validator],
            cwd=project_path,
            capture_output=True,
            text=True,
            timeout=15,
        )
        errors = [
            line.strip()
            for line in (result.stderr + result.stdout).splitlines()
            if "ERROR" in line or "Parse Error" in line or "SCRIPT ERROR" in line
        ]
        return ToolCallResponse(
            success=len(errors) == 0,
            data=errors,
            error="; ".join(errors) if errors else None,
        )
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        return ToolCallResponse(success=False, error=str(e))
    finally:
        if os.path.exists(validator):
            os.remove(validator)


def script_get_errors(
    *,
    project_path: str,
) -> ToolCallResponse:
    """Read Godot editor error log."""
    log_candidates = [
        os.path.join(project_path, ".godot", "logs", "godot.log"),
        os.path.join(project_path, "logs", "godot.log"),
    ]
    errors: list[str] = []
    for log_path in log_candidates:
        if os.path.exists(log_path):
            with open(log_path, encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
            errors = [
                l.strip() for l in lines[-100:]
                if "ERROR" in l or "SCRIPT ERROR" in l or "Parse Error" in l
            ]
            break

    return ToolCallResponse(success=True, data=errors)


def script_update(
    *,
    project_path: str,
    path: str,
    content: str,
) -> ToolCallResponse:
    """Overwrite an existing script with new content."""
    full_path = os.path.join(project_path, path.lstrip("res://"))
    _write_file(full_path, content)
    return ToolCallResponse(success=True, data={"path": path, "bytes": len(content)})


def script_read(
    *,
    project_path: str,
    path: str,
) -> ToolCallResponse:
    """Read a script file."""
    full_path = os.path.join(project_path, path.lstrip("res://"))
    content = _read_file(full_path)
    if content is None:
        return ToolCallResponse(success=False, error=f"Script not found: {path}")
    return ToolCallResponse(success=True, data={"content": content, "lines": content.count("\n")})
