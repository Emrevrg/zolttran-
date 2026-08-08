/**
 * İstemciden, prompt'a göre okunabilir bir yapım planı üretir.
 * Tesana benzeri "Tarif → Plan → İnşa" akışının Plan adımını besler.
 * Gerçek offline pipeline'ın yapacağı işi yansıtır (uydurma değil).
 */
export interface BuildPlan {
  gameType: string;
  summary: string;
  steps: string[];
}

const RULES: Array<{ re: RegExp; type: string; extra: string[] }> = [
  { re: /fps|nişancı|shooter|silah|arena|tactical|valorant|counter|cs/i, type: '3D FPS',
    extra: ['Birinci şahıs kamera + hareket (WASD, koşma, zıplama)', 'Silah sistemi ve mermi/hasar mantığı', 'Otoriteli netcode + anti-cheat iskeleti', 'Dalga/round akışı ve HUD'] },
  { re: /platform|zıpla|jump|koşu|runner/i, type: '2D Platformer',
    extra: ['Oyuncu kontrolü (koşma, zıplama, wall-jump, dash)', 'Zemin/çarpışma ve kamera takibi', 'Toplanabilirler ve seviye çıkışı'] },
  { re: /rpg|envanter|diyalog|npc|görev|quest/i, type: 'Top-down RPG',
    extra: ['Top-down hareket ve etkileşim', 'NPC diyalog sistemi', 'Envanter ve eşya mantığı'] },
  { re: /roguelike|zindan|dungeon|prosedürel|kalıcı ölüm/i, type: 'Roguelike',
    extra: ['Prosedürel zindan üretimi', 'Düşman AI ve savaş döngüsü', 'Kalıcı ölüm ve ilerleme'] },
  { re: /survivor|bullet.?heaven|vampire|dalga|horde/i, type: 'Bullet-Heaven',
    extra: ['Otomatik saldırı ve düşman sürüsü', 'Seviye/yükseltme sistemi', 'Artan zorluk dalgaları'] },
  { re: /çiftlik|farm|hasat|ekim|cozy|simülasyon|simulation/i, type: 'Simülasyon',
    extra: ['Gün/zaman döngüsü', 'Ekim–hasat ve envanter', 'Ekonomi ve etkileşimli nesneler'] },
  { re: /yarış|racing|araba|drift|kart/i, type: 'Yarış',
    extra: ['Araç fiziği ve sürüş kontrolü', 'Pist ve tur/checkpoint mantığı', 'Sıralama ve zamanlayıcı'] },
  { re: /macera|adventure|keşif|kesif|explore|hikaye|story|bulmaca|puzzle/i, type: 'Macera',
    extra: ['Serbest keşif ve top-down hareket', 'Nesne/NPC etkileşimi ve diyalog', 'Envanter ve anahtar-kapı bulmacaları'] },
];

export function buildPlan(prompt: string): BuildPlan {
  const hit = RULES.find((r) => r.re.test(prompt));
  const type = hit?.type ?? '2D Aksiyon';
  const specific = hit?.extra ?? ['Çekirdek oyuncu kontrolü', 'Temel mekanik ve düşman/engel', 'Skor ve oyun döngüsü'];
  return {
    gameType: type,
    summary: `"${prompt.trim().slice(0, 120)}" isteğinden bir ${type} projesi kurulacak.`,
    steps: [
      `Oyun türü sezildi: ${type} — Oyun Tasarım Dokümanı (GDD) hazırlanır`,
      'Godot 4.x proje iskeleti ve ana sahne oluşturulur',
      ...specific,
      'Varlık/sahne iskeleti yerleştirilir',
      'Tüm platformlar için export ayarları yazılır (web · masaüstü · mobil)',
    ],
  };
}
