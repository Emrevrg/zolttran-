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
