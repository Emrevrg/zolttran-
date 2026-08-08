# Zolttran — Özellik Durumu

Her madde, kod ve (varsa) test kanıtıyla listelenir.

## Çalışan özellikler

- **Tesana-tarzı tek yüzey UI** — sol ikon navigasyonu, tek konuşma yüzeyi, istenince
  açılan canlı süreç çekmecesi, Lucide ikonlar, gerçek marka. Ekran görüntüleri:
  `docs/screenshots/` (VS Code içi dahil).
- **Anahtarsız oyun üretimi (offline prompt-to-game)** — `src/agent/offline-generator.ts`.
  Prompt → oyun türü sezimi → şablondan tam GDD → `GodotProjectScaffolder` ile oynanabilir
  Godot 4 projesi (project.godot + sahneler + GDScript). API anahtarı/LLM gerektirmez.
  *Test:* 3 farklı prompt → doğru tür + 11–12 dosya + 3–4 script üretti.
- **Dosya / görsel / 3D ekleme + görüntüleyiciler** — her tür dosya; görsel lightbox,
  three.js orbit 3D görüntüleyici (glb/gltf/obj).
- **Çapraz-platform çok oyunculu** — `src/multiplayer/`:
  - `cross-play.ts` — tek hesap → çok platform kimliği, platformdan bağımsız save,
    protokol-uyumlu ortak oturum.
  - `relay-server.ts` — WebSocket relay + lobi; otoriteli olayları doğrular.
  - `authoritative-server.ts` — **sunucu-otoriteli durum + anti-cheat**: speedhack,
    menzil-dışı/atış-hızı (aimbot/range), replay ve flood tespiti; ihlal puanlama.
  *Test:* iOS+Android aynı oturuma katıldı; geçerli hareket otoriteli snapshot yaydı;
  speedhack ve menzil hilesi reddedildi; chat relaylendi.
- **iOS/Android güncelleme dosyaları** — `src/build/update-manifest.ts`, ortak
  `contentVersion`/`netProtocol` ile iki platform save & oturum uyumlu.
- **25+ provider, FREE MODE, Godot köprüsü, çok-platform derleme, canlı önizleme.**
- **.vsix paketi** — üretildi ve VS Code'a kuruldu (`code --install-extension`).

## Üretim ölçeğine giden işler

- Bölgesel relay altyapısı + eşleştirme (matchmaking) servisi ve bulut hesap deposu
  (`RealtimeTransport` / `AccountStore` arayüzleri hazır — dağıtık dağıtım bağlanacak).
- Store yükleme otomasyonu (App Store / Play) ve sürüm kanalları (beta/prod).
- Canlı LLM ile üretimin ölçeklenmesi (offline şablon yolu şu an varsayılan güvence).
