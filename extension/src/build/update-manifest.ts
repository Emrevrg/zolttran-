/**
 * update-manifest — iOS ve Android için canlı-servis güncelleme dosyalarını üretir.
 *
 * Zolttran'ın "bir özellik istediğimde iki platform için update dosyalarını
 * hazırlamalı" hedefinin somut temeli. Her build sonrası platform başına bir
 * `update.json` üretir; oyun istemcisi açılışta bunu okuyup zorunlu/opsiyonel
 * güncellemeyi kullanıcıya gösterebilir. Çapraz-platform (aynı hesap) senaryosunda
 * her iki manifest de aynı `contentVersion`'ı paylaşır → save/ilerleme uyumlu kalır.
 */
import * as fs from 'fs';
import * as path from 'path';

export type UpdatePlatform = 'android' | 'ios';

export interface UpdateManifest {
  platform: UpdatePlatform;
  /** Kullanıcıya görünen sürüm, örn "1.4.0" */
  version: string;
  /** Store build numarası (Android: versionCode, iOS: CFBundleVersion) */
  build: number;
  /** İçerik/veri şeması sürümü — çapraz-platform save uyumu için ortak tutulur */
  contentVersion: number;
  /** İndirme / store bağlantısı */
  url: string;
  /** Bu sürüme geçiş zorunlu mu? (kırılgan şema değişiklikleri için) */
  mandatory: boolean;
  /** Desteklenen en düşük OS sürümü */
  minOsVersion: string;
  /** Değişiklik notları (çok dilli) */
  changelog: Record<string, string[]>;
  /** Çapraz-platform oturum protokol sürümü — eşleşmeyen istemciler eşleştirilmez */
  netProtocol: number;
  releasedAt: string;
}

export interface UpdateOptions {
  version: string;
  contentVersion: number;
  netProtocol: number;
  mandatory?: boolean;
  changelog?: Record<string, string[]>;
  android?: { build: number; url: string; minOsVersion?: string };
  ios?: { build: number; url: string; minOsVersion?: string };
}

const DEFAULTS = {
  android: { minOsVersion: '8.0', url: 'https://play.google.com/store/apps/details?id=' },
  ios: { minOsVersion: '15.0', url: 'https://apps.apple.com/app/' },
};

export function buildManifest(platform: UpdatePlatform, o: UpdateOptions): UpdateManifest {
  const p = platform === 'android' ? o.android : o.ios;
  const d = DEFAULTS[platform];
  return {
    platform,
    version: o.version,
    build: p?.build ?? 1,
    contentVersion: o.contentVersion,
    url: p?.url ?? d.url,
    mandatory: o.mandatory ?? false,
    minOsVersion: p?.minOsVersion ?? d.minOsVersion,
    changelog: o.changelog ?? { tr: ['Genel iyileştirmeler ve hata düzeltmeleri'], en: ['General improvements and bug fixes'] },
    netProtocol: o.netProtocol,
    releasedAt: new Date().toISOString(),
  };
}

/**
 * Her iki platform için manifestleri `<outDir>/updates/{android,ios}/update.json`
 * olarak yazar ve yolları döndürür. Aynı contentVersion + netProtocol paylaşıldığı
 * için iOS ve Android oyuncular aynı hesap ve oturumda uyumlu kalır.
 */
export function writeUpdateManifests(outDir: string, o: UpdateOptions): Record<UpdatePlatform, string> {
  const result = {} as Record<UpdatePlatform, string>;
  for (const platform of ['android', 'ios'] as UpdatePlatform[]) {
    const dir = path.join(outDir, 'updates', platform);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'update.json');
    fs.writeFileSync(file, JSON.stringify(buildManifest(platform, o), null, 2), 'utf8');
    result[platform] = file;
  }
  return result;
}
