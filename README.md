<div align="center">
<img src="./public/github/github-banner.png" alt="Sepet — Yapay Zekâ Destekli Akıllı Alışveriş Asistanı" height="60" />
<h2>Sepet</h2>

[Canlı (trysepet.com)](https://www.trysepet.com) · [GitHub](https://github.com/umutcandev/sepet) · [Sorun Bildir](https://github.com/umutcandev/sepet/issues)

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?logo=shadcnui&logoColor=white)](https://ui.shadcn.com)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-6-000000?logo=vercel&logoColor=white)](https://sdk.vercel.ai)
[![Google Gemini](https://img.shields.io/badge/Gemini_2.5_Flash-4285F4?logo=googlegemini&logoColor=white)](https://ai.google.dev)
[![NextAuth.js](https://img.shields.io/badge/Auth.js-5-000000?logo=auth0&logoColor=white)](https://authjs.dev)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F?logo=drizzle&logoColor=black)](https://orm.drizzle.team)
[![Neon](https://img.shields.io/badge/Neon_Postgres-00E599?logo=postgresql&logoColor=white)](https://neon.tech)
[![Upstash Redis](https://img.shields.io/badge/Upstash_Redis-00E9A3?logo=redis&logoColor=white)](https://upstash.com)
[![Cloudflare R2](https://img.shields.io/badge/Cloudflare_R2-F38020?logo=cloudflare&logoColor=white)](https://www.cloudflare.com/products/r2/)
[![Polar](https://img.shields.io/badge/Polar-Abonelik-0062FF)](https://polar.sh)
[![Zod](https://img.shields.io/badge/Zod-4-3068B7?logo=zod&logoColor=white)](https://zod.dev)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)

</div>

## Nasıl Çalışır

**Sepet**, Türkiye'deki zincir marketlerin canlı fiyatlarını tek bir yapay zekâ asistanı arkasına toplayan bir alışveriş optimizasyon platformudur.

Kullanıcı doğal dilde bir alışveriş listesi yazar ya da market fişi veya yemek fotoğrafı yükler. Sistem bu girdiyi yapılandırılmış kalemlere dönüştürür, gerçek market kataloglarıyla eşleştirir ve iki sonuç üretir: sepetin tamamını karşılayan **en ucuz tek market** ile kalemleri bölerek toplamı düşüren **en iyi iki market kombinasyonu**.

Yüklenen fişler, aynı sepetin bugünkü en iyi fiyatıyla karşılaştırılarak ölçülebilir tasarruf çıkarılır.

**Canlı sürüm:** <https://www.trysepet.com>

---

## Teknoloji Yığını

Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4 ve shadcn/ui üzerine kuruludur.

Yapay zekâ katmanı Vercel AI SDK ile Google Gemini 2.5 Flash ve Flash Lite modellerini kullanır. Veri tarafında Neon Postgres (Drizzle ORM), Upstash Redis ve Cloudflare R2 bulunur. Kimlik doğrulama NextAuth.js v5, abonelik Polar, dağıtım Vercel üzerindedir. Market fiyatları marketfiyati.org.tr üzerinden alınır.

---

## Yerel Geliştirme

Node.js 20 ve pnpm 9 gerekir. Gerekli ortam değişkenlerinin tam listesi için `.env.example` dosyasına bakınız.

```bash
git clone https://github.com/umutcandev/sepet.git
cd sepet
pnpm install
cp .env.example .env.local

pnpm db:push
pnpm dev
```

| Komut | Açıklama |
|---|---|
| `pnpm dev` | Geliştirme sunucusu |
| `pnpm dev:https` | HTTPS üzerinden (kamera ve mikrofon testi için) |
| `pnpm build` | Üretim derlemesi |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Tip kontrolü |
| `pnpm db:push` | Şemayı doğrudan veritabanına uygula |
| `pnpm db:studio` | Drizzle Studio |

---

## Lisans

MIT lisansı ile yayımlanmıştır. Ayrıntılar için [LICENSE](./LICENSE) dosyasına bakınız.
