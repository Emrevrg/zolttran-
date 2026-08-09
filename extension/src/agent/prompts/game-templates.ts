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
      'weapon.gd': `class_name Weapon
extends Node2D

@export var damage: float = 10.0
@export var fire_rate: float = 1.0
@export var projectile_speed: float = 400.0
@export var projectile_scene: PackedScene

var _cooldown: float = 0.0

func _process(delta: float) -> void:
\t_cooldown -= delta
\tif _cooldown <= 0.0:
\t\t_fire()
\t\t_cooldown = 1.0 / max(fire_rate, 0.01)

func _fire() -> void:
\tvar target := _nearest_enemy()
\tif target == null:
\t\treturn
\tvar dir := (target.global_position - global_position).normalized()
\tif projectile_scene:
\t\tvar p := projectile_scene.instantiate()
\t\tget_tree().current_scene.add_child(p)
\t\tp.global_position = global_position
\t\tif p.has_method("launch"):
\t\t\tp.launch(dir * projectile_speed, damage)

func _nearest_enemy() -> Node2D:
\tvar best: Node2D = null
\tvar best_d := INF
\tfor e in get_tree().get_nodes_in_group("enemies"):
\t\tif e is Node2D:
\t\t\tvar d := global_position.distance_squared_to(e.global_position)
\t\t\tif d < best_d:
\t\t\t\tbest_d = d
\t\t\t\tbest = e
\treturn best
`,
      'enemy.gd': `class_name Enemy
extends CharacterBody2D

@export var max_health: float = 20.0
@export var move_speed: float = 60.0
@export var contact_damage: float = 10.0
@export var xp_reward: float = 3.0

var health: float
var _player: Node2D

func _ready() -> void:
\thealth = max_health
\tadd_to_group("enemies")
\t_player = get_tree().get_first_node_in_group("player")

func _physics_process(_delta: float) -> void:
\tif _player == null or not is_instance_valid(_player):
\t\t_player = get_tree().get_first_node_in_group("player")
\t\treturn
\tvar dir := (_player.global_position - global_position).normalized()
\tvelocity = dir * move_speed
\tmove_and_slide()
\tif global_position.distance_to(_player.global_position) < 20.0 and _player.has_method("take_damage"):
\t\t_player.take_damage(contact_damage * _delta)

func take_damage(amount: float) -> void:
\thealth -= amount
\tif health <= 0.0:
\t\tif _player and _player.has_method("collect_xp"):
\t\t\t_player.collect_xp(xp_reward)
\t\tqueue_free()
`,
      'enemy_spawner.gd': `extends Node2D

@export var enemy_scene: PackedScene
@export var spawn_interval: float = 1.5
@export var spawn_radius: float = 500.0

var _timer: float = 0.0
var _player: Node2D

func _ready() -> void:
\t_player = get_tree().get_first_node_in_group("player")

func _process(delta: float) -> void:
\t_timer -= delta
\tif _timer <= 0.0 and enemy_scene and _player:
\t\t_timer = spawn_interval
\t\tvar angle := randf() * TAU
\t\tvar e := enemy_scene.instantiate()
\t\tget_tree().current_scene.add_child(e)
\t\te.global_position = _player.global_position + Vector2(cos(angle), sin(angle)) * spawn_radius
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

func take_damage(amount: float) -> void:
\thealth -= amount
\thealth_changed.emit(health)
\tif health <= 0.0:
\t\tdied.emit()
`,
      'enemy.gd': `class_name PatrolEnemy
extends CharacterBody2D

@export var move_speed: float = 60.0
@export var gravity: float = 980.0
@export var patrol_distance: float = 120.0
@export var contact_damage: float = 1.0

var _start_x: float
var _dir: float = 1.0

func _ready() -> void:
\t_start_x = global_position.x
\tadd_to_group("enemies")

func _physics_process(delta: float) -> void:
\tif not is_on_floor():
\t\tvelocity.y += gravity * delta
\tif absf(global_position.x - _start_x) > patrol_distance:
\t\t_dir = -signf(global_position.x - _start_x)
\tif is_on_wall():
\t\t_dir = -_dir
\tvelocity.x = _dir * move_speed
\tmove_and_slide()
\tfor i in get_slide_collision_count():
\t\tvar c := get_slide_collision(i)
\t\tvar other := c.get_collider()
\t\tif other and other.is_in_group("player") and other.has_method("take_damage"):
\t\t\tother.take_damage(contact_damage)
`,
      'collectible.gd': `extends Area2D

@export var value: int = 1

func _ready() -> void:
\tbody_entered.connect(_on_body_entered)

func _on_body_entered(body: Node) -> void:
\tif body.is_in_group("player"):
\t\tif Engine.has_singleton("GameManager") or get_node_or_null("/root/GameManager"):
\t\t\tget_node("/root/GameManager").add_score(value)
\t\tqueue_free()
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
    baseScripts: {
      'player.gd': `class_name Player
extends CharacterBody2D

signal health_changed(new_health: int)
signal died

@export var move_speed: float = 120.0
@export var run_multiplier: float = 1.6
@export var max_health: int = 6
@export var attack_damage: float = 2.0
@export var attack_cooldown: float = 0.35

var health: int
var facing: Vector2 = Vector2.DOWN
var _attack_timer: float = 0.0

func _ready() -> void:
\thealth = max_health
\tadd_to_group("player")

func _physics_process(delta: float) -> void:
\t_attack_timer = maxf(0.0, _attack_timer - delta)
\tvar input := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
\tif input != Vector2.ZERO:
\t\tfacing = input.normalized()
\tvar speed := move_speed * (run_multiplier if Input.is_action_pressed("run") else 1.0)
\tvelocity = input * speed
\tmove_and_slide()
\tif Input.is_action_just_pressed("attack") and _attack_timer <= 0.0:
\t\t_attack()

func _attack() -> void:
\t_attack_timer = attack_cooldown
\tvar hit_center := global_position + facing * 24.0
\tfor e in get_tree().get_nodes_in_group("enemies"):
\t\tif e is Node2D and e.global_position.distance_to(hit_center) < 28.0 and e.has_method("take_damage"):
\t\t\te.take_damage(attack_damage)

func take_damage(amount: int) -> void:
\thealth -= amount
\thealth_changed.emit(health)
\tif health <= 0:
\t\tdied.emit()
`,
      'enemy.gd': `class_name Enemy
extends CharacterBody2D

@export var max_health: float = 6.0
@export var move_speed: float = 70.0
@export var contact_damage: int = 1
@export var detect_range: float = 200.0

var health: float
var _player: Node2D
var _hit_timer: float = 0.0

func _ready() -> void:
\thealth = max_health
\tadd_to_group("enemies")
\t_player = get_tree().get_first_node_in_group("player")

func _physics_process(delta: float) -> void:
\t_hit_timer = maxf(0.0, _hit_timer - delta)
\tif _player == null or not is_instance_valid(_player):
\t\treturn
\tvar to_player := _player.global_position - global_position
\tif to_player.length() < detect_range:
\t\tvelocity = to_player.normalized() * move_speed
\t\tmove_and_slide()
\t\tif to_player.length() < 22.0 and _hit_timer <= 0.0 and _player.has_method("take_damage"):
\t\t\t_hit_timer = 0.6
\t\t\t_player.take_damage(contact_damage)

func take_damage(amount: float) -> void:
\thealth -= amount
\tif health <= 0.0:
\t\tqueue_free()
`,
      'npc.gd': `extends Area2D

@export_multiline var dialogue: String = "Merhaba, gezgin!"

func _ready() -> void:
\tbody_entered.connect(_on_body_entered)

func _on_body_entered(body: Node) -> void:
\tif body.is_in_group("player"):
\t\tprint("[NPC] ", dialogue)
`,
    },
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
\tif Input.is_action_just_pressed("shoot"):
\t\t_shoot()

func _shoot() -> void:
\tvar space := get_world_3d().direct_space_state
\tvar from := camera.global_position
\tvar to := from + (-camera.global_transform.basis.z) * 1000.0
\tvar query := PhysicsRayQueryParameters3D.create(from, to)
\tquery.exclude = [self]
\tvar hit := space.intersect_ray(query)
\tif hit and hit.collider and hit.collider.has_method("take_damage"):
\t\thit.collider.take_damage(25.0)

func take_damage(amount: float) -> void:
\thealth -= amount
\tif health <= 0.0:
\t\tget_tree().reload_current_scene()
`,
      'enemy.gd': `class_name Enemy
extends CharacterBody3D

@export var max_health: float = 50.0
@export var move_speed: float = 3.5
@export var contact_damage: float = 10.0

var health: float
var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")
var _player: Node3D
var _hit_timer: float = 0.0

func _ready() -> void:
\thealth = max_health
\tadd_to_group("enemies")
\t_player = get_tree().get_first_node_in_group("player")

func _physics_process(delta: float) -> void:
\t_hit_timer = maxf(0.0, _hit_timer - delta)
\tif not is_on_floor():
\t\tvelocity.y -= gravity * delta
\tif _player and is_instance_valid(_player):
\t\tvar to_player := _player.global_position - global_position
\t\tvar flat := Vector3(to_player.x, 0.0, to_player.z)
\t\tif flat.length() > 1.5:
\t\t\tvar dir := flat.normalized()
\t\t\tvelocity.x = dir.x * move_speed
\t\t\tvelocity.z = dir.z * move_speed
\t\telse:
\t\t\tvelocity.x = 0.0
\t\t\tvelocity.z = 0.0
\t\t\tif _hit_timer <= 0.0 and _player.has_method("take_damage"):
\t\t\t\t_hit_timer = 1.0
\t\t\t\t_player.take_damage(contact_damage)
\tmove_and_slide()

func take_damage(amount: float) -> void:
\thealth -= amount
\tif health <= 0.0:
\t\tqueue_free()
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
    baseScripts: {
      'dungeon_generator.gd': `extends Node2D
## Rastgele yürüyüş ile asset'siz bir zindan üretir (ColorRect duvarlar).

@export var cell_size: int = 48
@export var grid_width: int = 24
@export var grid_height: int = 16
@export var carve_steps: int = 220
@export var enemy_scene: PackedScene
@export var enemy_count: int = 8

var _walkable: Dictionary = {}

func _ready() -> void:
\t_generate()
\t_build_walls()
\t_spawn_entities()

func _generate() -> void:
\tvar pos := Vector2i(grid_width / 2, grid_height / 2)
\t_walkable[pos] = true
\tfor i in carve_steps:
\t\tvar dirs := [Vector2i.LEFT, Vector2i.RIGHT, Vector2i.UP, Vector2i.DOWN]
\t\tpos += dirs[randi() % dirs.size()]
\t\tpos.x = clampi(pos.x, 1, grid_width - 2)
\t\tpos.y = clampi(pos.y, 1, grid_height - 2)
\t\t_walkable[pos] = true

func _build_walls() -> void:
\tfor y in grid_height:
\t\tfor x in grid_width:
\t\t\tif not _walkable.has(Vector2i(x, y)):
\t\t\t\t_make_wall(x, y)

func _make_wall(x: int, y: int) -> void:
\tvar body := StaticBody2D.new()
\tbody.position = Vector2(x * cell_size, y * cell_size)
\tvar rect := ColorRect.new()
\trect.color = Color(0.15, 0.16, 0.24)
\trect.size = Vector2(cell_size, cell_size)
\tbody.add_child(rect)
\tvar shape := CollisionShape2D.new()
\tvar r := RectangleShape2D.new()
\tr.size = Vector2(cell_size, cell_size)
\tshape.shape = r
\tshape.position = Vector2(cell_size, cell_size) / 2.0
\tbody.add_child(shape)
\tadd_child(body)

func _random_floor() -> Vector2:
\tvar keys := _walkable.keys()
\tvar c: Vector2i = keys[randi() % keys.size()]
\treturn Vector2(c.x * cell_size + cell_size / 2, c.y * cell_size + cell_size / 2)

func _spawn_entities() -> void:
\tvar player := get_tree().get_first_node_in_group("player")
\tif player:
\t\tplayer.global_position = _random_floor()
\tif enemy_scene:
\t\tfor i in enemy_count:
\t\t\tvar e := enemy_scene.instantiate()
\t\t\tadd_child(e)
\t\t\te.global_position = _random_floor()
`,
      'player.gd': `class_name Player
extends CharacterBody2D

signal died

@export var move_speed: float = 140.0
@export var max_health: int = 5
@export var attack_damage: float = 3.0
@export var attack_cooldown: float = 0.3

var health: int
var facing: Vector2 = Vector2.DOWN
var _attack_timer: float = 0.0

func _ready() -> void:
\thealth = max_health
\tadd_to_group("player")

func _physics_process(delta: float) -> void:
\t_attack_timer = maxf(0.0, _attack_timer - delta)
\tvar input := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
\tif input != Vector2.ZERO:
\t\tfacing = input.normalized()
\tvelocity = input * move_speed
\tmove_and_slide()
\tif Input.is_action_just_pressed("attack") and _attack_timer <= 0.0:
\t\t_attack()

func _attack() -> void:
\t_attack_timer = attack_cooldown
\tvar center := global_position + facing * 26.0
\tfor e in get_tree().get_nodes_in_group("enemies"):
\t\tif e is Node2D and e.global_position.distance_to(center) < 30.0 and e.has_method("take_damage"):
\t\t\te.take_damage(attack_damage)

func take_damage(amount: int) -> void:
\thealth -= amount
\tif health <= 0:
\t\tdied.emit()
\t\tget_tree().reload_current_scene()
`,
      'enemy.gd': `class_name Enemy
extends CharacterBody2D

@export var max_health: float = 8.0
@export var move_speed: float = 55.0
@export var contact_damage: int = 1

var health: float
var _player: Node2D
var _hit_timer: float = 0.0

func _ready() -> void:
\thealth = max_health
\tadd_to_group("enemies")
\t_player = get_tree().get_first_node_in_group("player")

func _physics_process(delta: float) -> void:
\t_hit_timer = maxf(0.0, _hit_timer - delta)
\tif _player == null or not is_instance_valid(_player):
\t\treturn
\tvar to_player := _player.global_position - global_position
\tif to_player.length() < 260.0:
\t\tvelocity = to_player.normalized() * move_speed
\t\tmove_and_slide()
\t\tif to_player.length() < 24.0 and _hit_timer <= 0.0 and _player.has_method("take_damage"):
\t\t\t_hit_timer = 0.7
\t\t\t_player.take_damage(contact_damage)

func take_damage(amount: float) -> void:
\thealth -= amount
\tif health <= 0.0:
\t\tqueue_free()
`,
    },
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
    baseScripts: {
      'player.gd': `class_name Player
extends CharacterBody2D

@export var move_speed: float = 110.0
@export var tile_size: int = 32
@export var max_energy: int = 100

var energy: int
var facing: Vector2 = Vector2.DOWN

func _ready() -> void:
\tenergy = max_energy
\tadd_to_group("player")

func _physics_process(_delta: float) -> void:
\tvar input := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
\tif input != Vector2.ZERO:
\t\tfacing = input.normalized()
\tvelocity = input * move_speed
\tmove_and_slide()
\tif Input.is_action_just_pressed("interact"):
\t\t_interact()

func _interact() -> void:
\tif energy <= 0:
\t\treturn
\tvar target := (global_position + facing * tile_size).snapped(Vector2(tile_size, tile_size))
\tvar crops := get_node_or_null("/root/CropManager")
\tif crops:
\t\tcrops.interact(target)
\t\tenergy -= 1
`,
      'crop_manager.gd': `extends Node
## Tarla döşemelerinin durumunu tutar ve ekinleri zamanla büyütür.
## Otoload olarak eklenir: CropManager

enum State { EMPTY, TILLED, PLANTED, GROWN }

var _tiles: Dictionary = {}          # Vector2 -> State
var _growth: Dictionary = {}         # Vector2 -> float (0..1)
var _visuals: Dictionary = {}        # Vector2 -> ColorRect
@export var grow_time: float = 12.0

func interact(tile: Vector2) -> void:
\tvar s: int = _tiles.get(tile, State.EMPTY)
\tmatch s:
\t\tState.EMPTY:
\t\t\t_tiles[tile] = State.TILLED
\t\tState.TILLED:
\t\t\t_tiles[tile] = State.PLANTED
\t\t\t_growth[tile] = 0.0
\t\tState.GROWN:
\t\t\t_tiles.erase(tile)
\t\t\t_growth.erase(tile)
\t\t\tvar gm := get_node_or_null("/root/GameManager")
\t\t\tif gm and gm.has_method("add_score"):
\t\t\t\tgm.add_score(5)
\t_refresh(tile)

func _process(delta: float) -> void:
\tfor tile in _growth.keys():
\t\tif _tiles.get(tile) == State.PLANTED:
\t\t\t_growth[tile] = minf(1.0, _growth[tile] + delta / grow_time)
\t\t\tif _growth[tile] >= 1.0:
\t\t\t\t_tiles[tile] = State.GROWN
\t\t\t_refresh(tile)

func _refresh(tile: Vector2) -> void:
\tvar rect: ColorRect = _visuals.get(tile)
\tif rect == null:
\t\trect = ColorRect.new()
\t\trect.size = Vector2(30, 30)
\t\trect.position = tile - Vector2(15, 15)
\t\tadd_child(rect)
\t\t_visuals[tile] = rect
\tmatch int(_tiles.get(tile, State.EMPTY)):
\t\tState.TILLED: rect.color = Color(0.45, 0.32, 0.2)
\t\tState.PLANTED: rect.color = Color(0.3, 0.6, 0.25)
\t\tState.GROWN: rect.color = Color(0.95, 0.8, 0.2)
\t\t_: rect.queue_free(); _visuals.erase(tile)
`,
      'time_manager.gd': `extends Node
## Basit gün döngüsü. Otoload: TimeManager

signal day_passed(day: int)

@export var day_length_seconds: float = 120.0
var day: int = 1
var _t: float = 0.0

func _process(delta: float) -> void:
\t_t += delta
\tif _t >= day_length_seconds:
\t\t_t = 0.0
\t\tday += 1
\t\tday_passed.emit(day)

func time_of_day() -> float:
\treturn _t / day_length_seconds
`,
    },
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
    baseScripts: {
      'map_generator.gd': `extends Node2D
## Asset'siz kare ızgara harita; döşemeye tıklayınca seçilir.

@export var cols: int = 20
@export var rows: int = 14
@export var tile_size: int = 40

var _tiles: Dictionary = {}
var _selected: Vector2i = Vector2i(-1, -1)

func _ready() -> void:
\tfor y in rows:
\t\tfor x in cols:
\t\t\tvar rect := ColorRect.new()
\t\t\trect.position = Vector2(x * tile_size, y * tile_size)
\t\t\trect.size = Vector2(tile_size - 2, tile_size - 2)
\t\t\trect.color = _terrain_color(x, y)
\t\t\tadd_child(rect)
\t\t\t_tiles[Vector2i(x, y)] = rect

func _terrain_color(x: int, y: int) -> Color:
\tvar n := sin(x * 0.6) + cos(y * 0.5)
\tif n > 0.9:
\t\treturn Color(0.2, 0.45, 0.7)   # su
\tif n < -0.9:
\t\treturn Color(0.5, 0.5, 0.5)    # dağ
\treturn Color(0.25, 0.5, 0.3)       # ova

func _unhandled_input(event: InputEvent) -> void:
\tif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
\t\tvar cell := Vector2i((get_global_mouse_position() / tile_size).floor())
\t\tif _tiles.has(cell):
\t\t\t_select(cell)

func _select(cell: Vector2i) -> void:
\tif _tiles.has(_selected):
\t\t_tiles[_selected].color = _terrain_color(_selected.x, _selected.y)
\t_selected = cell
\t_tiles[cell].color = Color(0.95, 0.85, 0.3)
`,
      'camera_controller.gd': `extends Camera2D

@export var pan_speed: float = 600.0
@export var zoom_step: float = 0.1

func _process(delta: float) -> void:
\tvar dir := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
\tposition += dir * pan_speed * delta

func _unhandled_input(event: InputEvent) -> void:
\tif event is InputEventMouseButton:
\t\tif event.button_index == MOUSE_BUTTON_WHEEL_UP:
\t\t\tzoom += Vector2(zoom_step, zoom_step)
\t\telif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
\t\t\tzoom = (zoom - Vector2(zoom_step, zoom_step)).max(Vector2(0.3, 0.3))
`,
      'turn_manager.gd': `extends Node
## Sıra tabanlı tur akışı. Otoload: TurnManager

signal turn_changed(turn: int, player_index: int)

@export var player_count: int = 2
var turn: int = 1
var current_player: int = 0

func end_turn() -> void:
\tcurrent_player += 1
\tif current_player >= player_count:
\t\tcurrent_player = 0
\t\tturn += 1
\tturn_changed.emit(turn, current_player)
`,
    },
  },

  adventure: {
    id: 'adventure',
    name: 'Adventure',
    description: 'Exploration-driven adventure with interaction, dialogue and puzzles',
    thumbnail: 'templates/adventure.png',
    features: ['Free exploration', 'Interact with objects & NPCs', 'Dialogue', 'Collectibles', 'Doors & keys'],
    defaultGdd: {
      gameType: 'adventure',
      genre: ['adventure', 'exploration', 'story'],
      targetPlatforms: ['web', 'windows', 'macos', 'linux', 'android', 'ios'],
      mechanics: [
        { name: 'Exploration', description: 'Free top-down movement across hand-crafted areas', priority: 'core' },
        { name: 'Interaction', description: 'Examine and use objects, talk to NPCs', priority: 'core' },
        { name: 'Inventory', description: 'Pick up items and use them to solve puzzles', priority: 'secondary' },
        { name: 'Doors & Keys', description: 'Locked areas opened by finding the right item', priority: 'secondary' },
      ],
      techRequirements: { physics: '2d', multiplayer: false, saveSystem: true, localisation: true, minGodotVersion: '4.3' },
    },
    sceneStructure: [
      'world/area_01.tscn → Node2D',
      '  ├── Interactables → Node2D',
      '  ├── NPCs → Node2D',
      '  └── Doors → Node2D',
      'player.tscn → CharacterBody2D',
      'ui/dialogue.tscn → CanvasLayer',
      'ui/inventory.tscn → CanvasLayer',
    ],
    baseScripts: {
      'player.gd': `class_name Player
extends CharacterBody2D

@export var move_speed: float = 120.0

var facing: Vector2 = Vector2.DOWN
var inventory: Array[String] = []

func _ready() -> void:
\tadd_to_group("player")

func _physics_process(_delta: float) -> void:
\tvar input := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
\tif input != Vector2.ZERO:
\t\tfacing = input.normalized()
\tvelocity = input * move_speed
\tmove_and_slide()
\tif Input.is_action_just_pressed("interact"):
\t\t_try_interact()

func _try_interact() -> void:
\tvar point := global_position + facing * 26.0
\tfor node in get_tree().get_nodes_in_group("interactables"):
\t\tif node is Node2D and node.global_position.distance_to(point) < 30.0 and node.has_method("interact"):
\t\t\tnode.interact(self)
\t\t\treturn

func add_item(item: String) -> void:
\tinventory.append(item)
\tprint("[Envanter] +", item)

func has_item(item: String) -> bool:
\treturn inventory.has(item)
`,
      'interactable.gd': `extends Area2D
## İncelenebilir/toplanabilir nesne. "interactables" grubuna girer.

@export_multiline var message: String = "İlginç bir nesne."
@export var gives_item: String = ""
@export var consume_on_use: bool = true

func _ready() -> void:
\tadd_to_group("interactables")

func interact(player: Node) -> void:
\tprint("[Nesne] ", message)
\tif gives_item != "" and player.has_method("add_item"):
\t\tplayer.add_item(gives_item)
\tif consume_on_use:
\t\tqueue_free()
`,
      'door.gd': `extends StaticBody2D
## Kilitli kapı; doğru anahtar varsa açılır.

@export var required_item: String = "key"

func _ready() -> void:
\tadd_to_group("interactables")

func interact(player: Node) -> void:
\tif player.has_method("has_item") and player.has_item(required_item):
\t\tprint("[Kapı] Açıldı!")
\t\tqueue_free()
\telse:
\t\tprint("[Kapı] Kilitli. Gerekli: ", required_item)
`,
    },
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
