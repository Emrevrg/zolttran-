"""Shared Pydantic models for the OmniForge Godot Agent API."""
from __future__ import annotations
from typing import Any, Literal
from pydantic import BaseModel, Field


class ToolCallRequest(BaseModel):
    tool: str
    arguments: dict[str, Any] = Field(default_factory=dict)


class ToolCallResponse(BaseModel):
    success: bool
    data: Any = None
    error: str | None = None
    logs: list[str] = Field(default_factory=list)


class NodeDef(BaseModel):
    name: str
    type: str
    parent: str = "."
    properties: dict[str, Any] = Field(default_factory=dict)
    script_path: str | None = None


class ScriptCreateRequest(BaseModel):
    path: str
    language: Literal["gdscript", "csharp"] = "gdscript"
    class_name: str | None = None
    extends: str = "Node"
    content: str = ""


class ExportRequest(BaseModel):
    project_path: str
    preset: str
    output_path: str
    debug: bool = False


class TestResult(BaseModel):
    passed: int = 0
    failed: int = 0
    skipped: int = 0
    errors: list[str] = Field(default_factory=list)
    duration_ms: float = 0.0


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "0.1.0"
    godot_version: str | None = None
    tools_count: int = 0
    project_path: str | None = None
