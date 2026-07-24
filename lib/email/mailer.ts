import type { Transporter } from "nodemailer"

// Sağlayıcı-bağımsız e-posta gönderimi. SMTP env doluysa nodemailer (smtp.gmail.com
// vb.); boşsa dev'de konsola loglar → kod/link SMTP kurmadan test edilebilir.
// Resend/SES'e geçiş yalnız bu dosyayla sınırlı (drop-in). Yalnız server tarafında
// import edilir (server action / route handler); nodemailer serverExternalPackages'te.

type SendMailArgs = {
  to: string
  subject: string
  html: string
  text: string
}

const host = process.env.SMTP_HOST
const port = Number(process.env.SMTP_PORT ?? "465")
const user = process.env.SMTP_USER
const pass = process.env.SMTP_PASS
const from = process.env.EMAIL_FROM ?? "Sepet <no-reply@example.com>"

const smtpConfigured = Boolean(host && user && pass)

// Transport tembel + tek sefer oluşturulur (yalnız SMTP yapılandırıldıysa).
let transporterPromise: Promise<Transporter> | null = null
function getTransporter(): Promise<Transporter> {
  if (!transporterPromise) {
    transporterPromise = import("nodemailer").then((nm) =>
      nm.createTransport({
        host,
        port,
        // 465 = kapalı (implicit TLS), 587 = STARTTLS.
        secure: port === 465,
        auth: { user, pass },
      }),
    )
  }
  return transporterPromise
}

export async function sendMail({
  to,
  subject,
  html,
  text,
}: SendMailArgs): Promise<void> {
  if (!smtpConfigured) {
    if (process.env.NODE_ENV === "production") {
      // Üretimde SMTP yoksa bu bir YAPILANDIRMA HATASIDIR. Kod/link üretim
      // loglarına (drain/observability araçlarına gidebilir) ASLA yazılmaz —
      // sırrı sızdırmadan, operatörün görebileceği şekilde sesli başarısız ol.
      console.error(
        `[mailer] SMTP yapılandırılmamış — "${subject}" e-postası GÖNDERİLEMEDİ ` +
          `(Kime: ${to}). SMTP_* env değişkenlerini ayarla.`,
      )
      return
    }
    // Yalnız dev/test: kod/link geliştiricinin kendi terminaline yazılır (SMTP'siz
    // test için). Üretim log'una hiçbir koşulda düşmez.
    console.info(
      `\n[mailer] SMTP yapılandırılmadı (dev) — e-posta konsola yazıldı:\n` +
        `  Kime: ${to}\n  Konu: ${subject}\n\n${text}\n`,
    )
    return
  }
  try {
    const transporter = await getTransporter()
    await transporter.sendMail({ from, to, subject, html, text })
  } catch (err) {
    // Gönderim hatası akışı bozmamalı: çağıranların çoğu enumeration'ı önlemek
    // için zaten fire-and-forget (void) kullanır ve jenerik yanıt döner.
    console.error("[mailer] gönderim başarısız:", err)
  }
}
