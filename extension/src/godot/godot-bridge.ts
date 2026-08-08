/**
 * OmniForge Godot Bridge
 * Unified facade over MCP, TCP, and CLI connection methods.
 * Automatically selects the best available method and falls back gracefully.
 */
import type {
  GodotBridgeConfig,
  GodotBridgeMethod,
  GodotBridgeCommand,
  GodotBridgeResponse,
  GodotProject,
  GodotScene,
  GodotScript,
} from '../types/index.js';
import { godotMcp } from './mcp-server.js';
import { godotTcpBridge } from './tcp-bridge.js';
import { godotCli } from './cli-wrapper.js';
import * as fs from 'fs';
import * as path from 'path';

export class GodotBridge {
  private config: GodotBridgeConfig = {
    method: 'cli',
    godotPath: 'godot4',
    projectPath: '',
    port: 9876,
    connected: false,
  };

  // -----------------------------------------------------------------------
  // Connection
  // -----------------------------------------------------------------------

  async connect(projectPath: string, port = 9876): Promise<GodotBridgeMethod | null> {
    this.config.projectPath = projectPath;
    this.config.port = port;

    // 1. Try MCP first
    godotMcp['port'] = port;
    if (await godotMcp.connect()) {
      this.config.method = 'mcp';
      this.config.connected = true;
      console.log('[GodotBridge] Connected via MCP');
      return 'mcp';
    }

    // 2. Try TCP bridge
    try {
      godotTcpBridge['opts'].port = port;
      await godotTcpBridge.connect();
      if (godotTcpBridge.isConnected()) {
        this.config.method = 'tcp';
        this.config.connected = true;
        console.log('[GodotBridge] Connected via TCP');
        return 'tcp';
      }
    } catch { /* fall through */ }

    // 3. CLI fallback — check if Godot binary exists
    godotCli.setGodotPath(this.config.godotPath);
    if (await godotCli.isAvailable()) {
      this.config.method = 'cli';
      this.config.connected = true;
      console.log('[GodotBridge] Connected via CLI');
      return 'cli';
    }

    this.config.connected = false;
    return null;
  }

  disconnect(): void {
    godotTcpBridge.disconnect();
    this.config.connected = false;
  }

  getConfig(): Readonly<GodotBridgeConfig> {
    return this.config;
  }

  isConnected(): boolean {
    return this.config.connected;
  }

  setGodotPath(p: string): void {
    this.config.godotPath = p;
    godotCli.setGodotPath(p);
  }

  // -----------------------------------------------------------------------
  // Generic command dispatch
  // -----------------------------------------------------------------------

  async send(command: GodotBridgeCommand): Promise<GodotBridgeResponse> {
    switch (this.config.method) {
      case 'mcp': return godotMcp.callTool(command.command, command.args);
      case 'tcp': return godotTcpBridge.send(command);
      case 'cli': return this.cliDispatch(command);
    }
  }

  private async cliDispatch(command: GodotBridgeCommand): Promise<GodotBridgeResponse> {
    // CLI only supports a subset of commands
    const result = await godotCli.exec(
      ['--headless', '--script', this.wrapCommandAsScript(command)],
      { projectPath: this.config.projectPath },
    );
    return {
      success: result.success,
      data: result.stdout,
      error: result.success ? undefined : result.stderr,
    };
  }

  private wrapCommandAsScript(command: GodotBridgeCommand): string {
    // Write a temp script to disk and return its path
    const tmpPath = path.join(this.config.projectPath, '.omniforge_cmd.gd');
    const script = `extends SceneTree\nfunc _init():\n\tprint("CMD:${command.command}:${JSON.stringify(command.args)}")\n\tquit()`;
    fs.writeFileSync(tmpPath, script, 'utf8');
    return tmpPath;
  }

  // -----------------------------------------------------------------------
  // Project introspection
  // -----------------------------------------------------------------------

  async readProject(projectPath: string): Promise<GodotProject | null> {
    const projectFile = path.join(projectPath, 'project.godot');
    if (!fs.existsSync(projectFile)) return null;

    const content = fs.readFileSync(projectFile, 'utf8');
    const name = /config\/name="([^"]+)"/.exec(content)?.[1] ?? path.basename(projectPath);
    const version = /config\/version="([^"]+)"/.exec(content)?.[1] ?? '0.1.0';

    const scenes = this.scanFiles(projectPath, '.tscn').map((p) => ({
      name: path.basename(p, '.tscn'),
      path: p,
      resourcePath: p.replace(projectPath, 'res://').replace(/\\/g, '/'),
      rootNode: { name: 'Root', type: 'Node', path: '.', children: [], properties: {}, scripts: [] },
    } as GodotScene));

    const scripts = this.scanFiles(projectPath, '.gd').map((p) => ({
      path: p,
      language: 'gdscript' as const,
      content: fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '',
      errors: [],
    } as GodotScript));

    return {
      name,
      path: projectPath,
      godotVersion: this.extractGodotVersion(content),
      scenes,
      scripts,
      assets: [],
      exportPresets: [],
    };
  }

  // -----------------------------------------------------------------------
  // File operations
  // -----------------------------------------------------------------------

  writeFile(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  }

  readFile(filePath: string): string | null {
    try { return fs.readFileSync(filePath, 'utf8'); } catch { return null; }
  }

  fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private scanFiles(dir: string, ext: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'addons') {
        results.push(...this.scanFiles(full, ext));
      } else if (entry.isFile() && entry.name.endsWith(ext)) {
        results.push(full);
      }
    }
    return results;
  }

  private extractGodotVersion(projectGodotContent: string): string {
    return /config_version=(\d+)/.exec(projectGodotContent)?.[1] === '5' ? '4.x' : '4.x';
  }
}

export const godotBridge = new GodotBridge();
