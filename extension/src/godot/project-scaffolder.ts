/**
 * GodotProjectScaffolder
 * Creates a complete, runnable Godot 4 project directory structure from a GDD.
 */
import * as path from 'path';
import * as fs from 'fs';
import type { GameDesignDocument, Platform } from '../types/index.js';
import { godotBridge } from './godot-bridge.js';
import { sceneBuilder } from './scene-builder.js';
import { scriptGenerator } from './script-generator.js';
import { GAME_TEMPLATES } from '../agent/prompts/game-templates.js';

export interface ScaffoldOptions {
  outputPath: string;
  gdd: GameDesignDocument;
  godotVersion?: string;
}

export interface ScaffoldResult {
  projectPath: string;
  filesCreated: string[];
  warnings: string[];
}

export class GodotProjectScaffolder {
  async scaffold(opts: ScaffoldOptions): Promise<ScaffoldResult> {
    const { outputPath, gdd } = opts;
    const projectPath = path.join(outputPath, this.sanitizeName(gdd.title));
    const filesCreated: string[] = [];
    const warnings: string[] = [];

    // Create directory structure
    const dirs = [
      '',
      'scenes', 'scenes/ui', 'scenes/levels',
      'scripts', 'scripts/autoloads', 'scripts/enemies', 'scripts/ui',
      'assets', 'assets/sprites', 'assets/ui', 'assets/audio',
      'assets/shaders', 'assets/themes', 'assets/models',
      'tests', 'addons',
      '.godot',
    ];
    for (const dir of dirs) {
      fs.mkdirSync(path.join(projectPath, dir), { recursive: true });
    }

    // project.godot
    const projectGodot = this.buildProjectGodot(gdd);
    this.write(projectPath, 'project.godot', projectGodot, filesCreated);

    // .gitignore
    this.write(projectPath, '.gitignore', this.buildGitignore(), filesCreated);

    // export_presets.cfg
    this.write(projectPath, 'export_presets.cfg', this.buildExportPresets(gdd.targetPlatforms), filesCreated);

    // Main scene — kendine yeten oynanabilir sahne (oyuncu + dünya scripti)
    const tplScripts = GAME_TEMPLATES[gdd.gameType]?.baseScripts ?? {};
    const worldMap: Record<string, { script: string; node: string }> = {
      'bullet-heaven': { script: 'res://scripts/enemy_spawner.gd', node: 'EnemySpawner' },
      'roguelike':     { script: 'res://scripts/dungeon_generator.gd', node: 'DungeonGenerator' },
      'strategy':      { script: 'res://scripts/map_generator.gd', node: 'MapGenerator' },
    };
    const world = worldMap[gdd.gameType];
    const mainScene = sceneBuilder.buildPlayableMainScene({
      physics: gdd.techRequirements.physics === '3d' ? '3d' : '2d',
      playerScript: tplScripts['player.gd'] ? 'res://scripts/player.gd' : undefined,
      worldScript: world?.script,
      worldNodeName: world?.node,
      cameraScript: tplScripts['camera_controller.gd'] ? 'res://scripts/camera_controller.gd' : undefined,
    });
    this.write(projectPath, 'scenes/main.tscn', mainScene, filesCreated);

    // Player scene
    const playerScene = sceneBuilder.buildPlayerScene2D();
    this.write(projectPath, 'scenes/player.tscn', playerScene, filesCreated);

    // UI scene
    const uiScene = sceneBuilder.buildUiScene();
    this.write(projectPath, 'scenes/ui/ui.tscn', uiScene, filesCreated);

    // Autoload scripts
    scriptGenerator.setProjectPath(projectPath);
    const autoloads = scriptGenerator.generateAutoloads(gdd);
    for (const [rel, content] of Object.entries(autoloads)) {
      this.write(projectPath, rel, content, filesCreated);
    }

    // Scene scripts from GDD
    const sceneScripts = scriptGenerator.generateSceneScripts(gdd.scenes ?? []);
    for (const [rel, content] of Object.entries(sceneScripts)) {
      this.write(projectPath, rel, content, filesCreated);
    }

    // Template base scripts
    const template = GAME_TEMPLATES[gdd.gameType];
    if (template) {
      for (const [name, content] of Object.entries(template.baseScripts)) {
        const rel = `scripts/${name}`;
        if (!filesCreated.includes(path.join(projectPath, rel))) {
          this.write(projectPath, rel, content, filesCreated);
        }
      }
    }

    // Input map (default actions)
    // Already embedded in project.godot

    // GUT test framework stub
    this.write(projectPath, 'tests/.gitkeep', '', filesCreated);

    // README
    this.write(projectPath, 'README.md', this.buildReadme(gdd), filesCreated);

    return { projectPath, filesCreated, warnings };
  }

  // -----------------------------------------------------------------------
  // project.godot
  // -----------------------------------------------------------------------

  private buildProjectGodot(gdd: GameDesignDocument): string {
    const renderer = gdd.techRequirements.physics === '3d' ? 'forward_plus' : 'gl_compatibility';
    const autoloads = [
      '[autoload]',
      'GameManager="*res://autoloads/game_manager.gd"',
      'AudioManager="*res://autoloads/audio_manager.gd"',
      ...(gdd.techRequirements.saveSystem ? ['SaveManager="*res://autoloads/save_manager.gd"'] : []),
    ].join('\n');

    const inputMap = this.buildInputMap(gdd.techRequirements.physics);

    return `; Engine configuration file.
; It's best edited using the editor UI and not directly,
; since the parameters that go here are not all obvious.
;
; Format:
;   [section] ; section goes between []
;   param=value ; parameter names and values

config_version=5

[application]

config/name="${gdd.title}"
config/description="${gdd.description}"
config/version="0.1.0"
run/main_scene="res://scenes/main.tscn"
config/use_custom_user_dir=false
config/features=PackedStringArray("4.3", "${renderer === 'forward_plus' ? 'Forward Plus' : 'GL Compatibility'}")

[display]

window/size/viewport_width=1280
window/size/viewport_height=720
window/stretch/mode="canvas_items"
window/stretch/aspect="expand"

[rendering]

renderer/rendering_method="${renderer}"
${renderer === 'gl_compatibility' ? 'renderer/rendering_method.mobile="gl_compatibility"\nrenderer/rendering_method.web="gl_compatibility"' : ''}

[physics]

2d/default_gravity=980.0

${autoloads}

${inputMap}
`;
  }

  private buildInputMap(physicsType: string): string {
    if (physicsType === '3d') {
      return `[input]

move_forward={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":87,"key_label":0,"unicode":119,"location":0,"echo":false,"script":null)]
}
move_back={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":83,"key_label":0,"unicode":115,"location":0,"echo":false,"script":null)]
}
move_left={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":65,"key_label":0,"unicode":97,"location":0,"echo":false,"script":null)]
}
move_right={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":68,"key_label":0,"unicode":100,"location":0,"echo":false,"script":null)]
}
jump={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":32,"physical_keycode":0,"key_label":0,"unicode":32,"location":0,"echo":false,"script":null)]
}
shoot={
"deadzone": 0.5,
"events": [Object(InputEventMouseButton,"resource_local_to_scene":false,"device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"button_index":1,"factor":1.0,"button_mask":0,"position":Vector2(0, 0),"global_position":Vector2(0, 0),"tilt":Vector2(0, 0),"pen_inverted":false,"script":null)]
}`;
    }

    return `[input]

move_right={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":68,"key_label":0,"unicode":100,"location":0,"echo":false,"script":null), Object(InputEventJoypadMotion,"resource_local_to_scene":false,"device":-1,"axis":0,"axis_value":1.0,"script":null)]
}
move_left={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":65,"key_label":0,"unicode":97,"location":0,"echo":false,"script":null), Object(InputEventJoypadMotion,"resource_local_to_scene":false,"device":-1,"axis":0,"axis_value":-1.0,"script":null)]
}
move_up={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":87,"key_label":0,"unicode":119,"location":0,"echo":false,"script":null), Object(InputEventJoypadMotion,"resource_local_to_scene":false,"device":-1,"axis":1,"axis_value":-1.0,"script":null)]
}
move_down={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":83,"key_label":0,"unicode":115,"location":0,"echo":false,"script":null), Object(InputEventJoypadMotion,"resource_local_to_scene":false,"device":-1,"axis":1,"axis_value":1.0,"script":null)]
}
jump={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":32,"physical_keycode":0,"key_label":0,"unicode":32,"location":0,"echo":false,"script":null), Object(InputEventJoypadButton,"resource_local_to_scene":false,"device":-1,"button_index":0,"pressure":0.0,"pressed":false,"script":null)]
}
attack={
"deadzone": 0.5,
"events": [Object(InputEventMouseButton,"resource_local_to_scene":false,"device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"button_index":1,"factor":1.0,"button_mask":0,"position":Vector2(0, 0),"global_position":Vector2(0, 0),"tilt":Vector2(0, 0),"pen_inverted":false,"script":null), Object(InputEventJoypadButton,"resource_local_to_scene":false,"device":-1,"button_index":7,"pressure":0.0,"pressed":false,"script":null)]
}
pause={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":4194305,"physical_keycode":0,"key_label":0,"unicode":0,"location":0,"echo":false,"script":null)]
}
run={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":4194325,"key_label":0,"unicode":0,"location":0,"echo":false,"script":null)]
}
interact={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":69,"key_label":0,"unicode":101,"location":0,"echo":false,"script":null)]
}`;
  }

  // -----------------------------------------------------------------------
  // export_presets.cfg
  // -----------------------------------------------------------------------

  private buildExportPresets(platforms: Platform[]): string {
    const presets: string[] = [];
    let idx = 0;

    for (const platform of platforms) {
      const preset = this.buildPresetEntry(idx, platform);
      if (preset) { presets.push(preset); idx++; }
    }

    return presets.join('\n\n');
  }

  private buildPresetEntry(idx: number, platform: Platform): string | null {
    switch (platform) {
      case 'web':
        return `[preset.${idx}]\n\nname="Web"\nplatform="Web"\nrunnable=true\ndedicated_server=false\ncustom_features=""\nexport_filter="all_resources"\ninclude_filter=""\nexclude_filter=""\nexport_path="build/web/index.html"\nencrypt_pck=false\nencrypt_directory=false\nscript_export_mode=1\n\n[preset.${idx}.options]\n\ncustom_template/debug=""\ncustom_template/release=""\nvariant/extensions_support=false\nvram_texture_compression/for_desktop=true\nvram_texture_compression/for_mobile=false\nhtml/export_icon=true\nhtml/custom_html_shell=""\nhtml/head_include=""\nhtml/canvas_resize_policy=2\nhtml/focus_canvas_on_start=true\nhtml/experimental_virtual_keyboard=false\nprogressive_web_app/enabled=false`;

      case 'windows':
        return `[preset.${idx}]\n\nname="Windows Desktop"\nplatform="Windows Desktop"\nrunnable=true\ndedicated_server=false\ncustom_features=""\nexport_filter="all_resources"\ninclude_filter=""\nexclude_filter=""\nexport_path="build/windows/game.exe"\nencrypt_pck=false\nencrypt_directory=false\nscript_export_mode=1\n\n[preset.${idx}.options]\n\ncustom_template/debug=""\ncustom_template/release=""\ndebug/export_console_wrapper=1\nbinary_format/embed_pck=true\ntexture_format/bptc=true\ntexture_format/s3tc=true\ntexture_format/etc2=false\nbinary_format/architecture="x86_64"`;

      case 'android':
        return `[preset.${idx}]\n\nname="Android"\nplatform="Android"\nrunnable=true\ndedicated_server=false\ncustom_features=""\nexport_filter="all_resources"\ninclude_filter=""\nexclude_filter=""\nexport_path="build/android/game.apk"\nencrypt_pck=false\nencrypt_directory=false\nscript_export_mode=1\n\n[preset.${idx}.options]\n\ncustom_template/debug=""\ncustom_template/release=""\ngradlebuild/use_gradle_build=false\ngradlebuild/export_format=0\ngradlebuild/min_sdk=21\ngradlebuild/target_sdk=33\npackager/unique_name="com.zolttran.game"\npackager/name="Game"\npackager/icon=""\npackager/signed=false\narchitectures/armv7=false\narchitectures/arm64_v8a=true`;

      case 'linux':
        return `[preset.${idx}]\n\nname="Linux/X11"\nplatform="Linux/X11"\nrunnable=true\ndedicated_server=false\ncustom_features=""\nexport_filter="all_resources"\ninclude_filter=""\nexclude_filter=""\nexport_path="build/linux/game.x86_64"\nencrypt_pck=false\nencrypt_directory=false\nscript_export_mode=1\n\n[preset.${idx}.options]\n\nbinary_format/architecture="x86_64"`;

      case 'macos':
        return `[preset.${idx}]\n\nname="macOS"\nplatform="macOS"\nrunnable=false\ndedicated_server=false\ncustom_features=""\nexport_filter="all_resources"\ninclude_filter=""\nexclude_filter=""\nexport_path="build/macos/game.dmg"\nencrypt_pck=false\nencrypt_directory=false\nscript_export_mode=1\n\n[preset.${idx}.options]\n\nbinary_format/architecture="universal"`;

      case 'ios':
        return `[preset.${idx}]\n\nname="iOS"\nplatform="iOS"\nrunnable=false\ndedicated_server=false\ncustom_features=""\nexport_filter="all_resources"\ninclude_filter=""\nexclude_filter=""\nexport_path="build/ios/game.ipa"\nencrypt_pck=false\nencrypt_directory=false\nscript_export_mode=1\n\n[preset.${idx}.options]\n\napplication/app_store_team_id=""\napplication/bundle_identifier="com.zolttran.game"\napplication/signature=""\napplication/short_version="1.0"\napplication/version="1.0"\narchitectures/arm64=true`;

      default: return null;
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private buildGitignore(): string {
    return `# Godot 4 ignores
.godot/
*.translation
*.import
export_credentials.cfg
build/
*.tmp
.omniforge_*.gd
`;
  }

  private buildReadme(gdd: GameDesignDocument): string {
    return `# ${gdd.title}

${gdd.description}

## Game Type
${gdd.gameType}

## Target Platforms
${gdd.targetPlatforms?.join(', ')}

## Core Mechanics
${gdd.mechanics?.filter((m) => m.priority === 'core').map((m) => `- **${m.name}**: ${m.description}`).join('\n')}

## Getting Started

1. Open this folder in Godot 4.3+
2. Run the project with F5
3. Export for your target platform via Project → Export

*Generated by OmniForge AI Game Studio*
`;
  }

  private write(base: string, rel: string, content: string, log: string[]): void {
    const full = path.join(base, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf8');
    log.push(full);
  }

  private sanitizeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_').slice(0, 40);
  }
}

export const projectScaffolder = new GodotProjectScaffolder();
