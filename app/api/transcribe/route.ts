import { NextResponse } from "next/server"
import { APICallError, generateText } from "ai"
import { z } from "zod"

import { auth } from "@/auth"
import { geminiFlashLite } from "@/lib/ai/models"

export const runtime = "nodejs"
export const maxDuration = 30

const MAX_AUDIO_BYTES = 3 * 1024 * 1024 // 3 MB
const ALLOWED_MEDIA_TYPES = new Set([
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/mp4",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mpeg",
])

const transcribeRequestSchema = z.object({
  audioBase64: z
    .string()
    .min(1, "audioBase64 boş olamaz")
    .regex(/^[A-Za-z0-9+/=]+$/, "audioBase64 geçersiz karakter içeriyor"),
  mediaType: z
    .string()
    .refine((v) => ALLOWED_MEDIA_TYPES.has(v), {
      message: "Desteklenmeyen audio mediaType",
    }),
})

const SYSTEM_PROMPT =
  "Sen bir Türkçe ses transkripsiyon asistanısın. Verilen ses kaydını birebir Türkçe metne çevir. SADECE konuşmadaki sözcükleri döndür; açıklama, 'işte transkript:' gibi ön söz, parantez içi notlar YAZMA. Konuşma yoksa boş string döndür."

export async function POST(req: Request) {
  // 1) Auth — oturum zorunlu.
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  // 2) Body parse + validasyon.
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Geçersiz istek gövdesi." },
      { status: 400 },
    )
  }

  const parsed = transcribeRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", message: "Geçersiz istek gövdesi." },
      { status: 400 },
    )
  }

  const { audioBase64, mediaType } = parsed.data

  // 3) Boyut kontrolü.
  let audioBuffer: Buffer
  try {
    audioBuffer = Buffer.from(audioBase64, "base64")
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Ses verisi çözülemedi." },
      { status: 400 },
    )
  }
  if (audioBuffer.byteLength === 0) {
    return NextResponse.json(
      { error: "invalid_body", message: "Ses verisi boş." },
      { status: 400 },
    )
  }
  if (audioBuffer.byteLength > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "too_large", message: "Ses dosyası 3MB'dan büyük olamaz." },
      { status: 413 },
    )
  }

  // 4) LLM çağrısı — Gemini 2.5 Flash Lite ile transcription.
  try {
    const result = await generateText({
      model: geminiFlashLite,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "file",
              mediaType,
              data: audioBuffer,
            },
          ],
        },
      ],
    })

    return NextResponse.json({ text: result.text.trim() })
  } catch (err) {
    if (APICallError.isInstance(err) && (err.statusCode === 503 || err.statusCode === 429)) {
      return NextResponse.json(
        {
          error: "model_busy",
          message: "Servis yoğun, birkaç saniye sonra tekrar deneyin.",
        },
        { status: 503 },
      )
    }
    console.error("[transcribe] failed", err)
    return NextResponse.json(
      { error: "transcribe_failed", message: "Ses yazıya çevrilemedi." },
      { status: 500 },
    )
  }
}
