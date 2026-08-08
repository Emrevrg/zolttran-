/**
 * authoritative-server — sunucu-otoriteli oyun durumu + anti-cheat.
 *
 * Valorant-tarzı çok oyunculunun temeli: istemci "istek" gönderir, KARARI sunucu
 * verir. Hareket hız sınırı (speedhack), menzil/atış-hızı doğrulaması (aimbot/range
 * hack), sıra-numarası (replay/enjeksiyon) ve oran sınırı (flood) sunucuda uygulanır.
 * İhlaller puanlanır; eşik aşılınca oyuncu işaretlenir/atılır.
 *
 * Saf ve test edilebilir: taşıma katmanından bağımsızdır (relay-server host eder).
 */

export interface Vec2 { x: number; y: number; }

export interface AuthPlayer {
  id: string;
  pos: Vec2;
  health: number;
  alive: boolean;
  lastSeq: number;
  lastInputAt: number;
  lastShotAt: number;
  inputCount: number;      // pencere içi girdi sayısı (rate-limit)
  windowStart: number;
  violations: number;
  flagged: boolean;
}

export interface MoveInput { type: 'move'; seq: number; dx: number; dy: number; dt: number; }
export interface ShootInput { type: 'shoot'; seq: number; targetId: string; }
export type PlayerInput = MoveInput | ShootInput;

export interface ValidationResult { ok: boolean; reason?: string; }

export interface AuthConfig {
  maxMoveSpeed: number;     // birim/sn — bunu aşan hareket reddedilir
  maxInputsPerSec: number;  // flood koruması
  weaponRange: number;      // menzil doğrulaması
  weaponCooldownMs: number; // atış hızı doğrulaması
  weaponDamage: number;
  worldBounds: { minX: number; minY: number; maxX: number; maxY: number };
  violationLimit: number;   // bu kadar ihlalden sonra flagged
}

export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  maxMoveSpeed: 300,
  maxInputsPerSec: 40,
  weaponRange: 250,
  weaponCooldownMs: 120,
  weaponDamage: 34,
  worldBounds: { minX: -5000, minY: -5000, maxX: 5000, maxY: 5000 },
  violationLimit: 5,
};

const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);

export class AuthoritativeServer {
  private players = new Map<string, AuthPlayer>();
  constructor(private readonly cfg: AuthConfig = DEFAULT_AUTH_CONFIG) {}

  addPlayer(id: string, pos: Vec2 = { x: 0, y: 0 }): AuthPlayer {
    const now = Date.now();
    const p: AuthPlayer = {
      id, pos: { ...pos }, health: 100, alive: true, lastSeq: 0,
      lastInputAt: now, lastShotAt: 0, inputCount: 0, windowStart: now, violations: 0, flagged: false,
    };
    this.players.set(id, p);
    return p;
  }
  get(id: string): AuthPlayer | undefined { return this.players.get(id); }
  snapshot(): AuthPlayer[] { return [...this.players.values()].map((p) => ({ ...p, pos: { ...p.pos } })); }

  private flag(p: AuthPlayer, reason: string): ValidationResult {
    p.violations++;
    if (p.violations >= this.cfg.violationLimit) p.flagged = true;
    return { ok: false, reason };
  }

  private rateOk(p: AuthPlayer, now: number): boolean {
    if (now - p.windowStart >= 1000) { p.windowStart = now; p.inputCount = 0; }
    p.inputCount++;
    return p.inputCount <= this.cfg.maxInputsPerSec;
  }

  /** İstemci girdisini sunucuda doğrular ve otoriteli durumu günceller. */
  applyInput(playerId: string, input: PlayerInput, now = Date.now()): ValidationResult {
    const p = this.players.get(playerId);
    if (!p) return { ok: false, reason: 'oyuncu yok' };
    if (!p.alive) return { ok: false, reason: 'ölü oyuncu' };

    // Replay / enjeksiyon: sıra numarası artmalı
    if (input.seq <= p.lastSeq) return this.flag(p, 'seq-replay');
    // Flood
    if (!this.rateOk(p, now)) return this.flag(p, 'rate-limit');
    p.lastSeq = input.seq;
    p.lastInputAt = now;

    if (input.type === 'move') {
      const dt = Math.min(Math.max(input.dt, 0.001), 1); // dt sınırı
      const speed = Math.hypot(input.dx, input.dy) / dt;
      if (speed > this.cfg.maxMoveSpeed) return this.flag(p, `speedhack (${speed.toFixed(0)}>${this.cfg.maxMoveSpeed})`);
      const nx = Math.min(Math.max(p.pos.x + input.dx, this.cfg.worldBounds.minX), this.cfg.worldBounds.maxX);
      const ny = Math.min(Math.max(p.pos.y + input.dy, this.cfg.worldBounds.minY), this.cfg.worldBounds.maxY);
      p.pos = { x: nx, y: ny };
      return { ok: true };
    }

    // shoot
    const target = this.players.get(input.targetId);
    if (!target || !target.alive) return { ok: false, reason: 'geçersiz hedef' };
    if (now - p.lastShotAt < this.cfg.weaponCooldownMs) return this.flag(p, 'fire-rate (atış hızı hilesi)');
    const range = dist(p.pos, target.pos);
    if (range > this.cfg.weaponRange) return this.flag(p, `menzil-dışı vuruş (${range.toFixed(0)}>${this.cfg.weaponRange})`);
    p.lastShotAt = now;
    target.health -= this.cfg.weaponDamage;
    if (target.health <= 0) { target.health = 0; target.alive = false; }
    return { ok: true };
  }
}
