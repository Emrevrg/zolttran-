/**
 * godot-provisioner — Godot 4 çalıştırılabilirini kullanıcı hiç uğraşmadan
 * sisteme sağlar: resmi GitHub sürümünden indirir, açar ve yolunu döndürür.
 * (vscode'a bağımlı değil; orkestrasyon extension.ts'te.)
 */
import * as https from 'https';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as cp from 'child_process';

const GODOT_VERSION = '4.3-stable';

interface Asset { url: string; zipName: string; exeMatch: RegExp; }

export function platformAsset(): Asset | null {
  const base = `https://github.com/godotengine/godot/releases/download/${GODOT_VERSION}`;
  switch (process.platform) {
    case 'win32':
      return { url: `${base}/Godot_v${GODOT_VERSION}_win64.exe.zip`, zipName: 'godot_win64.zip', exeMatch: /^Godot_v.*win64\.exe$/i };
    case 'linux':
      return { url: `${base}/Godot_v${GODOT_VERSION}_linux.x86_64.zip`, zipName: 'godot_linux.zip', exeMatch: /^Godot_v.*linux\.x86_64$/i };
    case 'darwin':
      return { url: `${base}/Godot_v${GODOT_VERSION}_macos.universal.zip`, zipName: 'godot_macos.zip', exeMatch: /Godot(\.app\/Contents\/MacOS\/Godot)?$/i };
    default:
      return null;
  }
}

/** URL'yi (yönlendirmeleri izleyerek) dosyaya indirir. */
export function download(url: string, dest: string, onProgress?: (pct: number) => void, redirects = 0): Promise<void> {
  return new Promise((resolve, reject) => {
    if (redirects > 6) { reject(new Error('Çok fazla yönlendirme')); return; }
    const req = https.get(url, { headers: { 'User-Agent': 'Zolttran' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        download(res.headers.location, dest, onProgress, redirects + 1).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      const total = Number(res.headers['content-length'] ?? 0);
      let received = 0;
      const file = fs.createWriteStream(dest);
      res.on('data', (chunk) => {
        received += chunk.length;
        if (total && onProgress) onProgress(Math.round((received / total) * 100));
      });
      res.pipe(file);
      file.on('finish', () => file.close((err) => err ? reject(err) : resolve()));
      file.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(120000, () => req.destroy(new Error('İndirme zaman aşımı')));
  });
}

/** Zip'i çıkarır (Windows: PowerShell Expand-Archive, diğer: unzip). */
export function extractZip(zip: string, destDir: string): void {
  fs.mkdirSync(destDir, { recursive: true });
  if (process.platform === 'win32') {
    cp.execFileSync('powershell', ['-NoProfile', '-Command',
      `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${destDir}' -Force`],
      { stdio: 'ignore', timeout: 120000, windowsHide: true });
  } else {
    cp.execFileSync('unzip', ['-o', zip, '-d', destDir], { stdio: 'ignore', timeout: 120000 });
  }
}

/** destDir içinde asset'in exe eşleşmesini bulur. */
function findExe(destDir: string, match: RegExp): string | null {
  const walk = (dir: string, depth: number): string | null => {
    if (depth > 4) return null;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      let st: fs.Stats;
      try { st = fs.statSync(full); } catch { continue; }
      if (st.isDirectory()) {
        const r = walk(full, depth + 1);
        if (r) return r;
      } else if (match.test(name)) {
        return full;
      }
    }
    return null;
  };
  return walk(destDir, 0);
}

/**
 * Godot'u destDir'e sağlar (indirir + açar) ve exe yolunu döndürür.
 * onProgress 0..100 indirme yüzdesi verir.
 */
export async function provision(destDir: string, onProgress?: (pct: number) => void): Promise<string> {
  const asset = platformAsset();
  if (!asset) throw new Error(`Bu platform için otomatik Godot indirme desteklenmiyor (${process.platform}).`);

  fs.mkdirSync(destDir, { recursive: true });
  const zipPath = path.join(destDir, asset.zipName);
  await download(asset.url, zipPath, onProgress);
  extractZip(zipPath, destDir);
  try { fs.unlinkSync(zipPath); } catch { /* yoksay */ }

  const exe = findExe(destDir, asset.exeMatch);
  if (!exe) throw new Error('İndirilen arşivde Godot çalıştırılabiliri bulunamadı.');
  if (process.platform !== 'win32') { try { fs.chmodSync(exe, 0o755); } catch { /* yoksay */ } }
  return exe;
}

export const GODOT_LABEL = GODOT_VERSION;
export function defaultStorageDir(): string {
  return path.join(os.homedir(), '.zolttran', 'godot');
}
