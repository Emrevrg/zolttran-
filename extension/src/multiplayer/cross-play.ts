/**
 * cross-play — çapraz-platform hesap ve oturum modeli.
 *
 * Hedef: bir kullanıcı tek bir Zolttran hesabıyla iOS, Android, Web veya
 * masaüstünden oynayabilsin; ilerleme/save senkron olsun; farklı platformlardaki
 * oyuncular aynı çok-oyunculu oturumda buluşabilsin (Valorant benzeri arena).
 *
 * NOT: Bu modül veri modelini ve oturum yaşam döngüsünü uygular (in-memory, test
 * edilebilir). Gerçek netcode/transport (WebRTC/UDP relay) ve kalıcı hesap deposu
 * `RealtimeTransport` ve `AccountStore` arayüzleri üzerinden takılır — henüz sunucu
 * eklenmedi. Yani mimari hazır; taşıma katmanı ayrı sprint.
 */

export type PlatformId = 'ios' | 'android' | 'web' | 'windows' | 'macos' | 'linux';

export interface PlatformIdentity {
  platform: PlatformId;
  deviceId: string;
  linkedAt: number;
}

export interface CrossPlayAccount {
  accountId: string;
  displayName: string;
  identities: PlatformIdentity[];
  /** Platformdan bağımsız ilerleme/save (contentVersion ile şema uyumlu tutulur) */
  save: Record<string, unknown>;
  contentVersion: number;
}

export interface SessionPlayer {
  accountId: string;
  displayName: string;
  platform: PlatformId;
  ready: boolean;
}

export interface CrossPlaySession {
  sessionId: string;
  hostAccountId: string;
  netProtocol: number;
  maxPlayers: number;
  players: SessionPlayer[];
  state: 'lobby' | 'starting' | 'in-game' | 'ended';
  createdAt: number;
}

/** Gerçek zamanlı taşıma — sunucu tarafı ayrıca sağlanır. */
export interface RealtimeTransport {
  broadcast(sessionId: string, event: string, data: unknown): void;
  onMessage(handler: (sessionId: string, from: string, event: string, data: unknown) => void): void;
}

/** Hesap kalıcılığı — bulut deposu ayrıca sağlanır. */
export interface AccountStore {
  get(accountId: string): Promise<CrossPlayAccount | null>;
  save(account: CrossPlayAccount): Promise<void>;
}

export class CrossPlayManager {
  private sessions = new Map<string, CrossPlaySession>();

  constructor(private readonly netProtocol: number, private readonly transport?: RealtimeTransport) {}

  /** Bir platform kimliğini mevcut hesaba bağla (aynı hesap, farklı cihaz). */
  linkPlatform(account: CrossPlayAccount, platform: PlatformId, deviceId: string): CrossPlayAccount {
    if (!account.identities.some((i) => i.platform === platform && i.deviceId === deviceId)) {
      account.identities.push({ platform, deviceId, linkedAt: Date.now() });
    }
    return account;
  }

  /** Yeni çapraz-platform oturum (lobi) oluştur. */
  createSession(host: CrossPlayAccount, platform: PlatformId, maxPlayers = 10): CrossPlaySession {
    const session: CrossPlaySession = {
      sessionId: crypto.randomUUID(),
      hostAccountId: host.accountId,
      netProtocol: this.netProtocol,
      maxPlayers,
      players: [{ accountId: host.accountId, displayName: host.displayName, platform, ready: false }],
      state: 'lobby',
      createdAt: Date.now(),
    };
    this.sessions.set(session.sessionId, session);
    return session;
  }

  /** Herhangi bir platformdaki oyuncu, protokol uyuşuyorsa oturuma katılır. */
  joinSession(sessionId: string, account: CrossPlayAccount, platform: PlatformId): CrossPlaySession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Oturum bulunamadı');
    if (session.netProtocol !== this.netProtocol) throw new Error('Protokol uyumsuz — güncelleme gerekli');
    if (session.players.length >= session.maxPlayers) throw new Error('Oturum dolu');
    if (!session.players.some((p) => p.accountId === account.accountId)) {
      session.players.push({ accountId: account.accountId, displayName: account.displayName, platform, ready: false });
      this.transport?.broadcast(sessionId, 'player-joined', { accountId: account.accountId, platform });
    }
    return session;
  }

  setReady(sessionId: string, accountId: string, ready: boolean): CrossPlaySession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Oturum bulunamadı');
    const player = session.players.find((p) => p.accountId === accountId);
    if (player) player.ready = ready;
    if (session.players.length > 0 && session.players.every((p) => p.ready)) session.state = 'starting';
    return session;
  }

  getSession(sessionId: string): CrossPlaySession | undefined {
    return this.sessions.get(sessionId);
  }
}
