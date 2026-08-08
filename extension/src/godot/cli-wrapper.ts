/**
 * Godot CLI Wrapper — headless execution via `godot --headless`.
 * Works without the Godot editor being open. Used as a fallback when
 * MCP/TCP bridges are unavailable.
 */
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

export interface CliRunOptions {
  script?: string;
  projectPath?: string;
  args?: string[];
  timeoutMs?: number;
  env?: Record<string, string>;
}

export class GodotCliWrapper {
  private godotPath: string;

  constructor(godotPath = 'godot4') {
    this.godotPath = godotPath;
  }

  setGodotPath(p: string): void {
    this.godotPath = p;
  }

  // -----------------------------------------------------------------------
  // Core exec
  // -----------------------------------------------------------------------

  async exec(args: string[], opts: CliRunOptions = {}): Promise<CliResult> {
    return new Promise((resolve) => {
      const finalArgs = ['--headless', ...args];
      const env = { ...process.env, ...opts.env } as Record<string, string>;

      const proc = cp.spawn(this.godotPath, finalArgs, {
        cwd: opts.projectPath,
        env,
        shell: false,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
      proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

      const timer = setTimeout(() => {
        proc.kill('SIGKILL');
        resolve({ stdout, stderr: stderr + '\nTimeout exceeded', exitCode: -1, success: false });
      }, opts.timeoutMs ?? 60_000);

      proc.on('close', (code) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, exitCode: code ?? 0, success: (code ?? 0) === 0 });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({ stdout, stderr: err.message, exitCode: -1, success: false });
      });
    });
  }

  // -----------------------------------------------------------------------
  // Specific commands
  // -----------------------------------------------------------------------

  /** Check Godot is available and return its version. */
  async getVersion(): Promise<string | null> {
    const result = await this.exec(['--version'], { timeoutMs: 5000 });
    if (!result.success) return null;
    return result.stdout.trim();
  }

  async isAvailable(): Promise<boolean> {
    const version = await this.getVersion();
    return version !== null;
  }

  /** Run a GDScript file headlessly. */
  async runScript(scriptPath: string, projectPath: string): Promise<CliResult> {
    return this.exec(['--script', scriptPath], { projectPath });
  }

  /** Export a project to a given platform. */
  async exportProject(opts: {
    projectPath: string;
    preset: string;
    outputPath: string;
    debug?: boolean;
  }): Promise<CliResult> {
    const flag = opts.debug ? '--export-debug' : '--export-release';
    return this.exec([flag, opts.preset, opts.outputPath], {
      projectPath: opts.projectPath,
    });
  }

  /** Run all GUT tests in a project. */
  async runTests(projectPath: string): Promise<{ passed: number; failed: number; errors: string[] }> {
    const gutScript = path.join(projectPath, 'addons/gut/gut_cmdln.gd');
    const result = await this.runScript(gutScript, projectPath);

    const passed = (result.stdout.match(/\d+ passed/g) ?? []).length;
    const failed = parseInt(result.stdout.match(/(\d+) failed/)?.[1] ?? '0', 10);
    const errors = result.stderr
      .split('\n')
      .filter((l) => l.includes('ERROR') || l.includes('SCRIPT ERROR'))
      .slice(0, 20);

    return { passed, failed, errors };
  }

  /** Check a GDScript file for syntax errors (import + quit). */
  async validateScript(scriptPath: string, projectPath: string): Promise<string[]> {
    const tempScript = path.join(projectPath, '.omniforge_validate.gd');
    const validateCode = `extends SceneTree\nfunc _init():\n\tvar s = load("${scriptPath}")\n\tif s == null:\n\t\tprint("ERROR: Cannot load")\n\tquit()`;

    fs.writeFileSync(tempScript, validateCode, 'utf8');
    const result = await this.runScript(tempScript, projectPath);
    try { fs.unlinkSync(tempScript); } catch { /* ignore */ }

    return result.stderr
      .split('\n')
      .filter((l) => l.includes('ERROR') || l.includes('Parse Error'))
      .map((l) => l.trim())
      .filter(Boolean);
  }

  /** Get Godot editor logs (last N lines). */
  getEditorLogs(projectPath: string, lines = 50): string[] {
    const logCandidates = [
      path.join(projectPath, '.godot/logs/godot.log'),
      path.join(projectPath, 'logs/godot.log'),
    ];
    for (const logPath of logCandidates) {
      if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, 'utf8');
        return content.split('\n').slice(-lines);
      }
    }
    return [];
  }

  /** Import all assets (runs godot --import). */
  async importAssets(projectPath: string): Promise<CliResult> {
    return this.exec(['--import'], { projectPath, timeoutMs: 120_000 });
  }
}

export const godotCli = new GodotCliWrapper();
