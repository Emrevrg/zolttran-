/**
 * GodotAssetManager
 * Manages game assets: imports, generates placeholders, and tracks the asset library.
 */
import * as path from 'path';
import * as fs from 'fs';
import type { GodotAsset } from '../types/index.js';
import { godotMcp } from './mcp-server.js';
import { godotBridge } from './godot-bridge.js';

export class GodotAssetManager {
  private projectPath: string;
  private assets: GodotAsset[] = [];

  constructor(projectPath = '') {
    this.projectPath = projectPath;
  }

  setProjectPath(p: string): void {
    this.projectPath = p;
    this.scanAssets();
  }

  // -----------------------------------------------------------------------
  // Scan
  // -----------------------------------------------------------------------

  scanAssets(): GodotAsset[] {
    this.assets = [];
    this.scanDir(path.join(this.projectPath, 'assets'));
    return this.assets;
  }

  getAssets(type?: GodotAsset['type']): GodotAsset[] {
    return type ? this.assets.filter((a) => a.type === type) : [...this.assets];
  }

  // -----------------------------------------------------------------------
  // Import
  // -----------------------------------------------------------------------

  async importAsset(sourcePath: string, targetRelativePath: string): Promise<void> {
    const targetPath = path.join(this.projectPath, targetRelativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);

    const godotPath = targetRelativePath.startsWith('res://')
      ? targetRelativePath
      : `res://${targetRelativePath.replace(/\\/g, '/')}`;

    if (godotMcp.isConnected()) {
      const ext = path.extname(sourcePath).toLowerCase().slice(1);
      const type = this.extToType(ext);
      await godotMcp.assetImport(godotPath, godotPath, type);
    }

    this.assets.push({
      path: targetPath,
      type: this.extToType(path.extname(sourcePath).toLowerCase().slice(1)),
      size: fs.statSync(targetPath).size,
    });
  }

  // -----------------------------------------------------------------------
  // Placeholder generation (SVG-based, no external deps)
  // -----------------------------------------------------------------------

  generatePlaceholderSprite(name: string, width = 32, height = 32, color = '#6366f1'): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="${color}" rx="4"/>
  <text x="${width/2}" y="${height/2 + 4}" text-anchor="middle" font-size="8" fill="white">${name.slice(0, 6)}</text>
</svg>`;
    const svgPath = path.join(this.projectPath, 'assets', 'sprites', `${name}_placeholder.svg`);
    fs.mkdirSync(path.dirname(svgPath), { recursive: true });
    fs.writeFileSync(svgPath, svg, 'utf8');
    return svgPath;
  }

  generatePlaceholderAudio(name: string, durationSec = 1): string {
    // Write a minimal valid WAV (44 bytes header, silence)
    const sampleRate = 22050;
    const numSamples = sampleRate * durationSec;
    const dataSize = numSamples * 2; // 16-bit mono
    const buffer = Buffer.alloc(44 + dataSize, 0);

    // RIFF header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);      // chunk size
    buffer.writeUInt16LE(1, 20);       // PCM
    buffer.writeUInt16LE(1, 22);       // mono
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
    buffer.writeUInt16LE(2, 32);       // block align
    buffer.writeUInt16LE(16, 34);      // bits per sample
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    const wavPath = path.join(this.projectPath, 'assets', 'audio', `${name}_placeholder.wav`);
    fs.mkdirSync(path.dirname(wavPath), { recursive: true });
    fs.writeFileSync(wavPath, buffer);
    return wavPath;
  }

  // -----------------------------------------------------------------------
  // Write asset content (from ArtistAgent output)
  // -----------------------------------------------------------------------

  writeShader(relativePath: string, content: string): string {
    const full = path.join(this.projectPath, relativePath);
    godotBridge.writeFile(full, content);
    return full;
  }

  writeTheme(relativePath: string, content: string): string {
    const full = path.join(this.projectPath, relativePath);
    godotBridge.writeFile(full, content);
    return full;
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private scanDir(dir: string): void {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        this.scanDir(full);
      } else {
        const ext = path.extname(entry.name).toLowerCase().slice(1);
        this.assets.push({
          path: full,
          type: this.extToType(ext),
          size: fs.statSync(full).size,
        });
      }
    }
  }

  private extToType(ext: string): GodotAsset['type'] {
    switch (ext) {
      case 'png': case 'jpg': case 'jpeg': case 'webp': case 'svg': return 'texture';
      case 'glb': case 'gltf': case 'obj': case 'fbx': return 'model';
      case 'ogg': case 'wav': case 'mp3': return 'sound';
      case 'gdshader': case 'glsl': return 'shader';
      case 'tres': case 'res': return 'material';
      case 'tscn': return 'scene';
      case 'gd': case 'cs': return 'script';
      default: return 'other';
    }
  }
}

export const assetManager = new GodotAssetManager();
