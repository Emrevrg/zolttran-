/**
 * GodotTestRunner
 * Runs GUT tests and reads editor error logs, returning structured results.
 */
import type { GodotError } from '../types/index.js';
import { godotCli } from './cli-wrapper.js';
import { godotMcp } from './mcp-server.js';

export interface TestRunResult {
  passed: number;
  failed: number;
  skipped: number;
  errors: GodotError[];
  output: string;
  durationMs: number;
}

export interface ValidationResult {
  file: string;
  valid: boolean;
  errors: GodotError[];
}

export class GodotTestRunner {
  private projectPath: string;

  constructor(projectPath = '') {
    this.projectPath = projectPath;
  }

  setProjectPath(p: string): void { this.projectPath = p; }

  // -----------------------------------------------------------------------
  // Run GUT tests
  // -----------------------------------------------------------------------

  async runTests(testPath = 'tests/'): Promise<TestRunResult> {
    const start = Date.now();

    // Prefer MCP if connected
    if (godotMcp.isConnected()) {
      const results = await godotMcp.testRunGut(this.projectPath, testPath);
      const detail = await godotMcp.testGetResults(this.projectPath);
      return {
        passed: detail.passed,
        failed: detail.failed,
        skipped: detail.skipped,
        errors: detail.errors.map((msg) => this.parseErrorLine(msg)),
        output: results.data as string ?? '',
        durationMs: Date.now() - start,
      };
    }

    // CLI fallback
    const result = await godotCli.runTests(this.projectPath);
    return {
      passed: result.passed,
      failed: result.failed,
      skipped: 0,
      errors: result.errors.map((msg) => this.parseErrorLine(msg)),
      output: '',
      durationMs: Date.now() - start,
    };
  }

  // -----------------------------------------------------------------------
  // Validate scripts
  // -----------------------------------------------------------------------

  async validateScript(scriptPath: string): Promise<ValidationResult> {
    if (godotMcp.isConnected()) {
      const result = await godotMcp.scriptValidate(scriptPath);
      return {
        file: scriptPath,
        valid: result.valid,
        errors: result.errors.map((msg) => this.parseErrorLine(msg)),
      };
    }

    const errors = await godotCli.validateScript(scriptPath, this.projectPath);
    return {
      file: scriptPath,
      valid: errors.length === 0,
      errors: errors.map((msg) => this.parseErrorLine(msg)),
    };
  }

  async validateAll(scriptPaths: string[]): Promise<ValidationResult[]> {
    const results = await Promise.all(scriptPaths.map((p) => this.validateScript(p)));
    return results;
  }

  // -----------------------------------------------------------------------
  // Editor error log
  // -----------------------------------------------------------------------

  getEditorErrors(): GodotError[] {
    const logs = godotCli.getEditorLogs(this.projectPath, 100);
    return logs
      .filter((l) => l.includes('ERROR') || l.includes('Parse Error') || l.includes('SCRIPT ERROR'))
      .map((l) => this.parseErrorLine(l));
  }

  async getLiveErrors(): Promise<GodotError[]> {
    if (godotMcp.isConnected()) {
      const errors = await godotMcp.scriptGetErrors(this.projectPath);
      return errors.map((e) => this.parseErrorLine(e));
    }
    return this.getEditorErrors();
  }

  // -----------------------------------------------------------------------
  // Parse error strings into structured GodotError
  // -----------------------------------------------------------------------

  private parseErrorLine(msg: string): GodotError {
    // Godot error format: "ERROR: /path/to/file.gd:42 - message"
    // or:                 "SCRIPT ERROR: method not found"
    const lineMatch = /:(\d+):?\s*(.+)/.exec(msg);
    const line = lineMatch ? parseInt(lineMatch[1]!, 10) : 0;
    const message = lineMatch ? lineMatch[2]!.trim() : msg.trim();

    const severity: GodotError['severity'] =
      msg.includes('ERROR') ? 'error' :
      msg.includes('WARNING') ? 'warning' :
      'info';

    return { line, column: 0, message, severity };
  }
}

export const testRunner = new GodotTestRunner();
