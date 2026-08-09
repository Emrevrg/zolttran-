/**
 * Zolttran MCP Server — stdio (newline-delimited JSON-RPC 2.0).
 * Zolttran'ın anahtarsız/offline oyun üretim yeteneklerini MCP aracı olarak
 * sunar; Claude Code, Codex veya herhangi bir MCP istemcisine takılabilir.
 *
 * Çalıştırma: node dist/mcp-server.js
 */
import * as os from 'os';
import * as path from 'path';
import { generateGameOffline, detectGameType, buildGdd } from '../agent/offline-generator.js';
import { GAME_TEMPLATES } from '../agent/prompts/game-templates.js';
import type { GameType } from '../types/index.js';

const SERVER = { name: 'zolttran', version: '0.0.7' };
const PROTOCOL = '2024-11-05';

interface RpcMsg { jsonrpc: '2.0'; id?: number | string | null; method?: string; params?: unknown; result?: unknown; error?: unknown; }

function send(msg: RpcMsg): void {
  process.stdout.write(JSON.stringify(msg) + '\n');
}
function ok(id: RpcMsg['id'], result: unknown): void { send({ jsonrpc: '2.0', id, result }); }
function err(id: RpcMsg['id'], code: number, message: string): void { send({ jsonrpc: '2.0', id, error: { code, message } }); }
function textResult(id: RpcMsg['id'], text: string, isError = false): void {
  send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }], isError } });
}

const TOOLS = [
  {
    name: 'zolttran_generate_game',
    description: 'Tek cümlelik bir açıklamadan tam, oynanabilir bir Godot 4 projesi üretir (API anahtarı GEREKMEZ, tamamen offline). Türü prompttan sezer, gerçek GDScript + sahneler + export ayarları yazar.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Oyun fikri, ör. "wall-jump özellikli 2D platformer"' },
        outputPath: { type: 'string', description: 'Projenin yazılacağı klasör (opsiyonel; varsayılan ~/ZolttranGames)' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'zolttran_detect_game_type',
    description: 'Bir prompttan oyun türünü ve önerilen yapım planını (üretilecek dosya/mekanikler) döndürür — proje yazmadan.',
    inputSchema: {
      type: 'object',
      properties: { prompt: { type: 'string' } },
      required: ['prompt'],
    },
  },
  {
    name: 'zolttran_list_templates',
    description: 'Desteklenen oyun kategorilerini ve her birinin özelliklerini listeler.',
    inputSchema: { type: 'object', properties: {} },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'zolttran_generate_game': {
      const prompt = String(args.prompt ?? '').trim();
      if (!prompt) throw new Error('prompt gerekli');
      const out = String(args.outputPath ?? path.join(os.homedir(), 'ZolttranGames'));
      const r = await generateGameOffline(prompt, out);
      const rel = r.filesCreated.map((f) => f.split(/[\\/]/).slice(-2).join('/'));
      return JSON.stringify({
        gameType: r.gameType, title: r.gdd.title, projectPath: r.projectPath,
        fileCount: r.filesCreated.length, files: rel,
        playable: 'Godot 4.3+ ile aç veya web export al; kod ve sahneler hazır.',
      }, null, 2);
    }
    case 'zolttran_detect_game_type': {
      const prompt = String(args.prompt ?? '').trim();
      if (!prompt) throw new Error('prompt gerekli');
      const type = detectGameType(prompt);
      const gdd = buildGdd(prompt, type);
      const tpl = GAME_TEMPLATES[type];
      return JSON.stringify({
        gameType: type, title: gdd.title,
        mechanics: gdd.mechanics.map((m) => m.name),
        scripts: Object.keys(tpl?.baseScripts ?? {}),
        targetPlatforms: gdd.targetPlatforms,
      }, null, 2);
    }
    case 'zolttran_list_templates': {
      const list = (Object.keys(GAME_TEMPLATES) as GameType[])
        .filter((t) => t !== 'custom')
        .map((t) => ({ id: t, name: GAME_TEMPLATES[t].name, features: GAME_TEMPLATES[t].features }));
      return JSON.stringify(list, null, 2);
    }
    default:
      throw new Error(`Bilinmeyen araç: ${name}`);
  }
}

async function handle(msg: RpcMsg): Promise<void> {
  const { id, method, params } = msg;
  if (method === 'initialize') {
    ok(id, { protocolVersion: PROTOCOL, capabilities: { tools: {} }, serverInfo: SERVER });
    return;
  }
  if (method === 'notifications/initialized' || method === 'initialized') return; // bildirim
  if (method === 'ping') { ok(id, {}); return; }
  if (method === 'tools/list') { ok(id, { tools: TOOLS }); return; }
  if (method === 'tools/call') {
    const p = (params ?? {}) as { name?: string; arguments?: Record<string, unknown> };
    try {
      const text = await callTool(String(p.name), p.arguments ?? {});
      textResult(id, text);
    } catch (e) {
      textResult(id, `Hata: ${e instanceof Error ? e.message : String(e)}`, true);
    }
    return;
  }
  if (id !== undefined && id !== null) err(id, -32601, `Method bulunamadı: ${method}`);
}

// stdio okuma — satır bazlı JSON-RPC
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk: string) => {
  buf += chunk;
  let nl: number;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line) as RpcMsg;
      void handle(msg);
    } catch { /* geçersiz satırı yoksay */ }
  }
});
process.stdin.on('end', () => process.exit(0));
process.stderr.write(`[zolttran-mcp] hazır (${SERVER.name} v${SERVER.version})\n`);
