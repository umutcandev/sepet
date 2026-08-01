// Saf e-posta şablonları: her fonksiyon { subject, html, text } döner (yan etki
// yok, gönderim mailer.ts'te). Marka paleti: krem zemin (#FFF8F0), beyaz kart,
// ince kahve kenar, marka rengi #6D4530. Senli Türkçe; emoji ve uzun çizgi yok;
// düz-metin alternatif her zaman var (Gmail açık/koyu tema için tablo + inline stil).

export type Email = { subject: string; html: string; text: string }

const BRAND = "#6D4530"
const CREAM = "#FFF8F0"
const BORDER = "rgba(109,69,48,0.12)"
const INK = "#3f342a"
const HEADING = "#241a12"
// E-posta istemcileri web font indirmez: Hasköy yalnız cihazda kuruluysa
// yakalanır, pratikte sistem yığınına düşülür.
const FONT =
  "'Haskoy', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function p(text: string): string {
  return `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:${INK};">${text}</p>`
}

function codeBlock(code: string): string {
  return `<div style="margin:20px 0;padding:16px 12px;background:${CREAM};border:1px solid ${BORDER};border-radius:10px;text-align:center;font-size:28px;font-weight:600;letter-spacing:0.3em;color:${BRAND};font-family:${FONT};">${esc(code)}</div>`
}

function button(href: string, label: string): string {
  const safe = esc(href)
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 16px;"><tr><td style="border-radius:10px;background:${BRAND};"><a href="${safe}" style="display:inline-block;padding:11px 22px;font-family:${FONT};font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;border-radius:10px;">${esc(label)}</a></td></tr></table>`
}

function layout(opts: { heading: string; body: string; preview: string }): string {
  return `<!doctype html>
<html lang="tr">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
  <body style="margin:0;padding:0;background:${CREAM};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(opts.preview)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;">
            <tr>
              <td style="padding:28px 32px 4px;font-family:${FONT};">
                <span style="font-size:15px;font-weight:600;letter-spacing:-0.01em;color:${BRAND};">Sepet</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 30px;font-family:${FONT};">
                <h1 style="margin:0 0 14px;font-size:19px;font-weight:600;letter-spacing:-0.01em;color:${HEADING};">${esc(opts.heading)}</h1>
                ${opts.body}
              </td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
            <tr>
              <td style="padding:18px 32px;font-family:${FONT};font-size:12px;line-height:1.5;color:rgba(63,52,42,0.55);text-align:center;">
                Bu otomatik bir e-postadır, yanıtlamana gerek yok.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function textBlock(lines: string[]): string {
  return lines.join("\n")
}

// ─── Kayıt: e-posta doğrulama (kod + link) ───
export function verificationEmail(args: { code: string; url: string }): Email {
  const heading = "E-postanı doğrula"
  const body =
    p("Sepet hesabını oluşturmak için doğrulama kodun:") +
    codeBlock(args.code) +
    p("Kodu uygulamaya girebilir ya da aşağıdaki bağlantıya tıklayarak doğrulayabilirsin.") +
    button(args.url, "E-postamı doğrula") +
    p("Bu kod 15 dakika geçerli. Bu isteği sen yapmadıysan e-postayı yok sayabilirsin.")
  const text = textBlock([
    "E-postanı doğrula",
    "",
    `Doğrulama kodun: ${args.code}`,
    "",
    `Ya da bu bağlantıyı aç: ${args.url}`,
    "",
    "Bu kod 15 dakika geçerli. Bu isteği sen yapmadıysan e-postayı yok sayabilirsin.",
  ])
  return {
    subject: "Sepet e-posta doğrulama",
    html: layout({ heading, body, preview: `Doğrulama kodun: ${args.code}` }),
    text,
  }
}

// ─── Şifre sıfırlama (kod + link) ───
export function passwordResetEmail(args: { url: string }): Email {
  const heading = "Şifreni sıfırla"
  const body =
    p("Yeni şifreni belirlemek için aşağıdaki bağlantıya tıkla.") +
    button(args.url, "Şifremi sıfırla") +
    p("Bu bağlantı 15 dakika geçerli. Bu isteği sen yapmadıysan şifren değişmez, e-postayı yok sayabilirsin.")
  const text = textBlock([
    "Şifreni sıfırla",
    "",
    `Yeni şifreni belirlemek için bu bağlantıyı aç: ${args.url}`,
    "",
    "Bu bağlantı 15 dakika geçerli. Bu isteği sen yapmadıysan şifren değişmez, e-postayı yok sayabilirsin.",
  ])
  return {
    subject: "Sepet şifre sıfırlama",
    html: layout({ heading, body, preview: "Şifreni sıfırlamak için bağlantına tıkla." }),
    text,
  }
}

// ─── Şifresiz (sosyal giriş) hesaba şifre belirleme bağlantısı (kod yok, yalnız link) ───
// Metin sağlayıcı adı vermez: Google ve Facebook için aynı e-posta gider.
export function setPasswordLinkEmail(args: { url: string }): Email {
  const heading = "Hesabına şifre belirle"
  const body =
    p("Hesabına ek bir şifre belirlemek için aşağıdaki bağlantıya tıkla.") +
    button(args.url, "Şifre belirle") +
    p("Bu bağlantı 15 dakika geçerli. Bu isteği sen yapmadıysan e-postayı yok sayabilirsin; hesabında bir değişiklik yapılmaz.")
  const text = textBlock([
    "Hesabına şifre belirle",
    "",
    `Şifreni belirlemek için bu bağlantıyı aç: ${args.url}`,
    "",
    "Bu bağlantı 15 dakika geçerli. Bu isteği sen yapmadıysan e-postayı yok sayabilirsin; hesabında bir değişiklik yapılmaz.",
  ])
  return {
    subject: "Sepet şifre belirleme",
    html: layout({ heading, body, preview: "Şifreni belirlemek için bağlantına tıkla." }),
    text,
  }
}

// ─── Bildirim: hesaba ilk kez şifre belirlendi ───
// passwordChangedEmail'den farkı: cihazlardan çıkış yapılmadı, metin bunu ima etmez.
export function passwordSetEmail(): Email {
  const heading = "Hesabına şifre belirlendi"
  const body =
    p("Sepet hesabına az önce bir şifre belirlendi. Artık mevcut giriş yönteminin yanında e-posta ve şifrenle de giriş yapabilirsin.") +
    p("Bunu sen yapmadıysan hemen giriş ekranındaki şifre sıfırlama adımıyla yeni bir şifre belirle.")
  const text = textBlock([
    "Hesabına şifre belirlendi",
    "",
    "Sepet hesabına az önce bir şifre belirlendi. Artık mevcut giriş yönteminin yanında e-posta ve şifrenle de giriş yapabilirsin.",
    "Bunu sen yapmadıysan hemen giriş ekranındaki şifre sıfırlama adımıyla yeni bir şifre belirle.",
  ])
  return {
    subject: "Sepet hesabına şifre belirlendi",
    html: layout({ heading, body, preview: "Hesabına bir şifre belirlendi." }),
    text,
  }
}

// ─── Şifresiz (sosyal giriş) hesapta 2FA kurulumu için yeniden doğrulama kodu ───
export function totpSetupCodeEmail(args: { code: string }): Email {
  const heading = "İki adımlı doğrulama kurulum kodun"
  const body =
    p("Hesabında iki adımlı doğrulamayı kurmak için doğrulama kodun:") +
    codeBlock(args.code) +
    p("Bu kodu Sepet'te açık olan pencereye gir. Kod 15 dakika geçerli.") +
    p("Bu isteği sen yapmadıysan e-postayı yok sayabilirsin; hesabında bir değişiklik yapılmaz.")
  const text = textBlock([
    "İki adımlı doğrulama kurulum kodun",
    "",
    `Kodun: ${args.code}`,
    "",
    "Bu kodu Sepet'te açık olan pencereye gir. Kod 15 dakika geçerli.",
    "Bu isteği sen yapmadıysan e-postayı yok sayabilirsin; hesabında bir değişiklik yapılmaz.",
  ])
  return {
    subject: "Sepet iki adımlı doğrulama kodu",
    html: layout({ heading, body, preview: `Kurulum kodun: ${args.code}` }),
    text,
  }
}

// ─── Bildirim: şifre değişti ───
export function passwordChangedEmail(): Email {
  const heading = "Şifren değişti"
  const body =
    p("Sepet hesabının şifresi az önce güncellendi.") +
    p("Bunu sen yaptıysan başka bir şey yapmana gerek yok. Sen yapmadıysan hemen giriş ekranından şifreni sıfırla; hesabın güvenliği için diğer tüm cihazlar da otomatik çıkış yaptı.")
  const text = textBlock([
    "Şifren değişti",
    "",
    "Sepet hesabının şifresi az önce güncellendi.",
    "Bunu sen yapmadıysan hemen giriş ekranından şifreni sıfırla. Diğer tüm cihazlar otomatik çıkış yaptı.",
  ])
  return {
    subject: "Sepet şifren değişti",
    html: layout({ heading, body, preview: "Hesabının şifresi güncellendi." }),
    text,
  }
}

// ─── Bildirim: iki adımlı doğrulama açıldı ───
export function twoFactorEnabledEmail(): Email {
  const heading = "İki adımlı doğrulama açıldı"
  const body =
    p("Hesabında iki adımlı doğrulama (2FA) artık açık. Bundan sonra girişte şifrenin yanında doğrulama uygulamandaki kodu da isteyeceğiz.") +
    p("Bunu sen yapmadıysan hemen şifreni değiştir ve bize ulaş.")
  const text = textBlock([
    "İki adımlı doğrulama açıldı",
    "",
    "Hesabında iki adımlı doğrulama (2FA) artık açık. Girişte şifrenin yanında uygulama kodunu da isteyeceğiz.",
    "Bunu sen yapmadıysan hemen şifreni değiştir.",
  ])
  return {
    subject: "Sepet iki adımlı doğrulama açıldı",
    html: layout({ heading, body, preview: "Hesabında 2FA açıldı." }),
    text,
  }
}

// ─── Bildirim: iki adımlı doğrulama kapatıldı ───
export function twoFactorDisabledEmail(): Email {
  const heading = "İki adımlı doğrulama kapatıldı"
  const body =
    p("Hesabındaki iki adımlı doğrulama (2FA) kapatıldı. Artık girişte yalnızca şifren istenecek.") +
    p("Bunu sen yapmadıysan hesabın risk altında olabilir; hemen şifreni değiştir ve 2FA'yı tekrar aç.")
  const text = textBlock([
    "İki adımlı doğrulama kapatıldı",
    "",
    "Hesabındaki iki adımlı doğrulama (2FA) kapatıldı. Artık girişte yalnızca şifren istenecek.",
    "Bunu sen yapmadıysan hemen şifreni değiştir ve 2FA'yı tekrar aç.",
  ])
  return {
    subject: "Sepet iki adımlı doğrulama kapatıldı",
    html: layout({ heading, body, preview: "Hesabında 2FA kapatıldı." }),
    text,
  }
}

// ─── Bilgi: bu e-posta ile zaten hesap var (kayıt denemesinde enumeration'ı
// önlemek için forma jenerik yanıt döner; gerçek durum yalnız posta kutusuna
// gider). Kod içermez. ───
export function accountExistsEmail(args: { loginUrl: string }): Email {
  const heading = "Zaten bir hesabın var"
  const body =
    p("Bu e-posta ile Sepet'te zaten bir hesabın var, o yüzden yeni bir hesap oluşturmadık.") +
    p("Doğrudan giriş yapabilirsin. Şifreni hatırlamıyorsan giriş ekranından sıfırlayabilirsin.") +
    button(args.loginUrl, "Giriş yap")
  const text = textBlock([
    "Zaten bir hesabın var",
    "",
    "Bu e-posta ile Sepet'te zaten bir hesabın var, yeni bir hesap oluşturmadık.",
    `Giriş yap: ${args.loginUrl}`,
    "Şifreni hatırlamıyorsan giriş ekranından sıfırlayabilirsin.",
  ])
  return {
    subject: "Sepet hesabın zaten var",
    html: layout({ heading, body, preview: "Bu e-posta ile zaten bir hesabın var." }),
    text,
  }
}

// ─── Bilgi: sosyal giriş kullanan (şifresiz) hesap için şifre sıfırlama istendi. ───
// providerLabel null olabilir: sağlayıcı satırı okunamazsa metin sağlayıcı adı
// vermeden kurulur ("sosyal hesabınla"), yanlış sağlayıcı adı yazmaktan iyidir.
export function socialSignInEmail(args: {
  loginUrl: string
  providerLabel: string | null
}): Email {
  const label = args.providerLabel
  const heading = label
    ? `${label} ile giriş yapıyorsun`
    : "Sosyal hesabınla giriş yapıyorsun"
  const lead = label
    ? `Bu hesaba ${label} ile giriş yapıyorsun, ayrı bir şifren yok. Giriş ekranından ${label} ile devam edebilirsin.`
    : "Bu hesaba sosyal hesabınla giriş yapıyorsun, ayrı bir şifren yok. Giriş ekranından aynı yöntemle devam edebilirsin."
  const body =
    p(lead) +
    p("İstersen ayarlardan hesabına bir şifre de belirleyebilirsin.") +
    button(args.loginUrl, "Giriş yap")
  const text = textBlock([
    heading,
    "",
    lead,
    `Giriş yap: ${args.loginUrl}`,
    "İstersen ayarlardan hesabına bir şifre de belirleyebilirsin.",
  ])
  return {
    subject: "Sepet giriş yardımı",
    html: layout({ heading, body, preview: lead }),
    text,
  }
}
