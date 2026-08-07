/**
 * Hafif LLM gözlemlenebilirliği. AI SDK'nın `experimental_telemetry`'si bir OTEL
 * toplayıcı olmadan no-op kaldığı için, burada her çağrının LATENCY + TOKEN
 * kullanımını (= maliyet) yapılandırılmış tek satırda logluyoruz. Üretimde log
 * toplayıcı (Vercel/Datadog) bu satırları parse edip latency/token panelleri
 * çıkarabilir.
 *
 * `[ai]` prefix'i grep/aggregate için sabit tutulur. Abort'lar ayrıca işaretlenir
 * — kullanıcı stream'i iptal ettiğinde çağrının gerçekten erken bittiğini ve boşa
 * token yakılmadığını burada görürüz.
 */

export type LlmUsage = {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}

const IS_DEV = process.env.NODE_ENV !== "production"

/**
 * KULLANICI İÇERİĞİ taşıyan tanılama logu — yalnızca geliştirmede yazılır.
 *
 * Alışveriş listesi, fiş kalemleri, market adı ve harcama tutarı kişisel
 * veridir; üretim log toplayıcısına (Vercel/Datadog) düz metin gitmemeli.
 * Sayaç/oran gibi içeriksiz ölçümler için normal `console.log` kullanılmaya
 * devam eder — onlar üretimde de gerekli.
 */
export function devLog(...args: unknown[]): void {
  if (IS_DEV) console.log(...args)
}

/**
 * İstek iptali (kullanıcı stream'i kesti / sekmeyi kapattı) ya da timeout.
 * Node'da `DOMException` de `Error`'dan türediği için `AbortController.abort()`
 * ile fırlatılan hata bu kontrole takılır.
 *
 * Kota muhasebesinde de kullanılır (bkz. app/api/assistant/chat): iptal edilen
 * bir tur, model çağrısı çoktan yapılmış olduğu için kota iadesi ALMAZ — aksi
 * halde "çağır → hemen iptal et" döngüsü kotayı hiç tüketmeden AI maliyeti
 * üretirdi.
 */
export function isAbortError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === "AbortError" || err.name === "TimeoutError")
  )
}

/**
 * Bir `generateObject`/`generateText` çağrısını sarar; süreyi ölçer ve sonucun
 * `usage` token sayımıyla birlikte loglar. Çağrının dönüş tipini koruduğu için
 * çağıran taraf `{ object, reasoning, usage }`'a normal şekilde erişir.
 */
export async function withLlmCall<T extends { usage: LlmUsage }>(
  label: string,
  modelId: string,
  run: () => Promise<T>,
): Promise<T> {
  const start = Date.now()
  try {
    const result = await run()
    const ms = Date.now() - start
    const u = result.usage
    console.log(
      `[ai] ${label} model=${modelId} ms=${ms} status=ok ` +
        `in=${u?.inputTokens ?? "?"} out=${u?.outputTokens ?? "?"} total=${u?.totalTokens ?? "?"}`,
    )
    return result
  } catch (err) {
    const ms = Date.now() - start
    const status = isAbortError(err) ? "aborted" : "error"
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[ai] ${label} model=${modelId} ms=${ms} status=${status} ${message}`)
    throw err
  }
}
