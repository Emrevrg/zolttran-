/**
 * Godot TCP Runtime Bridge
 * Communicates with a running Godot instance via a TCP socket plugin.
 * Supports hot-reload, live scene tree inspection, and real-time debugging.
 */
import * as net from 'net';
import { EventEmitter } from 'events';
import type { GodotBridgeCommand, GodotBridgeResponse } from '../types/index.js';

export interface TcpBridgeOptions {
  host?: string;
  port?: number;
  reconnectInterval?: number;
  maxReconnects?: number;
}

interface PendingRequest {
  resolve: (res: GodotBridgeResponse) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class GodotTcpBridge extends EventEmitter {
  private socket: net.Socket | null = null;
  private connected = false;
  private reconnectAttempts = 0;
  private buffer = '';
  private pending = new Map<string, PendingRequest>();
  private opts: Required<TcpBridgeOptions>;

  constructor(opts: TcpBridgeOptions = {}) {
    super();
    this.opts = {
      host: opts.host ?? '127.0.0.1',
      port: opts.port ?? 9876,
      reconnectInterval: opts.reconnectInterval ?? 2000,
      maxReconnects: opts.maxReconnects ?? 10,
    };
  }

  // -----------------------------------------------------------------------
  // Connection management
  // -----------------------------------------------------------------------

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connected) { resolve(); return; }

      this.socket = new net.Socket();

      this.socket.connect(this.opts.port, this.opts.host, () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
        resolve();
      });

      this.socket.on('data', (data: Buffer) => {
        this.buffer += data.toString('utf8');
        this.processBuffer();
      });

      this.socket.on('close', () => {
        this.connected = false;
        this.emit('disconnected');
        this.rejectAllPending(new Error('TCP bridge disconnected'));
        this.scheduleReconnect();
      });

      this.socket.on('error', (err: Error) => {
        if (!this.connected) reject(err);
        this.emit('error', err);
      });
    });
  }

  disconnect(): void {
    this.reconnectAttempts = this.opts.maxReconnects; // prevent auto-reconnect
    this.socket?.destroy();
    this.socket = null;
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  // -----------------------------------------------------------------------
  // Command execution
  // -----------------------------------------------------------------------

  async send(command: GodotBridgeCommand): Promise<GodotBridgeResponse> {
    if (!this.connected) {
      return { success: false, error: 'TCP bridge not connected' };
    }

    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const payload = JSON.stringify({ id, ...command }) + '\n';

      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Command timeout: ${command.command}`));
      }, command.timeout ?? 10_000);

      this.pending.set(id, { resolve, reject, timer });

      try {
        this.socket!.write(payload, 'utf8');
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  // -----------------------------------------------------------------------
  // High-level Godot operations
  // -----------------------------------------------------------------------

  async getSceneTree(): Promise<GodotBridgeResponse> {
    return this.send({ command: 'scene.get_tree', args: {} });
  }

  async createNode(opts: {
    parentPath: string;
    nodeType: string;
    name: string;
    properties?: Record<string, unknown>;
  }): Promise<GodotBridgeResponse> {
    return this.send({ command: 'scene.create_node', args: opts });
  }

  async setNodeProperty(opts: {
    nodePath: string;
    property: string;
    value: unknown;
  }): Promise<GodotBridgeResponse> {
    return this.send({ command: 'scene.set_property', args: opts });
  }

  async attachScript(opts: {
    nodePath: string;
    scriptPath: string;
  }): Promise<GodotBridgeResponse> {
    return this.send({ command: 'script.attach', args: opts });
  }

  async reloadScript(scriptPath: string): Promise<GodotBridgeResponse> {
    return this.send({ command: 'script.reload', args: { path: scriptPath } });
  }

  async saveScene(scenePath: string): Promise<GodotBridgeResponse> {
    return this.send({ command: 'scene.save', args: { path: scenePath } });
  }

  async runScene(scenePath: string): Promise<GodotBridgeResponse> {
    return this.send({ command: 'editor.run_scene', args: { path: scenePath } });
  }

  async getErrors(): Promise<string[]> {
    const res = await this.send({ command: 'debug.get_errors', args: {} });
    return (res.data as string[] | undefined) ?? [];
  }

  async takeScreenshot(): Promise<string> {
    const res = await this.send({ command: 'debug.screenshot', args: {} });
    return (res.data as string | undefined) ?? '';
  }

  async connectSignal(opts: {
    sourceNode: string;
    signal: string;
    targetNode: string;
    method: string;
  }): Promise<GodotBridgeResponse> {
    return this.send({ command: 'scene.connect_signal', args: opts });
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private processBuffer(): void {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line) as { id?: string } & GodotBridgeResponse;
        const { id, ...response } = msg;
        if (id && this.pending.has(id)) {
          const req = this.pending.get(id)!;
          clearTimeout(req.timer);
          this.pending.delete(id);
          req.resolve(response);
        } else {
          // Unsolicited event from Godot (error, log, etc.)
          this.emit('godot-event', response);
        }
      } catch {
        // Malformed line — skip
      }
    }
  }

  private rejectAllPending(err: Error): void {
    for (const [id, req] of this.pending) {
      clearTimeout(req.timer);
      req.reject(err);
      this.pending.delete(id);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.opts.maxReconnects) return;
    this.reconnectAttempts++;
    setTimeout(() => {
      this.connect().catch(() => { /* handled in close */ });
    }, this.opts.reconnectInterval);
  }
}

export const godotTcpBridge = new GodotTcpBridge();
