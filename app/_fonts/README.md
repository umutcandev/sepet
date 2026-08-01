# Fontlar

Web fontları repoda barındırılır. `next/font/local` dosyaları build'de hash'li
olarak `/_next/static/media/` altına kopyalar, `@font-face`i kritik CSS'e gömer:
tek origin, `immutable` cache, üçüncü taraf DNS/TLS el sıkışması yok.

`app/_fonts/index.ts` tek giriş noktasıdır; `app/layout.tsx` `--font-sans` ve
`--font-mono` değişkenlerini `<html>`'e buradan bağlar.

## Dosyalar

| Dosya | Kaynak | Commit | Kullanım |
| --- | --- | --- | --- |
| `Haskoy-Variable.woff2` | [ertekinno/haskoy](https://github.com/ertekinno/haskoy) `fonts/woff2/Haskoy-variable.woff2` | `51e5755` | `--font-sans`, wght 100-800 |
| `GeistMono-Variable.woff2` | [vercel/geist-font](https://github.com/vercel/geist-font) `fonts/GeistMono/webfonts/GeistMono[wght].woff2` | `10dc765` | `--font-mono`, wght 100-900 |
| `og/Haskoy-*.otf` | [ertekinno/haskoy](https://github.com/ertekinno/haskoy) `fonts/otf/` | `51e5755` | `app/blog/[slug]/opengraph-image.tsx` (Satori woff2 okuyamaz) |

Dosyalar upstream'den bire bir kopyalanır, yalnız adlandırma normalize edilir.
Güncellerken tablodaki commit'i de tazeleyin.

## Lisans

İki aile de SIL Open Font License 1.1 altında. OFL yeniden dağıtımda lisans
metnini şart koştuğu için `Haskoy-OFL.txt` ve `GeistMono-OFL.txt` burada durur.

## Bilinen boşluk

İki ailede de `₺` (U+20BA) glyph'i yok, simge sistem fontuna düşer. Bu yüzden
`components/subscription/plan-cards.tsx` içindeki `LIRA` stili simgeyi sans
yığınına alır.
