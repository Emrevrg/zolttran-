/**
 * GodotScriptGenerator
 * Generates GDScript source files from structured specs and writes them to disk.
 */
import * as path from 'path';
import type { GameDesignDocument, SceneSpec } from '../types/index.js';
import { godotBridge } from './godot-bridge.js';

export interface ScriptSpec {
  name: string;
  className: string;
  extends: string;
  signals?: string[];
  exports?: ExportVar[];
  vars?: VarDef[];
  methods?: MethodDef[];
  content?: string; // raw override
}

interface ExportVar { name: string; type: string; defaultValue?: string; hint?: string }
interface VarDef    { name: string; type: string; defaultValue?: string; comment?: string }
interface MethodDef { name: string; params?: string; returnType?: string; body: string; comment?: string }

export class GodotScriptGenerator {
  private projectPath: string;

  constructor(projectPath = '') {
    this.projectPath = projectPath;
  }

  setProjectPath(p: string): void { this.projectPath = p; }

  // -----------------------------------------------------------------------
  // Generate from spec
  // -----------------------------------------------------------------------

  generate(spec: ScriptSpec): string {
    if (spec.content) return spec.content;

    const lines: string[] = [];

    lines.push(`class_name ${spec.className}`);
    lines.push(`extends ${spec.extends}`);
    lines.push('');

    // Signals
    if (spec.signals?.length) {
      for (const sig of spec.signals) lines.push(`signal ${sig}`);
      lines.push('');
    }

    // Exports
    if (spec.exports?.length) {
      for (const exp of spec.exports) {
        const hint = exp.hint ? `, ${exp.hint}` : '';
        const def  = exp.defaultValue !== undefined ? ` = ${exp.defaultValue}` : '';
        lines.push(`@export${hint} var ${exp.name}: ${exp.type}${def}`);
      }
      lines.push('');
    }

    // Vars
    if (spec.vars?.length) {
      for (const v of spec.vars) {
        if (v.comment) lines.push(`## ${v.comment}`);
        const def = v.defaultValue !== undefined ? ` = ${v.defaultValue}` : '';
        lines.push(`var ${v.name}: ${v.type}${def}`);
      }
      lines.push('');
    }

    // Methods
    for (const m of spec.methods ?? []) {
      if (m.comment) lines.push(`\n## ${m.comment}`);
      const params = m.params ?? '';
      const ret = m.returnType ? ` -> ${m.returnType}` : '';
      lines.push(`func ${m.name}(${params})${ret}:`);
      // Indent body
      const bodyLines = m.body.split('\n');
      for (const bl of bodyLines) {
        lines.push(bl ? `\t${bl}` : '');
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  // -----------------------------------------------------------------------
  // Write to disk
  // -----------------------------------------------------------------------

  writeScript(relativePath: string, content: string): string {
    const fullPath = path.join(this.projectPath, relativePath);
    godotBridge.writeFile(fullPath, content);
    return fullPath;
  }

  // -----------------------------------------------------------------------
  // Autoload stubs
  // -----------------------------------------------------------------------

  generateAutoloads(gdd: GameDesignDocument): Record<string, string> {
    const autoloads: Record<string, string> = {};

    // GameManager — always present
    autoloads['autoloads/game_manager.gd'] = this.generate({
      name: 'game_manager.gd',
      className: 'GameManager',
      extends: 'Node',
      signals: ['game_started', 'game_paused', 'game_over'],
      exports: [
        { name: 'initial_scene', type: 'PackedScene' },
      ],
      vars: [
        { name: 'is_paused', type: 'bool', defaultValue: 'false' },
        { name: 'score', type: 'int', defaultValue: '0' },
        { name: 'high_score', type: 'int', defaultValue: '0' },
      ],
      methods: [
        {
          name: '_ready', returnType: 'void',
          body: 'print("[GameManager] Ready")',
        },
        {
          name: 'start_game', returnType: 'void',
          body: 'is_paused = false\nif initial_scene:\n\tget_tree().change_scene_to_packed(initial_scene)\ngame_started.emit()',
        },
        {
          name: 'pause_game', returnType: 'void',
          body: 'is_paused = !is_paused\nget_tree().paused = is_paused\ngame_paused.emit()',
        },
        {
          name: 'end_game', returnType: 'void',
          body: 'if score > high_score:\n\thigh_score = score\ngame_over.emit()',
        },
        {
          name: 'add_score', params: 'amount: int', returnType: 'void',
          body: 'score += amount',
        },
      ],
    });

    // AudioManager
    autoloads['autoloads/audio_manager.gd'] = this.generate({
      name: 'audio_manager.gd',
      className: 'AudioManager',
      extends: 'Node',
      exports: [
        { name: 'bgm_volume_db', type: 'float', defaultValue: '0.0', hint: 'range(-80.0, 6.0)' },
        { name: 'sfx_volume_db', type: 'float', defaultValue: '0.0', hint: 'range(-80.0, 6.0)' },
      ],
      vars: [
        { name: '_bgm_player', type: 'AudioStreamPlayer' },
        { name: '_sfx_players', type: 'Array[AudioStreamPlayer]', defaultValue: '[]' },
      ],
      methods: [
        {
          name: '_ready', returnType: 'void',
          body: '_bgm_player = AudioStreamPlayer.new()\n_bgm_player.bus = &"BGM"\nadd_child(_bgm_player)',
        },
        {
          name: 'play_bgm', params: 'stream: AudioStream', returnType: 'void',
          body: '_bgm_player.stream = stream\n_bgm_player.volume_db = bgm_volume_db\n_bgm_player.play()',
        },
        {
          name: 'play_sfx', params: 'stream: AudioStream, volume_db: float = 0.0', returnType: 'void',
          body: 'var player := AudioStreamPlayer.new()\nplayer.stream = stream\nplayer.volume_db = sfx_volume_db + volume_db\nadd_child(player)\nplayer.play()\nawait player.finished\nplayer.queue_free()',
        },
        {
          name: 'stop_bgm', returnType: 'void',
          body: '_bgm_player.stop()',
        },
      ],
    });

    // SaveManager (if needed)
    if (gdd.techRequirements.saveSystem) {
      autoloads['autoloads/save_manager.gd'] = this.generate({
        name: 'save_manager.gd',
        className: 'SaveManager',
        extends: 'Node',
        vars: [
          { name: 'SAVE_PATH', type: 'String', defaultValue: '"user://save.json"' },
          { name: '_data', type: 'Dictionary', defaultValue: '{}' },
        ],
        methods: [
          {
            name: 'save', returnType: 'void',
            body: 'var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)\nif file:\n\tfile.store_string(JSON.stringify(_data))\n\tfile.close()',
          },
          {
            name: 'load_data', returnType: 'void',
            body: 'if not FileAccess.file_exists(SAVE_PATH):\n\treturn\nvar file := FileAccess.open(SAVE_PATH, FileAccess.READ)\nif file:\n\t_data = JSON.parse_string(file.get_as_text()) as Dictionary\n\tfile.close()',
          },
          {
            name: 'set_value', params: 'key: String, value: Variant', returnType: 'void',
            body: '_data[key] = value',
          },
          {
            name: 'get_value', params: 'key: String, default: Variant = null', returnType: 'Variant',
            body: 'return _data.get(key, default)',
          },
        ],
      });
    }

    return autoloads;
  }

  // -----------------------------------------------------------------------
  // Scene-based script stubs
  // -----------------------------------------------------------------------

  generateSceneScripts(scenes: SceneSpec[]): Record<string, string> {
    const scripts: Record<string, string> = {};
    for (const scene of scenes) {
      for (const scriptName of scene.scripts) {
        if (scripts[scriptName]) continue;
        const className = scriptName
          .replace(/\.gd$/, '')
          .replace(/(?:^|_)([a-z])/g, (_, c: string) => c.toUpperCase());

        scripts[`scripts/${scriptName}`] = this.generate({
          name: scriptName,
          className,
          extends: this.inferNodeType(scene.type),
          methods: [
            { name: '_ready', returnType: 'void', body: 'pass' },
          ],
        });
      }
    }
    return scripts;
  }

  private inferNodeType(sceneType: SceneSpec['type']): string {
    const map: Record<SceneSpec['type'], string> = {
      player: 'CharacterBody2D',
      enemy: 'CharacterBody2D',
      ui: 'Control',
      main: 'Node2D',
      level: 'Node2D',
      environment: 'Node2D',
      npc: 'CharacterBody2D',
    };
    return map[sceneType] ?? 'Node2D';
  }
}

export const scriptGenerator = new GodotScriptGenerator();
