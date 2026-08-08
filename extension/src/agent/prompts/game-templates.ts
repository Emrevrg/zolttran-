/**
 * OmniForge Game Templates — 7 pre-built game archetypes.
 */
import type { GameTemplate, GameType } from '../../types/index.js';

export const GAME_TEMPLATES: Record<GameType, GameTemplate> = {
  'bullet-heaven': {
    id: 'bullet-heaven',
    name: 'Bullet Heaven',
    description: 'Vampire Survivors-style auto-shooting survival game',
    thumbnail: 'templates/bullet-heaven.png',
    features: ['Auto-shooting weapons', 'XP & level up', 'Enemy waves', 'Weapon upgrades', 'Boss encounters'],
    defaultGdd: {
      gameType: 'bullet-heaven',
      genre: ['action', 'roguelite', 'survival'],
      targetPlatforms: ['web', 'windows', 'android'],
      mechanics: [
        { name: 'Auto-Attack', description: 'Weapons fire automatically toward nearest enemy', priority: 'core' },
        { name: 'XP System', description: 'Enemies drop XP gems, collecting levels you up', priority: 'core' },
        { name: 'Weapon Upgrade', description: 'On level up, choose from 3 random weapon upgrades', priority: 'core' },
        { name: 'Time Limit', description: '30-minute survival runs with escalating difficulty', priority: 'secondary' },
        { name: 'Passive Items', description: 'Stat-boosting items with synergies', priority: 'secondary' },
      ],
      techRequirements: { physics: '2d', multiplayer: false, saveSystem: true, localisation: false, minGodotVersion: '4.3' },
    },
    sceneStructure: [
      'main.tscn → Node2D (Main)',
      '  ├── World → Node2D',
      '  │   ├── TileMap (ground)',
      '  │   ├── EnemySpawner → Node2D',
      '  │   └── XpGems → Node2D',
      '  ├── player.tscn → CharacterBody2D (Player)',
      '  │   ├── CollisionShape2D',
      '  │   ├── AnimatedSprite2D',
      '  │   ├── WeaponManager → Node2D',
      '  │   └── HurtBox → Area2D',
      '  ├── enemy.tscn → CharacterBody2D (Enemy)',
      '  └── ui.tscn → CanvasLayer (UI)',
      '      ├── HUD → Control',
      '      ├── LevelUpScreen → Control',
      '      └── GameOverScreen → Control',
    ],
    baseScripts: {
      'player.gd': `class_name Player
extends CharacterBody2D

signal died
signal leveled_up(new_level: int)

@export var max_health: float = 100.0
@export var move_speed: float = 150.0
@export var xp_to_next_level: float = 10.0

var health: float
var xp: float = 0.0
var level: int = 1
var weapons: Array[Weapon] = []

func _ready() -> void:
\thealth = max_health

func _physics_process(delta: float) -> void:
\t_handle_movement(delta)

func _handle_movement(delta: float) -> void:
\tvar direction := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
\tvelocity = direction * move_speed
\tmove_and_slide()

func take_damage(amount: float) -> void:
\thealth -= amount
\tif health <= 0.0:
\t\thealth = 0.0
\t\tdied.emit()

func collect_xp(amount: float) -> void:
\txp += amount
\tif xp >= xp_to_next_level:
\t\txp -= xp_to_next_level
\t\txp_to_next_level *= 1.2
\t\tlevel += 1
\t\tleveled_up.emit(level)
`,
    },
  },

  platformer: {
    id: 'platformer',
    name: '2D Platformer',
    description: 'Classic side-scrolling platformer with run, jump, and combat',
    thumbnail: 'templates/platformer.png',
    features: ['Run & jump physics', 'Wall jump', 'Double jump', 'Enemy AI', 'Collectibles', 'Checkpoint system'],
    defaultGdd: {
      gameType: 'platformer',
      genre: ['platformer', 'action', 'adventure'],
      targetPlatforms: ['web', 'windows', 'android'],
      mechanics: [
        { name: 'Jump', description: 'Variable-height jump with coyote time and jump buffer', priority: 'core' },
        { name: 'Wall Slide', description: 'Slide down walls and wall-jump', priority: 'core' },
        { name: 'Combat', description: 'Melee attack with knockback', priority: 'secondary' },
        { name: 'Collectibles', description: 'Coins and power-ups scattered through levels', priority: 'secondary' },
      ],
      techRequirements: { physics: '2d', multiplayer: false, saveSystem: true, localisation: false, minGodotVersion: '4.3' },
    },
    sceneStructure: [
      'main.tscn → Node2D',
      'levels/level_01.tscn → Node2D',
      '  ├── TileMapLayer (ground)',
      '  ├── TileMapLayer (background)',
      '  ├── Enemies → Node2D',
      '  └── Collectibles → Node2D',
      'player.tscn → CharacterBody2D',
      '  ├── CollisionShape2D',
      '  ├── AnimatedSprite2D',
      '  ├── CoyoteTimer → Timer',
      '  └── JumpBufferTimer → Timer',
    ],
    baseScripts: {
      'player.gd': `class_name Player
extends CharacterBody2D

signal health_changed(new_health: float)
signal died

@export var max_health: float = 3.0
@export var move_speed: float = 200.0
@export var jump_velocity: float = -400.0
@export var gravity: float = 980.0
@export var coyote_time: float = 0.1
@export var jump_buffer_time: float = 0.1

var health: float
var coyote_timer: float = 0.0
var jump_buffer_timer: float = 0.0
var was_on_floor: bool = false

func _ready() -> void:
\thealth = max_health

func _physics_process(delta: float) -> void:
\tif not is_on_floor():
\t\tvelocity.y += gravity * delta
\t\tif was_on_floor:
\t\t\tcoyote_timer = coyote_time
\t
\twas_on_floor = is_on_floor()
\t
\tif coyote_timer > 0.0:
\t\tcoyote_timer -= delta
\t
\tif Input.is_action_just_pressed("jump"):
\t\tjump_buffer_timer = jump_buffer_time
\tif jump_buffer_timer > 0.0:
\t\tjump_buffer_timer -= delta
\t\tif is_on_floor() or coyote_timer > 0.0:
\t\t\tvelocity.y = jump_velocity
\t\t\tjump_buffer_timer = 0.0
\t\t\tcoyote_timer = 0.0
\t
\tvar direction := Input.get_axis("ui_left", "ui_right")
\tvelocity.x = move_toward(velocity.x, direction * move_speed, move_speed * 10 * delta)
\tmove_and_slide()
`,
    },
  },

  'top-down-rpg': {
    id: 'top-down-rpg',
    name: 'Top-Down RPG',
    description: 'Zelda-style top-down adventure with combat and exploration',
    thumbnail: 'templates/top-down-rpg.png',
    features: ['8-directional movement', 'Sword combat', 'NPC dialogue', 'Inventory system', 'World map', 'Quest system'],
    defaultGdd: {
      gameType: 'top-down-rpg',
      genre: ['rpg', 'adventure', 'action'],
      targetPlatforms: ['web', 'windows', 'android'],
      mechanics: [
        { name: 'Movement', description: '8-directional movement with run button', priority: 'core' },
        { name: 'Combat', description: 'Sword swings with hitboxes and iframes', priority: 'core' },
        { name: 'Dialogue', description: 'NPC conversation system with branching', priority: 'secondary' },
        { name: 'Inventory', description: 'Item pickup and equipment system', priority: 'secondary' },
      ],
      techRequirements: { physics: '2d', multiplayer: false, saveSystem: true, localisation: true, minGodotVersion: '4.3' },
    },
    sceneStructure: [
      'world/overworld.tscn → Node2D',
      '  ├── TileMapLayer (ground)',
      '  ├── TileMapLayer (walls)',
      '  ├── NPCs → Node2D',
      '  └── Interactables → Node2D',
      'player.tscn → CharacterBody2D',
      'ui/hud.tscn → CanvasLayer',
      'ui/dialogue.tscn → CanvasLayer',
      'ui/inventory.tscn → CanvasLayer',
    ],
    baseScripts: {},
  },

  fps: {
    id: 'fps',
    name: 'First-Person Shooter',
    description: '3D FPS with shooting, enemy AI, and level exploration',
    thumbnail: 'templates/fps.png',
    features: ['Mouse-look camera', 'Shooting with hitscan', 'Enemy AI with NavMesh', 'Weapon switching', 'Health & ammo'],
    defaultGdd: {
      gameType: 'fps',
      genre: ['fps', 'action', 'shooter'],
      targetPlatforms: ['windows', 'linux', 'macos'],
      mechanics: [
        { name: 'FPS Movement', description: 'WASD movement with mouse look', priority: 'core' },
        { name: 'Shooting', description: 'Hitscan + projectile weapons', priority: 'core' },
        { name: 'Enemy AI', description: 'NavMesh-based enemy pathfinding and shooting', priority: 'core' },
        { name: 'Health System', description: 'Health pickups, damage indicators', priority: 'secondary' },
      ],
      techRequirements: { physics: '3d', multiplayer: false, saveSystem: false, localisation: false, minGodotVersion: '4.3' },
    },
    sceneStructure: [
      'levels/level_01.tscn → Node3D',
      '  ├── WorldEnvironment',
      '  ├── DirectionalLight3D',
      '  ├── CSGBox3D (level geometry)',
      '  ├── NavigationRegion3D',
      '  └── EnemySpawns → Node3D',
      'player.tscn → CharacterBody3D',
      '  ├── CollisionShape3D',
      '  ├── Head → Node3D',
      '  │   └── Camera3D',
      '  └── WeaponHolder → Node3D',
    ],
    baseScripts: {
      'player.gd': `class_name FPSPlayer
extends CharacterBody3D

@export var move_speed: float = 5.0
@export var jump_velocity: float = 4.5
@export var mouse_sensitivity: float = 0.002
@export var max_health: float = 100.0

var health: float
var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")

@onready var head: Node3D = $Head
@onready var camera: Camera3D = $Head/Camera3D

func _ready() -> void:
\thealth = max_health
\tInput.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)

func _unhandled_input(event: InputEvent) -> void:
\tif event is InputEventMouseMotion and Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
\t\trotate_y(-event.relative.x * mouse_sensitivity)
\t\thead.rotate_x(-event.relative.y * mouse_sensitivity)
\t\thead.rotation.x = clamp(head.rotation.x, -PI / 2.0, PI / 2.0)

func _physics_process(delta: float) -> void:
\tif not is_on_floor():
\t\tvelocity.y -= gravity * delta
\t
\tif Input.is_action_just_pressed("jump") and is_on_floor():
\t\tvelocity.y = jump_velocity
\t
\tvar input_dir := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
\tvar direction := (transform.basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()
\tvelocity.x = direction.x * move_speed if direction else move_toward(velocity.x, 0, move_speed)
\tvelocity.z = direction.z * move_speed if direction else move_toward(velocity.z, 0, move_speed)
\tmove_and_slide()
`,
    },
  },

  roguelike: {
    id: 'roguelike',
    name: 'Roguelike',
    description: 'Procedurally generated dungeon crawler with permadeath',
    thumbnail: 'templates/roguelike.png',
    features: ['Procedural dungeons', 'Turn-based combat', 'Permadeath', 'Item synergies', 'Floor progression'],
    defaultGdd: {
      gameType: 'roguelike',
      genre: ['roguelike', 'dungeon-crawler', 'strategy'],
      targetPlatforms: ['web', 'windows', 'android'],
      mechanics: [
        { name: 'Dungeon Gen', description: 'BSP or drunkard walk room generation', priority: 'core' },
        { name: 'Turn System', description: 'Player and enemies take turns', priority: 'core' },
        { name: 'Permadeath', description: 'Death resets all progress, high scores saved', priority: 'core' },
        { name: 'Items', description: 'Randomized items with synergistic effects', priority: 'secondary' },
      ],
      techRequirements: { physics: '2d', multiplayer: false, saveSystem: true, localisation: false, minGodotVersion: '4.3' },
    },
    sceneStructure: [
      'dungeon.tscn → Node2D',
      '  ├── DungeonGenerator → Node2D',
      '  ├── TileMapLayer (floor)',
      '  ├── TileMapLayer (walls)',
      '  ├── Entities → Node2D',
      '  └── Items → Node2D',
    ],
    baseScripts: {},
  },

  'farm-sim': {
    id: 'farm-sim',
    name: 'Farm Simulator',
    description: 'Cozy farming game with planting, harvesting, and town life',
    thumbnail: 'templates/farm-sim.png',
    features: ['Day/night cycle', 'Planting & harvesting', 'NPC relationships', 'Shop system', 'Seasonal events'],
    defaultGdd: {
      gameType: 'farm-sim',
      genre: ['simulation', 'casual', 'cozy'],
      targetPlatforms: ['web', 'windows', 'android', 'ios'],
      mechanics: [
        { name: 'Farming', description: 'Till, plant, water, harvest crop cycle', priority: 'core' },
        { name: 'Time System', description: '20-minute in-game days with seasons', priority: 'core' },
        { name: 'Energy', description: 'Energy depletes per action, replenished by sleep', priority: 'core' },
        { name: 'Social', description: 'NPC friendship system with gift-giving', priority: 'secondary' },
      ],
      techRequirements: { physics: '2d', multiplayer: false, saveSystem: true, localisation: true, minGodotVersion: '4.3' },
    },
    sceneStructure: [
      'world/farm.tscn → Node2D',
      'world/town.tscn → Node2D',
      'ui/hud.tscn → CanvasLayer',
      'ui/inventory.tscn → CanvasLayer',
      'systems/time_manager.tscn → Node (Autoload)',
      'systems/crop_manager.tscn → Node (Autoload)',
    ],
    baseScripts: {},
  },

  strategy: {
    id: 'strategy',
    name: 'Civilization Builder',
    description: 'Turn-based hex-grid strategy with city building and tech tree',
    thumbnail: 'templates/strategy.png',
    features: ['Hex grid map', 'City building', 'Tech research', 'Resource management', 'AI opponents', 'Diplomacy'],
    defaultGdd: {
      gameType: 'strategy',
      genre: ['strategy', '4x', 'turn-based'],
      targetPlatforms: ['windows', 'macos', 'linux', 'web'],
      mechanics: [
        { name: 'Hex Map', description: 'Procedurally generated hex grid world', priority: 'core' },
        { name: 'Turn System', description: 'Each player/AI takes a full turn', priority: 'core' },
        { name: 'City Building', description: 'Found and develop cities with buildings', priority: 'core' },
        { name: 'Resources', description: 'Collect food, production, gold, science', priority: 'core' },
        { name: 'Tech Tree', description: 'Research new units and buildings', priority: 'secondary' },
      ],
      techRequirements: { physics: '2d', multiplayer: true, saveSystem: true, localisation: true, minGodotVersion: '4.3' },
    },
    sceneStructure: [
      'world/hex_map.tscn → Node2D',
      '  └── TileMapLayer (hex tiles)',
      'ui/main_hud.tscn → CanvasLayer',
      'ui/city_view.tscn → CanvasLayer',
      'ui/tech_tree.tscn → CanvasLayer',
      'systems/game_manager.tscn → Node (Autoload)',
      'systems/ai_manager.tscn → Node (Autoload)',
    ],
    baseScripts: {},
  },

  custom: {
    id: 'custom',
    name: 'Custom Game',
    description: 'Start from scratch with a blank Godot project',
    thumbnail: 'templates/custom.png',
    features: ['Blank project', 'No assumptions', 'Full control'],
    defaultGdd: {
      gameType: 'custom',
      genre: ['custom'],
      targetPlatforms: ['web', 'windows'],
      mechanics: [],
      techRequirements: { physics: '2d', multiplayer: false, saveSystem: false, localisation: false, minGodotVersion: '4.3' },
    },
    sceneStructure: ['main.tscn → Node2D (Main)'],
    baseScripts: {},
  },
};
