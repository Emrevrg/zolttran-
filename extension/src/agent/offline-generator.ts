/**
 * offline-generator — API anahtarı / canlı LLM olmadan, tek cümleden çalışan
 * Godot projesi üretir. Prompt'tan oyun türünü sezer, şablondan tam bir GDD
 * kurar ve GodotProjectScaffolder ile oynanabilir projeyi diske yazar.
 *
 * Böylece FREE MODE gerçekten "tek cümleyle oyun" verir: sağlayıcı yoksa bile
 * kullanıcı anında oynanabilir bir Godot 4 projesi alır.
 */
import type { GameDesignDocument, GameType } from '../types/index.js';
import { GAME_TEMPLATES } from './prompts/game-templates.js';
import { projectScaffolder, type ScaffoldResult } from '../godot/project-scaffolder.js';

const KEYWORDS: Array<{ type: GameType; words: string[] }> = [
  { type: 'bullet-heaven', words: ['vampire survivors', 'bullet heaven', 'bullet-heaven', 'auto shoot', 'survivor', 'sürü', 'dalga', 'roguelite shoot'] },
  { type: 'platformer',    words: ['platform', 'platformer', 'jump', 'zıpla', 'wall jump', 'wall-jump', 'metroidvania', 'yan kaydırma'] },
  { type: 'top-down-rpg',  words: ['rpg', 'top-down', 'top down', 'npc', 'diyalog', 'envanter', 'quest', 'zelda'] },
  { type: 'fps',           words: ['fps', 'first person', 'birinci şahıs', 'nişancı', 'shooter 3d', 'arena shooter', 'valorant', 'counter'] },
  { type: 'roguelike',     words: ['roguelike', 'rogue', 'zindan', 'dungeon', 'prosedürel', 'permadeath', 'kalıcı ölüm'] },
  { type: 'farm-sim',      words: ['çiftlik', 'farm', 'tarım', 'hasat', 'stardew', 'cozy', 'simülasyon', 'ekim'] },
  { type: 'strategy',      words: ['strateji', 'strategy', 'rts', 'kule savunma', 'tower defense', 'taktik'] },
];

export function detectGameType(prompt: string): GameType {
  const p = prompt.toLowerCase();
  let best: { type: GameType; score: number } = { type: 'platformer', score: 0 };
  for (const k of KEYWORDS) {
    const score = k.words.reduce((s, w) => (p.includes(w) ? s + w.length : s), 0);
    if (score > best.score) best = { type: k.type, score };
  }
  return best.score > 0 ? best.type : 'platformer';
}

function titleFromPrompt(prompt: string, gameType: GameType): string {
  const clean = prompt.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).slice(0, 3).join(' ');
  const base = clean.length >= 3 ? clean : (GAME_TEMPLATES[gameType]?.name ?? 'Zolttran Oyunu');
  return base.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Şablonun defaultGdd'sini eksiksiz bir GDD'ye tamamlar. */
export function buildGdd(prompt: string, gameType = detectGameType(prompt)): GameDesignDocument {
  const tpl = GAME_TEMPLATES[gameType];
  const d = tpl?.defaultGdd ?? {};
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: titleFromPrompt(prompt, gameType),
    gameType,
    description: d.description ?? prompt,
    genre: d.genre ?? ['action'],
    targetPlatforms: d.targetPlatforms ?? ['web', 'windows'],
    mechanics: d.mechanics ?? [],
    systems: d.systems ?? [],
    scenes: d.scenes ?? [],
    entities: d.entities ?? [],
    ui: d.ui ?? { mainMenu: true, hud: true, pauseMenu: true, gameOver: true, settings: true, elements: [] },
    audioSpec: d.audioSpec ?? { bgm: [], sfx: [], ambience: [] },
    techRequirements: d.techRequirements ?? {
      physics: gameType === 'fps' ? '3d' : '2d',
      multiplayer: false, saveSystem: true, localisation: false, minGodotVersion: '4.3',
    },
    createdAt: now,
    updatedAt: now,
  };
}

export interface OfflineResult extends ScaffoldResult {
  gdd: GameDesignDocument;
  gameType: GameType;
}

/** Tek cümleden oynanabilir Godot projesi üretir (LLM/anahtar gerektirmez). */
export async function generateGameOffline(prompt: string, outputPath: string): Promise<OfflineResult> {
  const gdd = buildGdd(prompt);
  const res = await projectScaffolder.scaffold({ outputPath, gdd });
  return { ...res, gdd, gameType: gdd.gameType };
}
