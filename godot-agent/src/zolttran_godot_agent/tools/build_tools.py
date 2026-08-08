"""Build tools — export presets and platform builds."""
from __future__ import annotations
import os
import re
import subprocess
import time
from ..models import ToolCallResponse


def _run_export(
    project_path: str,
    preset: str,
    output_path: str,
    debug: bool,
    godot_executable: str,
    timeout: int = 300,
) -> tuple[str, str, int]:
    flag = "--export-debug" if debug else "--export-release"
    try:
        result = subprocess.run(
            [godot_executable, "--headless", flag, preset, output_path],
            cwd=project_path,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return result.stdout, result.stderr, result.returncode
    except subprocess.TimeoutExpired:
        return "", "Build timeout", -1
    except FileNotFoundError:
        return "", f"Godot not found: {godot_executable}", -1


def build_export(
    *,
    project_path: str,
    preset: str,
    output_path: str,
    debug: bool = False,
    godot_executable: str = "godot4",
) -> ToolCallResponse:
    """Export the project using a named export preset."""
    os.makedirs(os.path.dirname(os.path.join(project_path, output_path)), exist_ok=True)
    start = time.time()
    stdout, stderr, code = _run_export(
        project_path, preset, output_path, debug, godot_executable
    )
    duration_ms = (time.time() - start) * 1000

    output_full = os.path.join(project_path, output_path)
    file_size = os.path.getsize(output_full) if os.path.exists(output_full) else 0

    return ToolCallResponse(
        success=code == 0,
        data={
            "preset": preset,
            "output_path": output_path,
            "file_size": file_size,
            "duration_ms": round(duration_ms, 1),
        },
        error=stderr[:500] if code != 0 else None,
        logs=(stdout + stderr).splitlines()[-20:],
    )


def build_get_presets(
    *,
    project_path: str,
) -> ToolCallResponse:
    """Read export preset names from export_presets.cfg."""
    cfg_path = os.path.join(project_path, "export_presets.cfg")
    if not os.path.exists(cfg_path):
        return ToolCallResponse(success=True, data=[])

    with open(cfg_path, encoding="utf-8") as f:
        content = f.read()

    names = re.findall(r'^name="([^"]+)"', content, re.MULTILINE)
    return ToolCallResponse(success=True, data=names)


def build_create_preset(
    *,
    project_path: str,
    platform: str,
    name: str,
    settings: dict | None = None,
    output_path: str | None = None,
) -> ToolCallResponse:
    """Append an export preset entry to export_presets.cfg."""
    cfg_path = os.path.join(project_path, "export_presets.cfg")
    existing = ""
    if os.path.exists(cfg_path):
        with open(cfg_path, encoding="utf-8") as f:
            existing = f.read()

    # Count existing presets to determine index
    existing_count = len(re.findall(r'^\[preset\.\d+\]', existing, re.MULTILINE))

    default_output = output_path or f"build/{platform.lower().replace(' ', '_')}/game"
    preset_block = (
        f"\n[preset.{existing_count}]\n\n"
        f'name="{name}"\n'
        f'platform="{platform}"\n'
        f"runnable=true\n"
        f"dedicated_server=false\n"
        f'custom_features=""\n'
        f'export_filter="all_resources"\n'
        f'include_filter=""\n'
        f'exclude_filter=""\n'
        f'export_path="{default_output}"\n'
        f"encrypt_pck=false\n"
        f"encrypt_directory=false\n"
        f"script_export_mode=1\n"
    )

    if settings:
        preset_block += f"\n[preset.{existing_count}.options]\n\n"
        for k, v in settings.items():
            preset_block += f"{k}={v!r}\n"

    with open(cfg_path, "w", encoding="utf-8") as f:
        f.write(existing + preset_block)

    return ToolCallResponse(
        success=True,
        data={"preset_index": existing_count, "name": name, "platform": platform},
    )


def build_validate_project(
    *,
    project_path: str,
) -> ToolCallResponse:
    """Check that project.godot exists and is valid."""
    project_file = os.path.join(project_path, "project.godot")
    if not os.path.exists(project_file):
        return ToolCallResponse(
            success=False, error="project.godot not found — not a valid Godot project"
        )

    with open(project_file, encoding="utf-8") as f:
        content = f.read()

    name_match = re.search(r'config/name="([^"]+)"', content)
    version_match = re.search(r'config/version="([^"]+)"', content)

    return ToolCallResponse(
        success=True,
        data={
            "name": name_match.group(1) if name_match else "Unknown",
            "version": version_match.group(1) if version_match else "0.1.0",
            "path": project_path,
        },
    )
