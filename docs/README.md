# 🎮 Zolttran — AI Oyun Stüdyosu

> **Hayallerini oyuna dönüştür. Tek bir cümleyle.**

Zolttran, VS Code üzerinde çalışan, 25+ AI provider desteğiyle Godot 4.x motoruyla tam entegre, oyun fikrinden cross-platform yayına kadar tüm süreci otomatikleştiren açık kaynak bir AI oyun geliştirme platformudur.

---

## ✨ Özellikler

| Özellik | Detay |
|---------|-------|
| **25+ AI Provider** | OpenRouter, NVIDIA NIM, Anthropic, OpenAI, Google, Groq, DeepSeek, Mistral, xAI, Cohere, Cerebras, Poolside, Qwen, Ollama ve 11 tane daha |
| **FREE MODE** | 20+ ücretsiz model otomatik rotasyonla — API anahtarı gerekmez |
| **Godot 4.x** | MCP + TCP + CLI köprüsü — her yöntemle bağlanın |
| **Prompt-to-Game** | Oyununuzu tarif edin → tam Godot projesi alın |
| **7 Şablon** | Bullet Heaven, Platformer, Top-Down RPG, FPS, Roguelike, Çiftlik, Strateji |
| **5 AI Agent** | Mimar, Geliştirici, Sanatçı, Debugger, DevOps — paralel çalışır |
| **7 Platform** | Web, Windows, macOS, Linux, Android, iOS, Steam Deck |
| **Canlı Önizleme** | VS Code içinde HTML5 oyun + hot-reload |
| **Memory Bank** | Proje bağlamı session'lar arası kalıcı |

---

## 🚀 Hızlı Başlangıç

### Gereksinimler
- VS Code 1.90+
- Node.js 20+
- Godot 4.3+ (build/export için)
- Python 3.12+ + `uv` (MCP agent için, isteğe bağlı)

### Kurulum

```bash
# Marketplace'den
ext install zolttran.zolttran

# Kaynak koddan
git clone https://github.com/zolttran/zolttran
cd zolttran/extension
npm install && npm run build
```

### Godot Agent (isteğe bağlı — gelişmiş özellikler için)

```bash
cd godot-agent
pip install uv
uv sync
uv run zolttran-agent --project /godot/proje/yolu --port 9876
```

### İlk oyununuzu yapın

1. `Ctrl+Shift+Z` ile Zolttran panelini açın
2. **FREE MODE** açık olduğunu doğrulayın (varsayılan: açık)
3. Chat'e yazın: *"Vampire Survivors benzeri bilim kurgu oyunu yap"*
4. Agent ekibinin çalışmasını izleyin
5. ▶ **Başlat** ile oyunu önizleyin

---

## 🏗️ Mimari

```
VS Code Extension (TypeScript)
├── Provider Katmanı    — 25 provider, akıllı yönlendirme, ücretsiz model rotasyonu
├── Agent Sistemi       — 5 özel agent + orchestrator
├── Godot Entegrasyonu  — MCP / TCP / CLI köprüsü
├── Build Pipeline      — 7 platform + hosting deploy
├── Canlı Önizleme      — HTTP sunucu + WebSocket hot-reload
└── React UI            — Glassmorphism tasarım + Zolttran marka kimliği

Godot MCP Agent (Python / FastAPI)
├── scene_tools   — .tscn dosyası oluşturma/düzenleme
├── script_tools  — GDScript oluşturma/doğrulama
├── asset_tools   — Asset import/üretme
├── test_tools    — GUT test çalıştırma + profil
├── build_tools   — Export preset + build
└── project_tools — Proje yapılandırma
```

---

## 🔑 API Anahtarları

Zolttran **FREE MODE** ile API anahtarı olmadan tamamen çalışır. Premium modeller için:

1. **Config** sekmesini açın
2. İstediğiniz provider'ın API anahtarını girin
3. Anahtarlar VS Code SecretStorage'da güvenle saklanır

---

## 📄 Lisans

Apache 2.0 — özgürce kullanın, değiştirin, dağıtın.

**[zolttran.dev](https://zolttran.dev)** · **[GitHub](https://github.com/zolttran/zolttran)**
