"""Test tools — GUT runner, screenshot, performance profiling."""
from __future__ import annotations
import os
import re
import subprocess
import time
from ..models import ToolCallResponse, TestResult


def _run_godot(
    project_path: str,
    args: list[str],
    godot_executable: str = "godot4",
    timeout: int = 60,
) -> tuple[str, str, int]:
    """Run Godot headlessly and return (stdout, stderr, returncode)."""
    try:
        result = subprocess.run(
            [godot_executable, "--headless", *args],
            cwd=project_path,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return result.stdout, result.stderr, result.returncode
    except subprocess.TimeoutExpired:
        return "", "Timeout exceeded", -1
    except FileNotFoundError:
        return "", f"Godot executable not found: {godot_executable}", -1


def test_run_gut(
    *,
    project_path: str,
    test_path: str = "tests/",
    godot_executable: str = "godot4",
) -> ToolCallResponse:
    """Run GUT (Godot Unit Testing) tests headlessly."""
    gut_script = os.path.join(project_path, "addons", "gut", "gut_cmdln.gd")

    if not os.path.exists(gut_script):
        # GUT not installed — return a guidance message
        return ToolCallResponse(
            success=False,
            error="GUT not installed. Add it via AssetLib or https://github.com/bitwes/Gut",
        )

    start = time.time()
    stdout, stderr, code = _run_godot(
        project_path,
        [
            "--script", "addons/gut/gut_cmdln.gd",
            f"-gdir={test_path}",
            "-gexit",
            "-glog=1",
        ],
        godot_executable=godot_executable,
        timeout=120,
    )
    duration_ms = (time.time() - start) * 1000
    combined = stdout + stderr

    # Parse GUT output
    passed = len(re.findall(r"PASS", combined))
    failed_matches = re.findall(r"(\d+) failing", combined)
    failed = int(failed_matches[0]) if failed_matches else 0

    errors = [
        line.strip()
        for line in combined.splitlines()
        if "FAILED" in line or "ERROR" in line or "Script Error" in line
    ]

    return ToolCallResponse(
        success=code == 0 and failed == 0,
        data=TestResult(
            passed=passed,
            failed=failed,
            errors=errors[:20],
            duration_ms=round(duration_ms, 1),
        ).model_dump(),
        error=f"{failed} test(s) failed" if failed else None,
        logs=combined.splitlines()[-30:],
    )


def test_get_results(
    *,
    project_path: str,
) -> ToolCallResponse:
    """Read cached GUT results from the last run."""
    results_path = os.path.join(project_path, ".gut_results.json")
    if not os.path.exists(results_path):
        return ToolCallResponse(
            success=True,
            data=TestResult().model_dump(),
        )
    import json
    with open(results_path, encoding="utf-8") as f:
        data = json.load(f)
    return ToolCallResponse(success=True, data=data)


def test_screenshot(
    *,
    project_path: str,
    save_path: str = "screenshots/test_screenshot.png",
    godot_executable: str = "godot4",
) -> ToolCallResponse:
    """Take a screenshot of the running game (requires Godot to be running)."""
    full_path = os.path.join(project_path, save_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)

    # Write a helper script that takes a screenshot and quits
    script_content = (
        "extends SceneTree\n"
        "func _init():\n"
        "\tawait process_frame\n"
        "\tvar img = get_viewport().get_texture().get_image()\n"
        f'\timg.save_png("{save_path}")\n'
        "\tquit()\n"
    )
    script_path = os.path.join(project_path, ".omniforge_screenshot.gd")
    with open(script_path, "w", encoding="utf-8") as f:
        f.write(script_content)

    _, stderr, code = _run_godot(
        project_path, ["--script", ".omniforge_screenshot.gd"],
        godot_executable=godot_executable, timeout=10,
    )
    try:
        os.remove(script_path)
    except OSError:
        pass

    if os.path.exists(full_path):
        return ToolCallResponse(
            success=True,
            data={"path": save_path, "size": os.path.getsize(full_path)},
        )
    return ToolCallResponse(success=False, error=stderr[:200] if stderr else "Screenshot failed")


def test_profile(
    *,
    project_path: str,
    duration_seconds: int = 5,
    godot_executable: str = "godot4",
) -> ToolCallResponse:
    """Run the game briefly and collect basic performance metrics."""
    script_content = (
        "extends SceneTree\n"
        "var _frames: int = 0\n"
        "var _start: float = 0.0\n"
        "func _init():\n"
        "\t_start = Time.get_ticks_msec() / 1000.0\n"
        "func _process(_delta):\n"
        "\t_frames += 1\n"
        f"\tif Time.get_ticks_msec() / 1000.0 - _start >= {duration_seconds}:\n"
        "\t\tvar fps = _frames / {duration_seconds}\n"
        "\t\tprint(\"PROFILE_FPS:\", fps)\n"
        "\t\tquit()\n"
    )
    script_path = os.path.join(project_path, ".omniforge_profile.gd")
    with open(script_path, "w", encoding="utf-8") as f:
        f.write(script_content)

    stdout, _, _ = _run_godot(
        project_path, ["--script", ".omniforge_profile.gd"],
        godot_executable=godot_executable,
        timeout=duration_seconds + 10,
    )
    try:
        os.remove(script_path)
    except OSError:
        pass

    fps_match = re.search(r"PROFILE_FPS:(\d+\.?\d*)", stdout)
    fps = float(fps_match.group(1)) if fps_match else None

    return ToolCallResponse(
        success=True,
        data={"fps": fps, "duration_seconds": duration_seconds, "raw": stdout[:500]},
    )
