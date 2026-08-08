/**
 * OmniForge Live Preview Server
 * Serves the Godot HTML5 export locally and injects hot-reload via WebSocket.
 */
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import type { PreviewState } from '../types/index.js';

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.wasm': 'application/wasm',
  '.pck':  'application/octet-stream',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.css':  'text/css',
  '.svg':  'image/svg+xml',
  '.json': 'application/json',
};

export type PreviewEventCallback = (state: PreviewState) => void;

export class LivePreviewServer {
  private server: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();
  private buildDir = '';
  private port: number;
  private state: PreviewState;
  private callbacks: PreviewEventCallback[] = [];
  private metricsInterval: ReturnType<typeof setInterval> | null = null;

  constructor(port = 8080) {
    this.port = port;
    this.state = { running: false, port, wsConnected: false };
  }

  // -----------------------------------------------------------------------
  // Server lifecycle
  // -----------------------------------------------------------------------

  async start(buildDir: string): Promise<string> {
    this.buildDir = buildDir;

    if (this.server) await this.stop();

    await new Promise<void>((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));

      this.server.listen(this.port, '127.0.0.1', () => resolve());
      this.server.on('error', reject);
    });

    // WebSocket server on a separate port (port + 1)
    this.wss = new WebSocketServer({ port: this.port + 1 });
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      this.state.wsConnected = true;
      ws.on('close', () => {
        this.clients.delete(ws);
        this.state.wsConnected = this.clients.size > 0;
        this.emitState();
      });
      ws.on('message', (data) => this.handleWsMessage(data.toString()));
    });

    const url = `http://localhost:${this.port}/index.html`;
    this.state = { running: true, url, port: this.port, wsConnected: false };
    this.startMetrics();
    this.emitState();
    return url;
  }

  async stop(): Promise<void> {
    if (this.metricsInterval) { clearInterval(this.metricsInterval); this.metricsInterval = null; }

    await new Promise<void>((resolve) => {
      if (this.wss) { this.wss.close(() => { this.wss = null; resolve(); }); }
      else resolve();
    });

    await new Promise<void>((resolve) => {
      if (this.server) { this.server.close(() => { this.server = null; resolve(); }); }
      else resolve();
    });

    this.clients.clear();
    this.state = { running: false, port: this.port, wsConnected: false };
    this.emitState();
  }

  isRunning(): boolean { return this.state.running; }
  getState(): PreviewState { return { ...this.state }; }
  getUrl(): string | undefined { return this.state.url; }

  setPort(port: number): void { this.port = port; this.state.port = port; }

  // -----------------------------------------------------------------------
  // Hot reload
  // -----------------------------------------------------------------------

  triggerReload(message = 'reload'): void {
    this.broadcast(JSON.stringify({ type: 'reload', message }));
  }

  broadcast(data: string): void {
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    }
  }

  // -----------------------------------------------------------------------
  // Events
  // -----------------------------------------------------------------------

  onStateChange(cb: PreviewEventCallback): () => void {
    this.callbacks.push(cb);
    return () => { this.callbacks = this.callbacks.filter((c) => c !== cb); };
  }

  // -----------------------------------------------------------------------
  // HTTP handler
  // -----------------------------------------------------------------------

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    let urlPath = req.url ?? '/';
    if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

    // Strip query string
    urlPath = urlPath.split('?')[0] ?? urlPath;

    const filePath = path.join(this.buildDir, urlPath);

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] ?? 'application/octet-stream';

    // Required headers for SharedArrayBuffer (Godot web threading)
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'no-cache');

    // Inject hot-reload script into index.html
    if (urlPath === '/index.html') {
      let html = fs.readFileSync(filePath, 'utf8');
      html = html.replace('</body>', `${this.hotReloadScript()}</body>`);
      res.end(html);
      return;
    }

    fs.createReadStream(filePath).pipe(res);
  }

  private hotReloadScript(): string {
    return `<script>
(function() {
  const ws = new WebSocket('ws://localhost:${this.port + 1}');
  ws.onmessage = function(e) {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === 'reload') window.location.reload();
      if (msg.type === 'metrics-request') {
        ws.send(JSON.stringify({
          type: 'metrics',
          fps: Engine ? Math.round(Engine.lastFrameTime ? 1000 / Engine.lastFrameTime : 60) : 60,
          memory: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0
        }));
      }
    } catch {}
  };
  ws.onopen = function() { console.log('[OmniForge] Hot reload connected'); };
})();
</script>`;
  }

  private handleWsMessage(data: string): void {
    try {
      const msg = JSON.parse(data) as { type?: string; fps?: number; memory?: number };
      if (msg.type === 'metrics') {
        this.state.fps = msg.fps;
        this.state.memoryMb = msg.memory;
        this.emitState();
      }
    } catch { /* ignore */ }
  }

  private startMetrics(): void {
    this.metricsInterval = setInterval(() => {
      if (this.clients.size > 0) {
        this.broadcast(JSON.stringify({ type: 'metrics-request' }));
      }
    }, 2000);
  }

  private emitState(): void {
    for (const cb of this.callbacks) cb({ ...this.state });
  }
}

export const liveServer = new LivePreviewServer();
