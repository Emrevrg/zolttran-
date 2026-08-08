<div align="center">

<img src="docs/assets/zolttran-logo-full.png" alt="Zolttran Logo" width="320" />

# ZOLTTRAN — AI Game Studio

**Hayalindeki oyunu gerçeğe dönüştür. Tek bir cümleyle.**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.90+-6366f1.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=emrevrg.zolttran)
[![Godot](https://img.shields.io/badge/Godot-4.3+-478cbf.svg?style=flat-square)](https://godotengine.org)
[![Python](https://img.shields.io/badge/Python-3.12+-22d3ee.svg?style=flat-square)](https://python.org)
[![Node](https://img.shields.io/badge/Node.js-20+-4ade80.svg?style=flat-square)](https://nodejs.org)
[![GitHub Stars](https://img.shields.io/github/stars/emrevrg/zolttran?style=flat-square&color=fbbf24)](https://github.com/emrevrg/zolttran/stargazers)

<br/>

> **Açık kaynağın en güçlü AI oyun geliştirme aracı.**  
> Cursor ve Claude Code'a rakip. Ücretsiz. Godot entegrasyonlu. 25+ AI provider.

<br/>

<img src="docs/assets/screenshot-main.png" alt="Zolttran Screenshot" width="880" />

</div>

---

## 📋 İçindekiler

- [Özellikler](#-özellikler)
- [VS Code Kurulumu](#-vs-code-kurulumu)
- [Masaüstü Uygulaması](#-masaüstü-uygulaması)
- [İlk Oyununuzu Yapın](#-i̇lk-oyununuzu-yapın)
- [VS Code'da Nasıl Kullanılır](#-vs-codeda-nasıl-kullanılır)
- [Ekran Görüntüleri](#-ekran-görüntüleri)
- [AI Provider Kurulumu](#-ai-provider-kurulumu)
- [Godot Agent](#-godot-agent)
- [Katkı](#-katkı)
- [Lisans](#-lisans)

---

## ✨ Özellikler

<table>
<tr>
<td width="50%">

### 🤖 AI Güçlü
- **25+ AI Provider** — OpenRouter, NVIDIA NIM, Anthropic, OpenAI, Google, Groq, DeepSeek, Mistral, xAI ve daha fazlası
- **FREE MODE** — API anahtarı olmadan 20+ ücretsiz model
- **Akıllı Yönlendirme** — Göreve göre en iyi modeli seçer
- **Otomatik Rotasyon** — Rate limit'e düşünce model değiştirir

</td>
<td width="50%">

### 🎮 Godot Entegrasyonu
- **Godot 4.3+** — MCP + TCP + CLI üçlü köprü
- **Prompt-to-Game** — Tek cümleden oynanabilir oyun
- **7 Şablon** — Bullet Heaven, Platformer, RPG, FPS, Roguelike, Çiftlik, Strateji
- **Canlı Önizleme** — VS Code içinde hot-reload

</td>
</tr>
<tr>
<td>

### 🧠 5 Özel AI Agent
- **🏗️ Mimar** — Oyun tasarımı & GDD
- **💻 Geliştirici** — GDScript / C# kod
- **🎨 Sanatçı** — Sprite & shader
- **🔧 Debugger** — Test & hata düzeltme
- **🚀 DevOps** — Build & deploy

</td>
<td>

### 📦 7 Platform
- 🌐 Web (HTML5/WASM)
- 🪟 Windows (.exe)
- 🍎 macOS (.app)
- 🐧 Linux (AppImage)
- 🤖 Android (APK/AAB)
- 📱 iOS (IPA)
- 🎮 Steam Deck

</td>
</tr>
</table>

---

## 🚀 VS Code Kurulumu

### Yöntem 1: VS Code Marketplace (Önerilen)

```
1. VS Code'u açın
2. Ctrl+Shift+X (Eklentiler)
3. "Zolttran" arayın
4. "Zolttran — AI Game Studio" → Yükle
```

### Yöntem 2: VSIX Dosyasından

```bash
# 1. Repoyu klonlayın
git clone https://github.com/emrevrg/zolttran.git
cd zolttran/extension

# 2. Bağımlılıkları yükleyin
npm install

# 3. Build edin
npm run build

# 4. VSIX paketi oluşturun
npm run package
# → zolttran-1.0.0.vsix oluşur

# 5. VS Code'a yükleyin
code --install-extension zolttran-1.0.0.vsix
```

### Yöntem 3: Geliştirici Modu

```bash
git clone https://github.com/emrevrg/zolttran.git
cd zolttran/extension
npm install && npm run build

# VS Code'da F5 ile çalıştırın (Extension Development Host)
```

---

## 🖥️ Masaüstü Uygulaması

Zolttran aynı zamanda bağımsız bir masaüstü uygulaması olarak da çalışır:

### Gereksinimler
| Yazılım | Versiyon | İndirme |
|---------|----------|---------|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| VS Code | 1.90+ | [code.visualstudio.com](https://code.visualstudio.com) |
| Python | 3.12+ | [python.org](https://python.org) — *isteğe bağlı* |
| Godot | 4.3+ | [godotengine.org](https://godotengine.org) — *build için* |
| uv | latest | `pip install uv` — *Godot Agent için* |

### Windows Kurulumu

```powershell
# 1. Node.js 20+ yükleyin (https://nodejs.org)
# 2. Repoyu klonlayın
git clone https://github.com/emrevrg/zolttran.git
cd zolttran\extension

# 3. Bağımlılıklar ve build
npm install
npm run build

# 4. VS Code'a yükle
code --install-extension zolttran-1.0.0.vsix

# 5. (İsteğe bağlı) Godot Agent
cd ..\godot-agent
pip install uv
uv sync
uv run zolttran-agent --port 9876
```

### macOS / Linux Kurulumu

```bash
# Homebrew ile Node.js (macOS)
brew install node@20

# veya apt (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Repo + build
git clone https://github.com/emrevrg/zolttran.git
cd zolttran/extension
npm install && npm run build
code --install-extension zolttran-1.0.0.vsix

# Godot Agent (isteğe bağlı)
cd ../godot-agent
pip install uv && uv sync
uv run zolttran-agent --project /godot/proje/yolu
```

---

## 🎮 İlk Oyununuzu Yapın

```
1. VS Code'u açın
2. Ctrl+Shift+Z → Zolttran paneli açılır
3. FREE MODE açık olduğunu doğrulayın (varsayılan: açık)
4. Chat'e yazın:
   "Vampire Survivors benzeri bilim kurgu oyunu yap"
5. Agent ekibinin çalışmasını izleyin
6. ▶ Başlat ile oyunu önizleyin
7. 📦 Build ile tüm platformlara export edin
```

---

## 📖 VS Code'da Nasıl Kullanılır

### Panel Açma
```
Ctrl+Shift+Z          → Zolttran panelini aç/kapat
```

### 5 Ana Sekme

| Sekme | Kısayol | İşlev |
|-------|---------|-------|
| 💬 Chat | `Ctrl+Shift+Z` | Oyun yap, soru sor, hata düzelt |
| 🤖 Agents | — | 5 agent'ı izle ve yönet |
| 🎮 Builder | — | Sahne, script, canlı önizleme |
| 🚀 Deploy | — | Build + hosting deploy |
| ⚙️ Config | — | API anahtarları, Godot yolu |

### Chat Modları

```
⚡ Tam Otonom   → Oyunun tamamını AI yapar
🏗️ Tasarım      → Sadece oyun tasarımı (GDD)
💻 Kod          → Sadece GDScript/C# yazar
🔧 Debug        → Hataları bulup düzeltir
💬 Soru-Cevap   → Bilgi sorar, açıklar
```

### Temel Komutlar (Command Palette)

```
Ctrl+Shift+P → "Zolttran" yazın:

Zolttran: Yeni Oyun           → Oyun oluştur
Zolttran: Canlı Önizleme      → Oyunu browser'da göster
Zolttran: Tüm Platformlara Build → Web+Win+Linux build
Zolttran: Hafıza Bankasını Aç → Proje hafızasını görüntüle
Zolttran: Godot Bridge Bağlan → Godot editörüne bağlan
Zolttran: FREE MODE Aç/Kapat  → Ücretsiz model modu
```

### Örnek İş Akışı

```
1. "Vampire Survivors klonu yap" → Mimar GDD oluşturur
2. Geliştirici scriptleri yazar → Debugger test eder
3. Sanatçı sprite üretir       → DevOps export presets kurar
4. ▶ Önizle → Tarayıcıda oyna  → 📦 Build → Publish
```

---

## 📸 Ekran Görüntüleri

<div align="center">

### Chat Paneli — Oyun Tarif Et, AI Yapsın
<img src="docs/assets/screenshot-chat.png" width="800" alt="Chat Panel"/>

### Agent Paneli — 5 AI Paralel Çalışıyor
<img src="docs/assets/screenshot-agents.png" width="800" alt="Agent Panel"/>

### Builder — Canlı Godot Önizleme
<img src="docs/assets/screenshot-builder.png" width="800" alt="Builder Panel"/>

### Deploy — 7 Platform, Tek Tıkla
<img src="docs/assets/screenshot-deploy.png" width="800" alt="Deploy Panel"/>

### Settings — 25 Provider, API Yönetimi
<img src="docs/assets/screenshot-settings.png" width="800" alt="Settings Panel"/>

</div>

---

## 🔑 AI Provider Kurulumu

### FREE MODE (Önerilen — Sıfır Maliyet)

FREE MODE açıkken API anahtarı **gerekmez**. 20+ ücretsiz model otomatik rotasyonla çalışır:

```
Tier 1: Nemotron 3 Ultra 550B, Qwen3 Coder 480B, GPT-OSS 120B
Tier 2: Laguna S 2.1, North Mini Code, Gemma 4 31B
Tier 3: Llama 4 400B (Groq/Cerebras), Qwen3 Next 80B
Tier 4: Ollama (localhost) — sınırsız
```

### API Anahtarı Ekleme

```
VS Code → Zolttran → Config sekmesi → Provider adı → API anahtarı → Kaydet
```

| Provider | Ücretsiz? | API Anahtarı |
|----------|-----------|--------------|
| OpenRouter | ✅ 20+ model | [openrouter.ai](https://openrouter.ai/keys) |
| NVIDIA NIM | ✅ Ücretsiz | [build.nvidia.com](https://build.nvidia.com) |
| Groq | ✅ Hızlı | [console.groq.com](https://console.groq.com) |
| Anthropic | ❌ Ücretli | [anthropic.com](https://console.anthropic.com) |
| OpenAI | 🔶 Kısmi | [platform.openai.com](https://platform.openai.com/api-keys) |
| Google | ✅ Gemma free | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| Ollama | ✅ Sınırsız | Kurulum gerekmez |

---

## 🐍 Godot Agent

Gelişmiş özellikler için Python MCP agent:

```bash
cd godot-agent

# Kurulum
pip install uv
uv sync

# Başlat
uv run zolttran-agent \
  --project /godot/proje/yolu \
  --godot godot4 \
  --port 9876

# API Dökümantasyonu
# http://localhost:9876/docs
```

### Agent'ın Sağladıkları (35+ Araç)

```
scene_*   → Sahne oluştur, node ekle/çıkar, sinyal bağla
script_*  → GDScript oluştur, doğrula, hataları oku
asset_*   → Asset import et, sprite üret, shader yaz
test_*    → GUT test çalıştır, screenshot al, profil
build_*   → Export preset, platform build
project_* → Proje oluştur, autoload ekle, input map
```

---

## 🏗️ Mimari

```
zolttran/
├── extension/                    ← VS Code Extension (TypeScript)
│   ├── src/
│   │   ├── extension.ts          ← Ana giriş noktası
│   │   ├── types/                ← Tüm TypeScript tipleri
│   │   ├── providers/            ← 25 AI provider adaptörü
│   │   ├── agent/                ← 5 AI agent + orchestrator
│   │   ├── godot/                ← Godot köprüsü
│   │   ├── build/                ← Platform build sistemi
│   │   ├── preview/              ← Canlı önizleme sunucusu
│   │   └── ui/                   ← React webview UI
│   └── package.json
│
├── godot-agent/                  ← Python MCP Agent
│   ├── src/zolttran_godot_agent/
│   │   ├── server.py             ← FastAPI sunucu
│   │   ├── models.py             ← Pydantic modeller
│   │   └── tools/                ← 35+ Godot aracı
│   └── pyproject.toml
│
└── docs/                         ← Dökümantasyon + görseller
```

---

## 🤝 Katkı

Katkılarınızı bekliyoruz! Bkz. [CONTRIBUTING.md](docs/CONTRIBUTING.md)

```bash
git clone https://github.com/emrevrg/zolttran.git
cd zolttran/extension
npm install

# Geliştirme modu
npm run dev:ext   # Extension watcher
npm run dev:ui    # UI watcher
# VS Code'da F5 → Extension Development Host
```

### Yol Haritası

- [ ] VS Code Marketplace yayını
- [ ] Electron masaüstü uygulaması
- [ ] Web dashboard (zolttran.dev)
- [ ] Çok oyunculu oyun şablonları
- [ ] AI ses/müzik üretimi
- [ ] 3D model üretimi (NVIDIA Omniverse)
- [ ] Steam yayını otomasyonu
- [ ] Unity / Unreal desteği

---

## 📄 Lisans

Apache 2.0 © 2026 [emrevrg](https://github.com/emrevrg) (Emre Vurgun)

Özgürce kullanın, değiştirin, dağıtın. Ticari kullanım serbesttir.

---

<div align="center">

**⭐ Beğendiyseniz yıldız verin — açık kaynak topluluk için büyük destek!**

[GitHub](https://github.com/emrevrg/zolttran) · [Issues](https://github.com/emrevrg/zolttran/issues) · [Discussions](https://github.com/emrevrg/zolttran/discussions)

<img src="docs/assets/zolttran-logo-icon.png" width="48" />

*Zolttran ile hayallerini oyuna dönüştür.*

</div>
