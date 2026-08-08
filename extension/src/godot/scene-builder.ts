/**
 * GodotSceneBuilder
 * Produces .tscn text files from structured descriptions without requiring
 * a running Godot instance.
 */

export interface NodeDef {
  name: string;
  type: string;
  parent?: string;
  script?: string;
  properties?: Record<string, SceneValue>;
  children?: NodeDef[];
}

type SceneValue = string | number | boolean | null | SceneValue[];

export class GodotSceneBuilder {
  private nodes: NodeDef[] = [];
  private externalResources: Array<{ id: number; type: string; path: string }> = [];
  private subResources: Array<{ id: number; type: string; props: Record<string, SceneValue> }> = [];
  private nextExtId = 1;
  private nextSubId = 1;

  reset(): this {
    this.nodes = [];
    this.externalResources = [];
    this.subResources = [];
    this.nextExtId = 1;
    this.nextSubId = 1;
    return this;
  }

  addNode(node: NodeDef): this {
    this.nodes.push(node);
    return this;
  }

  addExternalResource(type: string, path: string): number {
    const existing = this.externalResources.find((r) => r.path === path);
    if (existing) return existing.id;
    const id = this.nextExtId++;
    this.externalResources.push({ id, type, path });
    return id;
  }

  addSubResource(type: string, props: Record<string, SceneValue> = {}): number {
    const id = this.nextSubId++;
    this.subResources.push({ id, type, props });
    return id;
  }

  // -----------------------------------------------------------------------
  // Build .tscn text
  // -----------------------------------------------------------------------

  build(): string {
    const lines: string[] = [];

    // Header
    const nodeCount = this.countNodes(this.nodes);
    lines.push(`[gd_scene load_steps=${2 + this.externalResources.length + this.subResources.length} format=3 uid="uid://omniforge${Date.now()}"]`);
    lines.push('');

    // External resources
    for (const ext of this.externalResources) {
      lines.push(`[ext_resource type="${ext.type}" path="${ext.path}" id="${ext.id}_${this.sanitize(ext.path)}"]`);
    }
    if (this.externalResources.length) lines.push('');

    // Sub-resources
    for (const sub of this.subResources) {
      lines.push(`[sub_resource type="${sub.type}" id="${sub.type}_${sub.id}"]`);
      for (const [k, v] of Object.entries(sub.props)) {
        lines.push(`${k} = ${this.serializeValue(v)}`);
      }
      lines.push('');
    }

    // Nodes
    this.emitNodes(lines, this.nodes, null);

    return lines.join('\n');
  }

  // -----------------------------------------------------------------------
  // Preset scenes
  // -----------------------------------------------------------------------

  buildMainScene(sceneName: string): string {
    return this.reset()
      .addNode({ name: sceneName, type: 'Node2D', properties: {} })
      .build();
  }

  /**
   * Kendine yeten, oynanabilir ana sahne üretir: oyuncu (görsel + collision +
   * kamera + script) ve varsa tür-özel dünya scripti (spawner/generator).
   * Godot çalıştırılmadan doğru .tscn metni üretir.
   */
  buildPlayableMainScene(opts: {
    physics: '2d' | '3d';
    worldScript?: string;      // res://scripts/xxx.gd
    worldNodeName?: string;
  }): string {
    const uid = `uid://zolt${Date.now().toString(36)}`;
    return opts.physics === '3d' ? this.main3D(uid, opts) : this.main2D(uid, opts);
  }

  private main2D(uid: string, opts: { worldScript?: string; worldNodeName?: string }): string {
    const exts: string[] = [`[ext_resource type="Script" path="res://scripts/player.gd" id="1_player"]`];
    if (opts.worldScript) exts.push(`[ext_resource type="Script" path="${opts.worldScript}" id="2_world"]`);
    const loadSteps = exts.length + 2; // ext + 1 subresource + scene
    return `[gd_scene load_steps=${loadSteps} format=3 uid="${uid}"]

${exts.join('\n')}

[sub_resource type="RectangleShape2D" id="RectangleShape2D_p"]
size = Vector2(32, 48)

[node name="Main" type="Node2D"]

[node name="Ground" type="StaticBody2D" parent="."]
position = Vector2(0, 620)

[node name="GroundShape" type="CollisionShape2D" parent="Ground"]
shape = SubResource("RectangleShape2D_p")

[node name="GroundVisual" type="ColorRect" parent="Ground"]
offset_left = -2000.0
offset_top = -16.0
offset_right = 2000.0
offset_bottom = 16.0
color = Color(0.13, 0.14, 0.2, 1)
${opts.worldScript ? `
[node name="${opts.worldNodeName ?? 'World'}" type="Node2D" parent="."]
script = ExtResource("2_world")
` : ''}
[node name="Player" type="CharacterBody2D" parent="."]
position = Vector2(480, 300)
script = ExtResource("1_player")

[node name="Visual" type="ColorRect" parent="Player"]
offset_left = -16.0
offset_top = -24.0
offset_right = 16.0
offset_bottom = 24.0
color = Color(0.45, 0.72, 1, 1)

[node name="CollisionShape2D" type="CollisionShape2D" parent="Player"]
shape = SubResource("RectangleShape2D_p")

[node name="Camera2D" type="Camera2D" parent="Player"]
`;
  }

  private main3D(uid: string, opts: { worldScript?: string; worldNodeName?: string }): string {
    const exts: string[] = [`[ext_resource type="Script" path="res://scripts/player.gd" id="1_player"]`];
    if (opts.worldScript) exts.push(`[ext_resource type="Script" path="${opts.worldScript}" id="2_world"]`);
    const loadSteps = exts.length + 4; // ext + 3 subresources + scene
    return `[gd_scene load_steps=${loadSteps} format=3 uid="${uid}"]

${exts.join('\n')}

[sub_resource type="BoxMesh" id="BoxMesh_floor"]
size = Vector3(40, 1, 40)

[sub_resource type="BoxShape3D" id="BoxShape3D_floor"]
size = Vector3(40, 1, 40)

[sub_resource type="CapsuleMesh" id="CapsuleMesh_p"]

[sub_resource type="CapsuleShape3D" id="CapsuleShape3D_p"]

[node name="Main" type="Node3D"]

[node name="DirectionalLight3D" type="DirectionalLight3D" parent="."]
transform = Transform3D(0.7, -0.5, 0.5, 0, 0.7, 0.7, -0.7, -0.5, 0.5, 0, 8, 0)
shadow_enabled = true

[node name="Floor" type="StaticBody3D" parent="."]

[node name="FloorMesh" type="MeshInstance3D" parent="Floor"]
mesh = SubResource("BoxMesh_floor")

[node name="FloorShape" type="CollisionShape3D" parent="Floor"]
shape = SubResource("BoxShape3D_floor")
${opts.worldScript ? `
[node name="${opts.worldNodeName ?? 'World'}" type="Node3D" parent="."]
script = ExtResource("2_world")
` : ''}
[node name="Player" type="CharacterBody3D" parent="."]
transform = Transform3D(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 2, 0)
script = ExtResource("1_player")

[node name="PlayerMesh" type="MeshInstance3D" parent="Player"]
mesh = SubResource("CapsuleMesh_p")

[node name="CollisionShape3D" type="CollisionShape3D" parent="Player"]
shape = SubResource("CapsuleShape3D_p")

[node name="Head" type="Node3D" parent="Player"]
transform = Transform3D(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0.6, 0)

[node name="Camera3D" type="Camera3D" parent="Player/Head"]
`;
  }

  buildPlayerScene2D(scriptResId?: number): string {
    const scriptProp = scriptResId !== undefined
      ? { script: `ExtResource("${scriptResId}_player.gd")` }
      : {};

    return this.reset()
      .addNode({
        name: 'Player',
        type: 'CharacterBody2D',
        properties: { ...scriptProp },
        children: [
          {
            name: 'CollisionShape2D',
            type: 'CollisionShape2D',
            properties: {},
          },
          {
            name: 'AnimatedSprite2D',
            type: 'AnimatedSprite2D',
            properties: {},
          },
          {
            name: 'HurtBox',
            type: 'Area2D',
            children: [{ name: 'CollisionShape2D', type: 'CollisionShape2D' }],
          },
        ],
      })
      .build();
  }

  buildUiScene(): string {
    return this.reset()
      .addNode({
        name: 'UI',
        type: 'CanvasLayer',
        children: [
          {
            name: 'HUD',
            type: 'Control',
            properties: {
              'layout_mode': 3,
              'anchors_preset': 15,
            },
            children: [
              { name: 'HealthBar', type: 'ProgressBar' },
              { name: 'ScoreLabel', type: 'Label' },
            ],
          },
          {
            name: 'MainMenu',
            type: 'Control',
            properties: { visible: false },
            children: [
              { name: 'Background', type: 'Panel' },
              { name: 'VBoxContainer', type: 'VBoxContainer', children: [
                { name: 'Title', type: 'Label', properties: { text: 'Game Title' } },
                { name: 'PlayButton', type: 'Button', properties: { text: 'Play' } },
                { name: 'QuitButton', type: 'Button', properties: { text: 'Quit' } },
              ]},
            ],
          },
          {
            name: 'PauseMenu',
            type: 'Control',
            properties: { visible: false },
          },
          {
            name: 'GameOver',
            type: 'Control',
            properties: { visible: false },
          },
        ],
      })
      .build();
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private emitNodes(lines: string[], nodes: NodeDef[], parentPath: string | null): void {
    for (const node of nodes) {
      const currentPath = parentPath === null ? '.' : (parentPath === '.' ? node.name : `${parentPath}/${node.name}`);
      const parentAttr = parentPath === null ? '' : ` parent="${parentPath}"`;
      lines.push(`[node name="${node.name}" type="${node.type}"${parentAttr}]`);
      if (node.script) {
        lines.push(`script = ExtResource("${node.script}")`);
      }
      for (const [k, v] of Object.entries(node.properties ?? {})) {
        lines.push(`${k} = ${this.serializeValue(v)}`);
      }
      lines.push('');
      this.emitNodes(lines, node.children ?? [], currentPath);
    }
  }

  private serializeValue(v: SceneValue): string {
    if (v === null)             return 'null';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'number')  return String(v);
    if (typeof v === 'string')  return v.startsWith('ExtResource') || v.startsWith('SubResource') ? v : `"${v}"`;
    if (Array.isArray(v))       return `[${v.map((i) => this.serializeValue(i)).join(', ')}]`;
    return String(v);
  }

  private sanitize(s: string): string {
    return s.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 20);
  }

  private countNodes(nodes: NodeDef[]): number {
    return nodes.reduce((acc, n) => acc + 1 + this.countNodes(n.children ?? []), 0);
  }
}

export const sceneBuilder = new GodotSceneBuilder();
