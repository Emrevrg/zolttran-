/**
 * godot-locator — Godot 4 çalıştırılabilirini otomatik bulur.
 * Kullanıcı "godotPath" ayarıyla uğraşmasın: PATH + yaygın kurulum
 * konumları taranır, `--version` ile 4.x doğrulanır.
 */
import * as cp from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

function tryVersion(exe: string): string | null {
  try {
    const out = cp.execFileSync(exe, ['--headless', '--version'], {
      timeout: 6000, stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true,
    }).toString().trim();
    // Godot 4.x sürüm çıktısı: "4.3.stable.official..." gibi
    if (/^4\./.test(out) || /\b4\.\d/.test(out)) return out;
    return null;
  } catch {
    return null;
  }
}

function existing(paths: string[]): string[] {
  return paths.filter((p) => { try { return fs.existsSync(p); } catch { return false; } });
}

/** İçinde Godot_v4*.exe/godot* arayacağımız dizinlerden adayları toplar. */
function globGodot(dirs: string[]): string[] {
  const found: string[] = [];
  for (const dir of dirs) {
    try {
      if (!fs.existsSync(dir)) continue;
      for (const name of fs.readdirSync(dir)) {
        if (/godot.*4.*\.(exe|app)$/i.test(name) || /^godot(4)?(\.exe)?$/i.test(name) || /Godot.*4.*x86_64/i.test(name)) {
          found.push(path.join(dir, name));
        }
      }
    } catch { /* yoksay */ }
  }
  return found;
}

function candidates(): string[] {
  const home = os.homedir();
  const plat = process.platform;
  // PATH üzerinden çalışabilecek isimler her platformda denenir
  const onPath = ['godot4', 'godot', 'Godot', 'godot-4', 'godot4.3'];

  if (plat === 'win32') {
    const pf = process.env['ProgramFiles'] ?? 'C:\\Program Files';
    const pf86 = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)';
    const local = process.env['LOCALAPPDATA'] ?? path.join(home, 'AppData', 'Local');
    const globDirs = [
      path.join(pf, 'Godot'), path.join(pf86, 'Godot'),
      path.join(local, 'Programs', 'Godot'), path.join(local, 'Godot'),
      path.join(pf86, 'Steam', 'steamapps', 'common', 'Godot Engine'),
      path.join(home, 'Downloads'), path.join(home, 'Desktop'),
      path.join(local, 'Microsoft', 'WinGet', 'Links'),
      path.join(home, 'scoop', 'shims'),
    ];
    return [...onPath, ...globGodot(globDirs), ...existing([
      path.join(pf, 'Godot', 'godot.exe'),
    ])];
  }

  if (plat === 'darwin') {
    const globDirs = [path.join(home, 'Downloads'), path.join(home, 'Desktop'), path.join(home, 'Applications')];
    return [...onPath,
      ...existing([
        '/Applications/Godot.app/Contents/MacOS/Godot',
        path.join(home, 'Applications', 'Godot.app', 'Contents', 'MacOS', 'Godot'),
        '/opt/homebrew/bin/godot', '/usr/local/bin/godot',
      ]),
      ...globGodot(globDirs)];
  }

  // linux
  const globDirs = [path.join(home, 'Downloads'), path.join(home, '.local', 'bin'), '/opt/godot'];
  return [...onPath,
    ...existing(['/usr/bin/godot', '/usr/local/bin/godot', '/snap/bin/godot', path.join(home, '.local', 'bin', 'godot')]),
    ...globGodot(globDirs)];
}

export interface GodotDetection { path: string; version: string; }

/** İlk çalışan Godot 4.x'i döndürür, bulunamazsa null. */
export function locateGodot(): GodotDetection | null {
  const seen = new Set<string>();
  for (const cand of candidates()) {
    if (!cand || seen.has(cand)) continue;
    seen.add(cand);
    const ver = tryVersion(cand);
    if (ver) return { path: cand, version: ver };
  }
  return null;
}
