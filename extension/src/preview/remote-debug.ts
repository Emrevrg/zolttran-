/**
 * Remote debug bridge — captures Godot web console output and errors,
 * forwarding them to the VS Code output channel.
 */
import { WebSocket } from 'ws';
import type { GodotError } from '../types/index.js';

export type DebugLogCallback = (log: { level: string; message: string; timestamp: number }) => void;
export type DebugErrorCallback = (error: GodotError) => void;

export class RemoteDebugBridge {
  private ws: WebSocket | null = null;
  private port: number;
  private logCallbacks: DebugLogCallback[] = [];
  private errorCallbacks: DebugErrorCallback[] = [];
  private connected = false;

  constructor(port = 8081) {
    this.port = port;
  }

  // -----------------------------------------------------------------------
  // Connect to the hot-reload WS server and intercept debug messages
  // -----------------------------------------------------------------------

  connect(): void {
    try {
      this.ws = new WebSocket(`ws://localhost:${this.port}`);

      this.ws.on('open', () => {
        this.connected = true;
        // Request debug mode from the Godot runtime
        this.ws?.send(JSON.stringify({ type: 'enable-debug' }));
      });

      this.ws.on('message', (data: Buffer) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('close', () => {
        this.connected = false;
        // Auto-reconnect after 3s
        setTimeout(() => this.connect(), 3000);
      });

      this.ws.on('error', () => { this.connected = false; });
    } catch { /* ws not available yet */ }
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }

  isConnected(): boolean { return this.connected; }

  // -----------------------------------------------------------------------
  // Event subscriptions
  // -----------------------------------------------------------------------

  onLog(cb: DebugLogCallback): () => void {
    this.logCallbacks.push(cb);
    return () => { this.logCallbacks = this.logCallbacks.filter((c) => c !== cb); };
  }

  onError(cb: DebugErrorCallback): () => void {
    this.errorCallbacks.push(cb);
    return () => { this.errorCallbacks = this.errorCallbacks.filter((c) => c !== cb); };
  }

  // -----------------------------------------------------------------------
  // Commands
  // -----------------------------------------------------------------------

  sendCommand(cmd: string, args: Record<string, unknown> = {}): void {
    if (!this.connected) return;
    this.ws?.send(JSON.stringify({ type: 'command', cmd, args }));
  }

  pauseGame(): void   { this.sendCommand('pause'); }
  resumeGame(): void  { this.sendCommand('resume'); }
  screenshot(): void  { this.sendCommand('screenshot'); }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private handleMessage(raw: string): void {
    try {
      const msg = JSON.parse(raw) as { type?: string; level?: string; message?: string; line?: number; file?: string };

      switch (msg.type) {
        case 'log':
          this.emitLog({ level: msg.level ?? 'info', message: msg.message ?? '', timestamp: Date.now() });
          break;
        case 'error':
          this.emitError({ line: msg.line ?? 0, column: 0, message: msg.message ?? '', severity: 'error' });
          break;
        case 'warning':
          this.emitError({ line: msg.line ?? 0, column: 0, message: msg.message ?? '', severity: 'warning' });
          break;
      }
    } catch { /* ignore */ }
  }

  private emitLog(log: Parameters<DebugLogCallback>[0]): void {
    for (const cb of this.logCallbacks) cb(log);
  }

  private emitError(err: GodotError): void {
    for (const cb of this.errorCallbacks) cb(err);
  }
}

export const remoteDebug = new RemoteDebugBridge();
