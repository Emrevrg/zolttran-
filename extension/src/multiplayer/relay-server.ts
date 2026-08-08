/**
 * relay-server — çalışan WebSocket tabanlı çapraz-platform gerçek-zamanlı relay + lobi.
 *
 * Bu, `RealtimeTransport` arayüzünün ÇALIŞAN bir uygulamasıdır: iOS/Android/Web/masaüstü
 * istemcileri tek sunucuya bağlanır, `CrossPlayManager` ile oturum (lobi) kurar/katılır ve
 * mesajlar oturumdaki eşlere relaylenir. Geliştirme/otantik-hafif relay'dir — üretim için
 * bölge relay'i, otoriter simülasyon ve anti-cheat ayrıca gerekir (bkz. docs/ROADMAP.md).
 */
import { WebSocketServer, WebSocket } from 'ws';
import { CrossPlayManager, type RealtimeTransport, type PlatformId, type CrossPlayAccount } from './cross-play.js';

interface ClientMsg {
  type: 'create' | 'join' | 'ready' | 'relay';
  sessionId?: string;
  account: { accountId: string; displayName: string };
  platform: PlatformId;
  event?: string;
  data?: unknown;
}

/** ws üzerinden RealtimeTransport — CrossPlayManager'a takılır. */
export class WsRealtimeTransport implements RealtimeTransport {
  private handler?: (sessionId: string, from: string, event: string, data: unknown) => void;
  constructor(private readonly peers: Map<string, Set<WebSocket>>) {}

  broadcast(sessionId: string, event: string, data: unknown): void {
    const set = this.peers.get(sessionId);
    if (!set) return;
    const payload = JSON.stringify({ event, data, sessionId });
    for (const ws of set) if (ws.readyState === ws.OPEN) ws.send(payload);
  }
  onMessage(handler: (sessionId: string, from: string, event: string, data: unknown) => void): void {
    this.handler = handler;
  }
  dispatch(sessionId: string, from: string, event: string, data: unknown): void {
    this.handler?.(sessionId, from, event, data);
  }
}

export interface RelayHandle {
  port: number;
  close: () => Promise<void>;
  sessions: () => number;
}

/** Relay sunucusunu başlatır. Dönen handle ile kapatılır. */
export function startRelayServer(port = 9977, netProtocol = 1): RelayHandle {
  const peers = new Map<string, Set<WebSocket>>();
  const transport = new WsRealtimeTransport(peers);
  const manager = new CrossPlayManager(netProtocol, transport);
  const wss = new WebSocketServer({ port });

  const accountOf = (m: ClientMsg): CrossPlayAccount => ({
    accountId: m.account.accountId, displayName: m.account.displayName,
    identities: [], save: {}, contentVersion: 1,
  });
  const track = (sessionId: string, ws: WebSocket) => {
    if (!peers.has(sessionId)) peers.set(sessionId, new Set());
    peers.get(sessionId)!.add(ws);
  };

  wss.on('connection', (ws) => {
    let joined: string | undefined;
    let accountId = '';
    ws.on('message', (raw) => {
      let m: ClientMsg;
      try { m = JSON.parse(String(raw)); } catch { return; }
      accountId = m.account?.accountId ?? accountId;
      try {
        switch (m.type) {
          case 'create': {
            const s = manager.createSession(accountOf(m), m.platform);
            joined = s.sessionId; track(s.sessionId, ws);
            ws.send(JSON.stringify({ event: 'session-created', data: s, sessionId: s.sessionId }));
            break;
          }
          case 'join': {
            if (!m.sessionId) return;
            const s = manager.joinSession(m.sessionId, accountOf(m), m.platform);
            joined = s.sessionId; track(s.sessionId, ws);
            ws.send(JSON.stringify({ event: 'session-joined', data: s, sessionId: s.sessionId }));
            break;
          }
          case 'ready': {
            if (!m.sessionId) return;
            const s = manager.setReady(m.sessionId, accountId, true);
            transport.broadcast(m.sessionId, 'lobby-update', s);
            break;
          }
          case 'relay': {
            if (!joined || !m.event) return;
            // Oturumdaki diğer eşlere ilet (otantik-hafif)
            transport.broadcast(joined, m.event, { from: accountId, ...(m.data as object) });
            transport.dispatch(joined, accountId, m.event, m.data);
            break;
          }
        }
      } catch (err) {
        ws.send(JSON.stringify({ event: 'error', data: String(err) }));
      }
    });
    ws.on('close', () => {
      if (joined) {
        peers.get(joined)?.delete(ws);
        transport.broadcast(joined, 'player-left', { accountId });
      }
    });
  });

  return {
    port,
    sessions: () => peers.size,
    close: () => new Promise<void>((resolve) => wss.close(() => resolve())),
  };
}
