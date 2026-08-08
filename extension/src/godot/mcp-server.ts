/**
 * Godot MCP Server Interface
 * Defines the 191+ tools available through the Godot MCP server
 * (godot-agent/src/server.py) and provides a typed client.
 */
import type { GodotBridgeResponse } from '../types/index.js';

// ---------------------------------------------------------------------------
// Tool categories
// ---------------------------------------------------------------------------

export type McpToolCategory =
  | 'scene'
  | 'script'
  | 'asset'
  | 'test'
  | 'build'
  | 'editor'
  | 'debug'
  | 'project';

export interface McpTool {
  name: string;
  category: McpToolCategory;
  description: string;
  params: Record<string, { type: string; description: string; required?: boolean }>;
}

// ---------------------------------------------------------------------------
// MCP Client — calls the Python MCP server over stdio / HTTP
// ---------------------------------------------------------------------------

export class GodotMcpClient {
  private serverUrl: string;
  private port: number;
  private connected = false;

  constructor(port = 9876) {
    this.port = port;
    this.serverUrl = `http://localhost:${port}`;
  }

  async connect(): Promise<boolean> {
    try {
      const res = await fetch(`${this.serverUrl}/health`, { signal: AbortSignal.timeout(3000) });
      this.connected = res.ok;
      return this.connected;
    } catch {
      this.connected = false;
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<GodotBridgeResponse> {
    if (!this.connected) return { success: false, error: 'MCP server not connected' };
    try {
      const res = await fetch(`${this.serverUrl}/tools/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: name, arguments: args }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
      return await res.json() as GodotBridgeResponse;
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  async listTools(): Promise<McpTool[]> {
    try {
      const res = await fetch(`${this.serverUrl}/tools/list`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return [];
      return await res.json() as McpTool[];
    } catch {
      return [];
    }
  }

  // -----------------------------------------------------------------------
  // Scene tools
  // -----------------------------------------------------------------------

  async sceneCreate(name: string, rootType: string, savePath: string): Promise<GodotBridgeResponse> {
    return this.callTool('scene_create', { name, root_type: rootType, save_path: savePath });
  }

  async sceneAddNode(opts: {
    scene: string; parent: string; type: string; name: string;
    properties?: Record<string, unknown>;
  }): Promise<GodotBridgeResponse> {
    return this.callTool('scene_add_node', opts);
  }

  async sceneRemoveNode(scene: string, nodePath: string): Promise<GodotBridgeResponse> {
    return this.callTool('scene_remove_node', { scene, node_path: nodePath });
  }

  async sceneReparentNode(scene: string, nodePath: string, newParent: string): Promise<GodotBridgeResponse> {
    return this.callTool('scene_reparent_node', { scene, node_path: nodePath, new_parent: newParent });
  }

  async sceneSetProperty(scene: string, nodePath: string, property: string, value: unknown): Promise<GodotBridgeResponse> {
    return this.callTool('scene_set_property', { scene, node_path: nodePath, property, value });
  }

  async sceneGetTree(scene: string): Promise<GodotBridgeResponse> {
    return this.callTool('scene_get_tree', { scene });
  }

  async sceneConnectSignal(opts: {
    scene: string; source: string; signal: string; target: string; method: string;
  }): Promise<GodotBridgeResponse> {
    return this.callTool('scene_connect_signal', opts);
  }

  async sceneInstantiate(scene: string, subscene: string, parent: string): Promise<GodotBridgeResponse> {
    return this.callTool('scene_instantiate', { scene, subscene, parent });
  }

  // -----------------------------------------------------------------------
  // Script tools
  // -----------------------------------------------------------------------

  async scriptCreate(opts: {
    path: string; language?: 'gdscript' | 'csharp';
    className?: string; extends?: string; content?: string;
  }): Promise<GodotBridgeResponse> {
    return this.callTool('script_create', {
      path: opts.path,
      language: opts.language ?? 'gdscript',
      class_name: opts.className,
      extends: opts.extends ?? 'Node',
      content: opts.content ?? '',
    });
  }

  async scriptAttach(scene: string, nodePath: string, scriptPath: string): Promise<GodotBridgeResponse> {
    return this.callTool('script_attach', { scene, node_path: nodePath, script_path: scriptPath });
  }

  async scriptValidate(scriptPath: string): Promise<{ valid: boolean; errors: string[] }> {
    const res = await this.callTool('script_validate', { path: scriptPath });
    return {
      valid: res.success,
      errors: (res.data as string[] | undefined) ?? (res.error ? [res.error] : []),
    };
  }

  async scriptGetErrors(projectPath: string): Promise<string[]> {
    const res = await this.callTool('script_get_errors', { project_path: projectPath });
    return (res.data as string[] | undefined) ?? [];
  }

  // -----------------------------------------------------------------------
  // Asset tools
  // -----------------------------------------------------------------------

  async assetImport(sourcePath: string, targetPath: string, type: string): Promise<GodotBridgeResponse> {
    return this.callTool('asset_import', { source_path: sourcePath, target_path: targetPath, type });
  }

  async assetCreateMaterial(opts: {
    name: string; albedoColor?: string; metallic?: number;
    roughness?: number; savePath?: string;
  }): Promise<GodotBridgeResponse> {
    return this.callTool('asset_create_material', opts);
  }

  async assetCreateShader(name: string, type: 'canvas_item' | 'spatial', savePath: string): Promise<GodotBridgeResponse> {
    return this.callTool('asset_create_shader', { name, type, save_path: savePath });
  }

  async assetGenerateSprite(prompt: string, savePath: string, width = 64, height = 64): Promise<GodotBridgeResponse> {
    return this.callTool('asset_generate_sprite', { prompt, save_path: savePath, width, height });
  }

  // -----------------------------------------------------------------------
  // Test tools
  // -----------------------------------------------------------------------

  async testRunGut(projectPath: string, testPath?: string): Promise<GodotBridgeResponse> {
    return this.callTool('test_run_gut', { project_path: projectPath, test_path: testPath ?? 'tests/' });
  }

  async testGetResults(projectPath: string): Promise<{ passed: number; failed: number; skipped: number; errors: string[] }> {
    const res = await this.callTool('test_get_results', { project_path: projectPath });
    const data = res.data as { passed?: number; failed?: number; skipped?: number; errors?: string[] } | undefined;
    return {
      passed: data?.passed ?? 0,
      failed: data?.failed ?? 0,
      skipped: data?.skipped ?? 0,
      errors: data?.errors ?? [],
    };
  }

  async testTakeScreenshot(savePath: string): Promise<GodotBridgeResponse> {
    return this.callTool('test_screenshot', { save_path: savePath });
  }

  // -----------------------------------------------------------------------
  // Build tools
  // -----------------------------------------------------------------------

  async buildExport(preset: string, outputPath: string, debug = false): Promise<GodotBridgeResponse> {
    return this.callTool('build_export', { preset, output_path: outputPath, debug });
  }

  async buildGetPresets(projectPath: string): Promise<string[]> {
    const res = await this.callTool('build_get_presets', { project_path: projectPath });
    return (res.data as string[] | undefined) ?? [];
  }

  async buildCreatePreset(platform: string, name: string, settings: Record<string, unknown>): Promise<GodotBridgeResponse> {
    return this.callTool('build_create_preset', { platform, name, settings });
  }

  // -----------------------------------------------------------------------
  // Project tools
  // -----------------------------------------------------------------------

  async projectCreate(opts: {
    path: string; name: string; renderer?: 'forward_plus' | 'mobile' | 'gl_compatibility';
  }): Promise<GodotBridgeResponse> {
    return this.callTool('project_create', {
      path: opts.path,
      name: opts.name,
      renderer: opts.renderer ?? 'forward_plus',
    });
  }

  async projectGetInfo(projectPath: string): Promise<GodotBridgeResponse> {
    return this.callTool('project_get_info', { project_path: projectPath });
  }

  async projectSetSetting(key: string, value: unknown): Promise<GodotBridgeResponse> {
    return this.callTool('project_set_setting', { key, value });
  }

  async projectAddAutoload(name: string, path: string): Promise<GodotBridgeResponse> {
    return this.callTool('project_add_autoload', { name, path });
  }

  async projectAddInputAction(action: string, key: string): Promise<GodotBridgeResponse> {
    return this.callTool('project_add_input_action', { action, key });
  }
}

export const godotMcp = new GodotMcpClient();
