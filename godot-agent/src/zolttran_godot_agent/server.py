"""
Zolttran Godot Agent Server
FastAPI HTTP server exposing 35+ Godot 4 tools.
Start with: uv run zolttran-agent --project /path/to/project
"""
from __future__ import annotations
import argparse
import logging
import subprocess
from typing import Any

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .models import ToolCallRequest, ToolCallResponse, HealthResponse
from .tools import scene_tools, script_tools, asset_tools, test_tools, build_tools, project_tools

log = logging.getLogger("zolttran-agent")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(
    title="Zolttran Godot Agent",
    description="HTTP server with 35+ Godot 4 tools for the Zolttran VS Code extension",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ---------------------------------------------------------------------------
# Shared state
# ---------------------------------------------------------------------------
_state: dict[str, Any] = {
    "project_path": "",
    "godot_executable": "godot4",
    "godot_version": None,
}

# ---------------------------------------------------------------------------
# Tool registry
# ---------------------------------------------------------------------------
TOOL_REGISTRY: dict[str, dict[str, Any]] = {
    # Scene
    "scene_create":         {"fn": scene_tools.scene_create,         "category": "scene"},
    "scene_add_node":       {"fn": scene_tools.scene_add_node,       "category": "scene"},
    "scene_remove_node":    {"fn": scene_tools.scene_remove_node,    "category": "scene"},
    "scene_set_property":   {"fn": scene_tools.scene_set_property,   "category": "scene"},
    "scene_get_tree":       {"fn": scene_tools.scene_get_tree,       "category": "scene"},
    "scene_connect_signal": {"fn": scene_tools.scene_connect_signal, "category": "scene"},
    "scene_instantiate":    {"fn": scene_tools.scene_instantiate,    "category": "scene"},
    # Script
    "script_create":        {"fn": script_tools.script_create,       "category": "script"},
    "script_attach":        {"fn": script_tools.script_attach,       "category": "script"},
    "script_validate":      {"fn": script_tools.script_validate,     "category": "script"},
    "script_get_errors":    {"fn": script_tools.script_get_errors,   "category": "script"},
    "script_update":        {"fn": script_tools.script_update,       "category": "script"},
    "script_read":          {"fn": script_tools.script_read,         "category": "script"},
    # Asset
    "asset_import":                      {"fn": asset_tools.asset_import,                     "category": "asset"},
    "asset_create_material":             {"fn": asset_tools.asset_create_material,            "category": "asset"},
    "asset_create_shader":               {"fn": asset_tools.asset_create_shader,              "category": "asset"},
    "asset_create_theme":                {"fn": asset_tools.asset_create_theme,               "category": "asset"},
    "asset_generate_placeholder_sprite": {"fn": asset_tools.asset_generate_placeholder_sprite,"category": "asset"},
    "asset_generate_sprite":             {"fn": asset_tools.asset_generate_sprite,            "category": "asset"},
    "asset_list":                        {"fn": asset_tools.asset_list,                       "category": "asset"},
    # Test
    "test_run_gut":     {"fn": test_tools.test_run_gut,     "category": "test"},
    "test_get_results": {"fn": test_tools.test_get_results, "category": "test"},
    "test_screenshot":  {"fn": test_tools.test_screenshot,  "category": "test"},
    "test_profile":     {"fn": test_tools.test_profile,     "category": "test"},
    # Build
    "build_export":           {"fn": build_tools.build_export,           "category": "build"},
    "build_get_presets":      {"fn": build_tools.build_get_presets,      "category": "build"},
    "build_create_preset":    {"fn": build_tools.build_create_preset,    "category": "build"},
    "build_validate_project": {"fn": build_tools.build_validate_project, "category": "build"},
    # Project
    "project_create":           {"fn": project_tools.project_create,          "category": "project"},
    "project_get_info":         {"fn": project_tools.project_get_info,        "category": "project"},
    "project_set_setting":      {"fn": project_tools.project_set_setting,     "category": "project"},
    "project_add_autoload":     {"fn": project_tools.project_add_autoload,    "category": "project"},
    "project_add_input_action": {"fn": project_tools.project_add_input_action,"category": "project"},
}

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        version="1.0.0",
        godot_version=_state["godot_version"],
        tools_count=len(TOOL_REGISTRY),
        project_path=_state["project_path"] or None,
    )


@app.get("/tools/list")
async def list_tools() -> list[dict[str, Any]]:
    return [
        {"name": name, "category": meta["category"], "description": (meta["fn"].__doc__ or "").strip().split("\n")[0]}
        for name, meta in TOOL_REGISTRY.items()
    ]


@app.post("/tools/call", response_model=ToolCallResponse)
async def call_tool(request: ToolCallRequest) -> ToolCallResponse:
    entry = TOOL_REGISTRY.get(request.tool)
    if entry is None:
        raise HTTPException(status_code=404, detail=f"Tool not found: {request.tool}")

    import inspect
    fn = entry["fn"]
    args: dict[str, Any] = {**request.arguments}
    sig = inspect.signature(fn)
    if "project_path" in sig.parameters and "project_path" not in args:
        args["project_path"] = _state["project_path"]
    if "godot_executable" in sig.parameters and "godot_executable" not in args:
        args["godot_executable"] = _state["godot_executable"]

    try:
        result: ToolCallResponse = fn(**args)
        log.info("✓ %s → success=%s", request.tool, result.success)
        return result
    except TypeError as e:
        log.error("✗ %s argument error: %s", request.tool, e)
        return ToolCallResponse(success=False, error=f"Argument error: {e}")
    except Exception as e:  # noqa: BLE001
        log.error("✗ %s error: %s", request.tool, e)
        return ToolCallResponse(success=False, error=str(e))


@app.post("/config/project")
async def set_project(body: dict[str, str]) -> dict[str, str]:
    """Set the active Godot project path."""
    _state["project_path"] = body.get("path", "")
    log.info("Active project: %s", _state["project_path"])
    return {"path": _state["project_path"]}


@app.post("/config/godot")
async def set_godot(body: dict[str, str]) -> dict[str, Any]:
    """Set the Godot executable and detect version."""
    exe = body.get("executable", "godot4")
    _state["godot_executable"] = exe
    try:
        result = subprocess.run([exe, "--headless", "--version"], capture_output=True, text=True, timeout=5)
        _state["godot_version"] = result.stdout.strip() or None
    except (subprocess.TimeoutExpired, FileNotFoundError):
        _state["godot_version"] = None
    return {"executable": exe, "version": _state["godot_version"]}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(description="Zolttran Godot Agent")
    parser.add_argument("--host", default="127.0.0.1", help="Listen host")
    parser.add_argument("--port", type=int, default=9876, help="Listen port")
    parser.add_argument("--project", default="", help="Godot project path")
    parser.add_argument("--godot", default="godot4", help="Godot executable path")
    parser.add_argument("--log-level", default="info")
    args = parser.parse_args()

    _state["project_path"] = args.project
    _state["godot_executable"] = args.godot

    log.info("=" * 50)
    log.info("  Zolttran Godot Agent v1.0.0")
    log.info("  http://%s:%d | Tools: %d", args.host, args.port, len(TOOL_REGISTRY))
    log.info("  Project: %s", args.project or "(none)")
    log.info("  Godot: %s", args.godot)
    log.info("=" * 50)

    uvicorn.run(
        "zolttran_godot_agent.server:app",
        host=args.host,
        port=args.port,
        log_level=args.log_level,
        reload=False,
    )


if __name__ == "__main__":
    main()
