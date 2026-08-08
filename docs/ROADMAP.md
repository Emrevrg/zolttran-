# Zolttran — Yol Haritası

Bu belge, tek cümleyle oyun üreten otonom AI stüdyosunun mevcut durumunu ve
büyük hedeflerini dürüstçe ayırır. "Hazır" = kullanılabilir, "Temel atıldı" =
kod/mimari var ama servis/entegrasyon eksik, "Planlandı" = tasarım aşamasında.

## ✅ Hazır (bu sürüm)

- **Tesana-tarzı tek yüzey UI** — mod/sekme yok; sol ikon navigasyonu, tek
  konuşma yüzeyi, istenince açılan canlı süreç çekmecesi. Lucide çizgi ikonlar,
  near-black premium tema, gerçek Zolttran marka görselleri.
- **Otonom akış** — kullanıcı sadece konuşur; 5 AI agent (Mimar, Geliştirici,
  Sanatçı, Debugger, DevOps) süreci canlı rayda görünür/kontrol edilir.
- **Dosya / görsel / 3D ekleme** — composer'dan ataç, sürükle-bırak, yapıştır ile
  her tür dosya. Sohbette önizleme şeridi; görsele tıkla → tam ekran lightbox,
  3D modele tıkla → three.js orbit görüntüleyici (glb/gltf/obj).
- **Provider yönetimi** — 25+ provider, FREE MODE ile anahtarsız başlangıç.
- **Godot köprüsü, canlı önizleme, çok-platform derleme** UI'dan tek tıkla.

## 🧱 Temel atıldı (kod var, servis eksik)

- **Çapraz-platform hesap & oturum** — `src/multiplayer/cross-play.ts`.
  Bir hesap birden çok platform kimliği (iOS/Android/Web/masaüstü) bağlar; save
  platformdan bağımsız; oyuncular protokol uyuşuyorsa aynı oturumda buluşur.
  *Eksik:* gerçek netcode/transport (WebRTC/UDP relay) ve bulut hesap deposu.
- **iOS/Android güncelleme dosyaları** — `src/build/update-manifest.ts`.
  Her build sonrası platform başına `update.json` üretir; ortak `contentVersion`
  ve `netProtocol` sayesinde iki platform save/oturum uyumlu kalır.
  *Eksik:* CI'de otomatik yayın ve store yükleme entegrasyonu.

## 🗺️ Planlandı

- **Valorant-sınıfı çok-oyunculu** — otoriter sunucu, eşleştirme, anti-cheat,
  bölge tabanlı relay. cross-play modeli bunun istemci temeli.
- **Canlı-servis pipeline** — sürüm kanalları (beta/prod), zorunlu güncelleme,
  içerik CDN'i, çapraz-platform ilerleme senkronizasyonu.
- **VS Code içi gerçek çalıştırma paketi (.vsix)** ve masaüstü kabuk.

> Kural: hiçbir özellik gerçekte çalışmadan "hazır" işaretlenmez. Ekran
> görüntüleri `docs/screenshots/` içinde gerçek derlenmiş UI'dan alınmıştır.
