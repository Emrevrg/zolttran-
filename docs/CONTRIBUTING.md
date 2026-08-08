# Zolttran'a Katkıda Bulunun

## Geliştirme Ortamı

```bash
git clone https://github.com/emrevrg/zolttran.git
cd zolttran/extension
npm install

# Extension + UI izleyici
npm run dev:ext
npm run dev:ui

# VS Code'da F5 → Extension Development Host
```

## Commit Kuralları

```
feat: yeni özellik
fix: hata düzeltme
docs: dökümantasyon
style: biçimlendirme
refactor: yeniden yapılandırma
test: test ekleme
chore: araç/config değişikliği
```

## PR Süreci

1. Fork edin
2. Feature branch açın (`git checkout -b feat/harika-ozellik`)
3. Commit edin (`git commit -m 'feat: harika özellik'`)
4. Push edin (`git push origin feat/harika-ozellik`)
5. PR açın

## Kod Standartları

- TypeScript strict mode
- ESLint + Prettier
- JSDoc public metodlar için
- Test yazın (Jest)

## Lisans

Katkıda bulunarak Apache 2.0 lisansını kabul etmiş olursunuz.
