/**
 * Hot Reload watcher — watches GDScript and scene files for changes
 * and triggers preview reload automatically.
 */
import * as fs from 'fs';
import * as path from 'path';
import { liveServer } from './live-server.js';
import { godotCli } from '../godot/cli-wrapper.js';

export class HotReloadWatcher {
  private watchers: fs.FSWatcher[] = [];
  private projectPath = '';
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private enabled = false;
  private pendingRebuild = false;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  start(projectPath: string): void {
    this.projectPath = projectPath;
    this.enabled = true;
    this.watchDir(path.join(projectPath, 'scripts'));
    this.watchDir(path.join(projectPath, 'scenes'));
    this.watchDir(path.join(projectPath, 'assets'));
    console.log('[HotReload] Watching:', projectPath);
  }

  stop(): void {
    this.enabled = false;
    for (const w of this.watchers) w.close();
    this.watchers = [];
    if (this.debounceTimer) { clearTimeout(this.debounceTimer); this.debounceTimer = null; }
  }

  isEnabled(): boolean { return this.enabled; }

  // -----------------------------------------------------------------------
  // Watch
  // -----------------------------------------------------------------------

  private watchDir(dir: string): void {
    if (!fs.existsSync(dir)) return;
    try {
      const watcher = fs.watch(dir, { recursive: true }, (event, filename) => {
        if (!filename) return;
        const ext = path.extname(filename).toLowerCase();
        if (['.gd', '.cs', '.tscn', '.tres', '.gdshader'].includes(ext)) {
          this.scheduleReload(filename);
        }
      });
      this.watchers.push(watcher);
    } catch { /* dir not watchable */ }
  }

  private scheduleReload(filename: string): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(async () => {
      console.log(`[HotReload] Change detected: ${filename}`);
      await this.rebuild();
    }, 500);
  }

  // -----------------------------------------------------------------------
  // Rebuild & reload
  // -----------------------------------------------------------------------

  private async rebuild(): Promise<void> {
    if (this.pendingRebuild) return;
    this.pendingRebuild = true;

    try {
      // Re-export web build
      const result = await godotCli.exportProject({
        projectPath: this.projectPath,
        preset: 'Web',
        outputPath: path.join(this.projectPath, 'build', 'web', 'index.html'),
        debug: true,
      });

      if (result.success && liveServer.isRunning()) {
        liveServer.triggerReload('hot-reload');
        console.log('[HotReload] Rebuild successful — reloading preview');
      } else if (!result.success) {
        console.error('[HotReload] Rebuild failed:', result.stderr.slice(0, 200));
      }
    } catch (err) {
      console.error('[HotReload] Error:', err);
    } finally {
      this.pendingRebuild = false;
    }
  }
}

export const hotReloadWatcher = new HotReloadWatcher();
